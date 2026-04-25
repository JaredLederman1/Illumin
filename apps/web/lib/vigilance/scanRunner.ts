/**
 * Orchestrates one full vigilance scan for a single user.
 *
 * Flow:
 *   1. Open a Scan row (status='running').
 *   2. Sync Plaid (outside any DB transaction — network-bound, can be slow).
 *   3. Detect currently-flagged gaps via recovery.detectGaps.
 *   4. Upsert Signal rows for each detected gap (transactional batch).
 *   5. Resolve Signal rows that disappeared since the last scan.
 *   6. Update per-gap SignalState stability rows (including non-flagged gaps).
 *   7. Close the Scan row.
 *
 * Two concurrent scans for the same user: accepted as "last writer wins".
 * No distributed lock for v1 — the signals/stability writes are idempotent
 * on (userId, gapId) so duplicate scans produce consistent end state, just
 * with interleaved intermediate writes.
 */

import * as Sentry from '@sentry/nextjs'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { syncPlaidForUser } from '@/lib/plaid/sync'
import { detectGaps, type DetectedGap } from '@/lib/recovery'
import {
  upsertSignal,
  resolveMissingSignals,
  computeSeverity,
} from '@/lib/vigilance/signalLifecycle'
import {
  emitNotificationsForScan,
  type SignalTransition,
} from '@/lib/vigilance/notifications'
import { sendNotificationEmail } from '@/lib/email/notifications'
import { updateStabilityState } from '@/lib/vigilance/stabilityTracker'
import { crossCheckBenefits, type ExtractedBenefits } from '@/lib/benefitsAnalysis'
import type { ScanStatus, ScanTrigger } from '@/lib/types/vigilance'

/**
 * Produce a safe, size-bounded string representation of an unknown error
 * for persistence and Sentry context. Connection-string-like substrings
 * (postgres://user:pass@host, http://x:y@host) are redacted defensively.
 */
export function serializeError(err: unknown): string {
  const name = err instanceof Error ? err.name : 'Error'
  const rawMessage = err instanceof Error ? err.message : String(err)
  const redacted = rawMessage
    .replace(/(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/\S+/gi, '[redacted-conn]')
    .replace(/([A-Za-z0-9._%+-]+):[^@\s/]+@([A-Za-z0-9._-]+)/g, '$1:[redacted]@$2')
  const serialized = `${name}: ${redacted}`
  return serialized.length > 500 ? serialized.slice(0, 500) : serialized
}

export interface ScanResult {
  scanId: string
  status: Extract<ScanStatus, 'completed' | 'partial'>
  signalsChecked: number
  signalsNew: number
  signalsUpdated: number
  signalsResolved: number
  durationMs: number
}

const STATIC_MONITORED_GAP_IDS: readonly string[] = [
  'idle_cash:default',
  'hysa:default',
  'debt:high_apr',
  'match:401k',
]

function taxAdvantagedGapIds(now: Date): string[] {
  const year = now.getFullYear()
  return [
    `tax_advantaged:ira:${year}`,
    `tax_advantaged:hsa:${year}`,
  ]
}

/**
 * Build the master list of gapIds the stability tracker should evaluate.
 * Static entries + the year-scoped tax-advantaged ones + dynamic benefits:*
 * pulled from EmploymentBenefits.rawExtraction.
 */
async function buildMonitoredGapIds(userId: string, now: Date): Promise<string[]> {
  const benefits = await prisma.employmentBenefits.findUnique({ where: { userId } })
  const benefitIds: string[] = []
  if (benefits) {
    const extracted = (benefits.rawExtraction ?? null) as ExtractedBenefits | null
    if (extracted) {
      for (const item of crossCheckBenefits(extracted)) {
        if (!item.annualValue || item.annualValue <= 0) continue
        benefitIds.push(`benefits:${item.label}`)
      }
    }
  }
  return [
    ...STATIC_MONITORED_GAP_IDS,
    ...taxAdvantagedGapIds(now),
    ...benefitIds,
  ]
}

export async function runScanForUser(
  userId: string,
  trigger: ScanTrigger,
): Promise<ScanResult> {
  const startedAt = new Date()
  let scan: { id: string } | undefined

  Sentry.addBreadcrumb({
    category: 'scan',
    message: 'scan_started',
    level: 'info',
    data: { userId, trigger },
  })

  try {
    scan = await prisma.scan.create({
      data: {
        userId,
        trigger,
        status: 'running',
        startedAt,
      },
    })

    // Step 2 — Plaid sync runs outside any DB transaction because it is
    // network-bound and can take seconds. Per-account errors are surfaced in
    // the result; we only degrade to status='partial' at the end.
    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'plaid_sync_started',
      level: 'info',
      data: { userId, scanId: scan.id },
    })
    let hadSyncErrors = false
    let accountsTouched = 0
    let accountsFailed = 0
    try {
      const syncResult = await syncPlaidForUser(userId)
      accountsTouched = syncResult.accountsTouched
      accountsFailed = syncResult.accountErrors.length
      if (syncResult.accountErrors.length > 0) hadSyncErrors = true
    } catch (err) {
      console.error('[scanRunner] Plaid sync threw; continuing with stale data', err)
      hadSyncErrors = true
    }
    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'plaid_sync_completed',
      level: hadSyncErrors ? 'warning' : 'info',
      data: {
        userId,
        scanId: scan.id,
        accountsSucceeded: Math.max(0, accountsTouched - accountsFailed),
        accountsFailed,
        hadSyncErrors,
      },
    })

    // Step 3 — detect currently flagged gaps from post-sync data.
    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'gap_detection_started',
      level: 'info',
      data: { userId, scanId: scan.id },
    })
    const detected: DetectedGap[] = await detectGaps(userId, prisma)
    const detectedById = new Map(detected.map(g => [g.gapId, g]))
    const detectedIdSet = new Set(detectedById.keys())
    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'gap_detection_completed',
      level: 'info',
      data: {
        userId,
        scanId: scan.id,
        detectedGapsCount: detected.length,
      },
    })

    // Step 4-6 — signal + stability writes in a single transaction for
    // atomicity across the resolve sweep.
    const now = new Date()
    const monitoredGapIds = await buildMonitoredGapIds(userId, now)
    // Union with detected so ad-hoc new gapIds still get a stability row.
    const stabilityGapIds = new Set<string>([...monitoredGapIds, ...detectedIdSet])

    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'signal_persistence_started',
      level: 'info',
      data: {
        userId,
        scanId: scan.id,
        monitoredGapCount: monitoredGapIds.length,
        stabilityGapCount: stabilityGapIds.size,
      },
    })
    const scanIdForTx = scan.id
    const { signalsNew, signalsUpdated, signalsResolved, notificationsEmitted, emittedNotifications } =
      await prisma.$transaction(async tx => {
        let newCount = 0
        let updatedCount = 0
        const snapshotRows: Prisma.SignalSnapshotCreateManyInput[] = []
        const created: SignalTransition[] = []
        const updated: SignalTransition[] = []

        for (const gap of detected) {
          const result = await upsertSignal(tx, userId, gap, scanIdForTx, now)
          if (result.wasNew) newCount++
          else if (result.wasUpdated) updatedCount++
          const transition: SignalTransition = {
            signalId: result.signalId,
            gapId: gap.gapId,
            domain: gap.domain,
            newState: result.state,
            previousState: result.previousState,
            previousAnnualValue: result.previousAnnualValue,
            newAnnualValue: result.newAnnualValue,
          }
          if (result.wasNew) created.push(transition)
          else if (result.wasUpdated) updated.push(transition)
          // Record a snapshot for every detected gap (new, updated, or
          // unchanged) so drift trajectories can be reconstructed exactly.
          // Resolved signals get no snapshot; their lifecycle is captured
          // by the Signal.state transition handled below.
          snapshotRows.push({
            userId,
            gapId: gap.gapId,
            scanId: scanIdForTx,
            domain: gap.domain,
            annualValue: gap.annualValue,
            lifetimeValue: gap.lifetimeValue,
            severity: computeSeverity(gap.annualValue, gap.domain),
            state: result.state,
            payload: gap.payload as Prisma.InputJsonValue,
          })
        }

        if (snapshotRows.length > 0) {
          await tx.signalSnapshot.createMany({ data: snapshotRows })
        }

        const resolvedCount = await resolveMissingSignals(tx, userId, detectedIdSet, now)

        // Emit notifications inside the transaction so signal writes and
        // their notifications either both commit or both roll back. The
        // emitter applies its own clean-slate guard and may return zero
        // emissions even when there are transitions.
        const emissions = await emitNotificationsForScan(tx, {
          userId,
          scanId: scanIdForTx,
          signalsCreated: created,
          signalsUpdated: updated,
        })

        Sentry.addBreadcrumb({
          category: 'scan',
          message: 'signal_persistence_completed',
          level: 'info',
          data: {
            userId,
            scanId: scanIdForTx,
            signalsNew: newCount,
            signalsUpdated: updatedCount,
            signalsResolved: resolvedCount,
          },
        })

        for (const gapId of stabilityGapIds) {
          const gap = detectedById.get(gapId)
          const isFlagged = gap != null
          const currentValue = gap?.annualValue ?? 0
          await updateStabilityState(tx, userId, gapId, currentValue, isFlagged, now)
        }

        Sentry.addBreadcrumb({
          category: 'scan',
          message: 'stability_tracking_completed',
          level: 'info',
          data: {
            userId,
            scanId: scanIdForTx,
            stabilityRowsEvaluated: stabilityGapIds.size,
          },
        })

        return {
          signalsNew: newCount,
          signalsUpdated: updatedCount,
          signalsResolved: resolvedCount,
          notificationsEmitted: emissions.length,
          emittedNotifications: emissions,
        }
      },
    )

    // Instant-mode email dispatch. Runs AFTER the transaction commits so
    // email send latency never holds a pg connection and a Resend failure
    // cannot roll back the scan's Signal/Notification writes. Any throw here
    // is captured and swallowed so the scan still completes cleanly.
    if (emittedNotifications.length > 0) {
      try {
        const prefs = await prisma.user.findUnique({
          where: { id: userId },
          select: { notificationEmailMode: true },
        })
        if (prefs?.notificationEmailMode === 'instant') {
          const ids = emittedNotifications.map(e => e.signalId) // used only for diagnostics
          Sentry.addBreadcrumb({
            category: 'scan',
            message: 'instant_email_dispatching',
            level: 'info',
            data: { userId, scanId: scanIdForTx, count: emittedNotifications.length, signalIds: ids.slice(0, 10) },
          })
          const persisted = await prisma.notification.findMany({
            where: {
              userId,
              signalId: { in: emittedNotifications.map(e => e.signalId) },
              dismissedAt: null,
            },
            select: {
              id: true,
              kind: true,
              domain: true,
              title: true,
              dollarImpact: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
          if (persisted.length > 0) {
            const result = await sendNotificationEmail({
              userId,
              notifications: persisted.map(p => ({
                id: p.id,
                kind: p.kind as 'new' | 'reopened' | 'worsened',
                domain: p.domain,
                title: p.title,
                dollarImpact: p.dollarImpact,
                createdAt: p.createdAt,
              })),
            })
            Sentry.addBreadcrumb({
              category: 'scan',
              message: 'instant_email_result',
              level: result.sent ? 'info' : 'warning',
              data: { userId, sent: result.sent, reason: result.reason },
            })
          }
        }
      } catch (emailErr) {
        Sentry.captureException(emailErr, {
          tags: { component: 'scan_runner_instant_email', userId },
        })
        console.error('[scanRunner] instant email dispatch failed', emailErr)
      }
    }

    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'notifications_emitted',
      level: 'info',
      data: {
        userId,
        scanId: scan.id,
        notificationsEmitted,
      },
    })

    const completedAt = new Date()
    const status: Extract<ScanStatus, 'completed' | 'partial'> = hadSyncErrors
      ? 'partial'
      : 'completed'

    // signalsChecked = every gapId evaluated this scan (monitored union detected).
    const signalsChecked = stabilityGapIds.size
    const signalsFlagged = detected.length

    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status,
        completedAt,
        signalsChecked,
        signalsFlagged,
        signalsResolved,
      },
    })

    Sentry.addBreadcrumb({
      category: 'scan',
      message: 'scan_completed',
      level: 'info',
      data: {
        userId,
        scanId: scan.id,
        status,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
    })

    return {
      scanId: scan.id,
      status,
      signalsChecked,
      signalsNew,
      signalsUpdated,
      signalsResolved,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: {
        component: 'scan_runner',
        userId,
        trigger,
      },
      extra: {
        scanId: scan?.id ?? null,
      },
    })
    if (scan) {
      try {
        await prisma.scan.update({
          where: { id: scan.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: serializeError(err),
          },
        })
      } catch (updateErr) {
        console.error('[scanRunner] Failed to mark scan as failed', updateErr)
      }
    }
    throw err
  }
}

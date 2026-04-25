/**
 * Notification emission for the vigilance scan flow.
 *
 * Called by the scan runner after Signal writes commit, this module decides
 * which transitions warrant a Notification row and writes them. The scan
 * runner places the call inside the same Prisma transaction as the Signal
 * writes so either both succeed or neither does.
 *
 * Clean-slate guarantee: a user with zero existing Notification rows gets
 * nothing emitted on their next scan, regardless of how many active Signals
 * they currently have. From the second scan onward (i.e. once at least one
 * Notification row exists), normal emission rules apply. This avoids a
 * launch-day flood of notifications for backlogs that pre-date the feature.
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import type { SignalState } from '@/lib/types/vigilance'

type PrismaExecutor = PrismaClient | Prisma.TransactionClient

export type NotificationKind = 'new' | 'reopened' | 'worsened'

/**
 * Per-gap transition record assembled by the scan runner from the
 * upsertSignal result. One entry per detected gap that was either created or
 * updated this scan. Resolved signals are not represented here; resolution
 * notifications are reserved for a future phase.
 */
export interface SignalTransition {
  signalId: string
  gapId: string
  domain: string
  newState: SignalState
  // null when the signal was created in this scan.
  previousState: SignalState | null
  previousAnnualValue: number | null
  newAnnualValue: number
}

export interface EmitArgs {
  userId: string
  scanId: string
  signalsCreated: SignalTransition[]
  signalsUpdated: SignalTransition[]
}

export interface NotificationEmission {
  signalId: string
  gapId: string
  domain: string
  kind: NotificationKind
  title: string
  dollarImpact: number | null
}

/**
 * Worsening threshold: emit "worsened" only when the annual dollar impact
 * grew by more than max($500, 20% of prior magnitude). The fixed floor
 * suppresses noisy multi-percent fluctuations on small gaps; the percentage
 * scales the bar for larger ones so a $50/year drift on a $20k gap stays
 * quiet but a $5k jump does not.
 */
const WORSENED_FLOOR_DOLLARS = 500
const WORSENED_RELATIVE_RATIO = 0.2

const TITLE_BY_DOMAIN_KIND: Record<string, Record<NotificationKind, string>> = {
  idle_cash: {
    new: 'Idle cash gap detected',
    reopened: 'Idle cash gap returned',
    worsened: 'Idle cash gap widened',
  },
  hysa: {
    new: 'HYSA rate gap detected',
    reopened: 'HYSA rate gap returned',
    worsened: 'HYSA rate gap widened',
  },
  debt: {
    new: 'Debt gap detected',
    reopened: 'Debt gap returned',
    worsened: 'Debt gap widened',
  },
  match: {
    new: 'Employer match gap detected',
    reopened: 'Employer match gap returned',
    worsened: 'Employer match gap widened',
  },
  benefits: {
    new: 'Benefit gap detected',
    reopened: 'Benefit gap returned',
    worsened: 'Benefit gap widened',
  },
  tax_advantaged: {
    new: 'Tax-advantaged space gap detected',
    reopened: 'Tax-advantaged space gap returned',
    worsened: 'Tax-advantaged space gap widened',
  },
  subscription: {
    new: 'Subscription gap detected',
    reopened: 'Subscription gap returned',
    worsened: 'Subscription gap widened',
  },
  category_overspend: {
    new: 'Category overspend detected',
    reopened: 'Category overspend returned',
    worsened: 'Category overspend widened',
  },
  recurring_change: {
    new: 'Recurring charge change detected',
    reopened: 'Recurring charge change returned',
    worsened: 'Recurring charge change widened',
  },
}

function titleFor(domain: string, kind: NotificationKind): string {
  const byKind = TITLE_BY_DOMAIN_KIND[domain]
  if (byKind) return byKind[kind]
  // Fallback for any domain not yet in the table. Keeps emission resilient
  // if a new SignalDomain is added without a matching title entry.
  switch (kind) {
    case 'new':
      return 'Gap detected'
    case 'reopened':
      return 'Gap returned'
    case 'worsened':
      return 'Gap widened'
  }
}

function isWorsened(prev: number, next: number): boolean {
  const delta = next - prev
  if (delta <= 0) return false
  const relativeBar = Math.abs(prev) * WORSENED_RELATIVE_RATIO
  const bar = Math.max(WORSENED_FLOOR_DOLLARS, relativeBar)
  return delta > bar
}

/**
 * Decide whether a transition should emit a Notification and, if so, which
 * kind. Returns null when the transition is a no-op (e.g. same magnitude on
 * an already-active signal).
 */
function classify(t: SignalTransition): NotificationKind | null {
  if (t.previousState === null) return 'new'
  if (
    (t.previousState === 'resolved' || t.previousState === 'stale') &&
    t.newState === 'new'
  ) {
    return 'reopened'
  }
  if (
    t.previousAnnualValue !== null &&
    isWorsened(t.previousAnnualValue, t.newAnnualValue)
  ) {
    return 'worsened'
  }
  return null
}

export async function emitNotificationsForScan(
  client: PrismaExecutor,
  args: EmitArgs,
): Promise<NotificationEmission[]> {
  // Clean-slate guard: if this user has never received a Notification, treat
  // every currently active signal as "already known" and emit nothing this
  // scan. The next scan that produces a transition will be the first one
  // that actually writes a row.
  const existingCount = await client.notification.count({
    where: { userId: args.userId },
  })
  if (existingCount === 0) return []

  const transitions: SignalTransition[] = [
    ...args.signalsCreated,
    ...args.signalsUpdated,
  ]

  const emissions: NotificationEmission[] = []
  for (const t of transitions) {
    const kind = classify(t)
    if (kind === null) continue
    emissions.push({
      signalId: t.signalId,
      gapId: t.gapId,
      domain: t.domain,
      kind,
      title: titleFor(t.domain, kind),
      dollarImpact: t.newAnnualValue,
    })
  }

  if (emissions.length === 0) return []

  await client.notification.createMany({
    data: emissions.map(e => ({
      userId: args.userId,
      signalId: e.signalId,
      kind: e.kind,
      domain: e.domain,
      dollarImpact: e.dollarImpact,
      title: e.title,
    })),
  })

  return emissions
}

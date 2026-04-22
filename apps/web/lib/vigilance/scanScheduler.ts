/**
 * Scheduler logic for the vigilance cron. Determines which users are due for
 * a scan and runs them with a bounded concurrency + per-user timeout.
 *
 * `runScanForUser` is invoked in-process (no HTTP hop to /api/internal/scan)
 * because both the cron handler and the scheduler share the same Next.js
 * server runtime; skipping the round-trip is faster and avoids re-auth.
 */

import type { PrismaClient } from '@prisma/client'
import { runScanForUser } from '@/lib/vigilance/scanRunner'

export async function getUsersDueForScan(
  prisma: PrismaClient,
  options: { maxAgeHours: number },
): Promise<string[]> {
  const cutoff = new Date(Date.now() - options.maxAgeHours * 60 * 60 * 1000)

  const candidates = await prisma.user.findMany({
    where: {
      accounts: {
        some: { plaidAccessToken: { not: null } },
      },
    },
    select: {
      id: true,
      scans: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { completedAt: true },
      },
    },
  })

  const due: string[] = []
  for (const user of candidates) {
    const latest = user.scans[0]
    if (!latest) {
      due.push(user.id)
      continue
    }
    if (latest.completedAt === null || latest.completedAt < cutoff) {
      due.push(user.id)
    }
  }
  return due
}

export interface ScheduledScansResult {
  succeeded: number
  failed: number
  errors: Array<{ userId: string; error: string }>
}

const MAX_ERRORS_STORED = 50
const MAX_ERROR_LENGTH = 500

export async function runScheduledScans(
  userIds: string[],
  options: { concurrency: number; perUserTimeoutMs: number },
): Promise<ScheduledScansResult> {
  const result: ScheduledScansResult = {
    succeeded: 0,
    failed: 0,
    errors: [],
  }

  if (userIds.length === 0) return result

  const queue = userIds.slice()
  const concurrency = Math.max(1, Math.min(options.concurrency, userIds.length))

  async function runOne(userId: string): Promise<void> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () =>
          reject(
            new Error(`Scan timed out after ${options.perUserTimeoutMs}ms`),
          ),
        options.perUserTimeoutMs,
      )
    })
    try {
      await Promise.race([runScanForUser(userId, 'scheduled'), timeoutPromise])
      result.succeeded++
    } catch (err) {
      result.failed++
      if (result.errors.length < MAX_ERRORS_STORED) {
        const msg = err instanceof Error ? err.message : String(err)
        result.errors.push({
          userId,
          error: msg.slice(0, MAX_ERROR_LENGTH),
        })
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift()
      if (!next) break
      await runOne(next)
    }
  }

  const workers: Promise<void>[] = []
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker())
  }
  await Promise.all(workers)

  return result
}

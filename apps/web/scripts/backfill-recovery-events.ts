/**
 * One-time backfill: credit existing users with RecoveryEvent rows for any
 * gap that is already closed at migration time. Without this pass, every
 * existing user starts with recovered = 0 even though they may have been
 * above buffer, contributing to retirement, or marked benefits items done.
 *
 * Run with:
 *   cd apps/web
 *   npx tsx scripts/backfill-recovery-events.ts
 *
 * Add --dry-run to print what would be written without inserting rows.
 *
 * Idempotent: the @@unique([userId, gapId]) constraint plus skipDuplicates
 * means re-running is safe.
 */

import { prisma } from '@/lib/prisma'
import { evaluateGaps, persistNewRecoveries } from '@/lib/recovery'

const HYSA_RATE = 0.045
const CHECKING_RATE = 0.0001

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const users = await prisma.user.findMany({ select: { id: true, email: true } })

  console.log(`[backfill] scanning ${users.length} users (dryRun=${dryRun})`)

  const sinceDate = new Date()
  sinceDate.setMonth(sinceDate.getMonth() - 3)

  let totalRecovered = 0

  for (const user of users) {
    const [accounts, transactions, holdings, benefits, profile, existingEvents] =
      await Promise.all([
        prisma.account.findMany({ where: { userId: user.id } }),
        prisma.transaction.findMany({
          where: { account: { userId: user.id }, date: { gte: sinceDate } },
        }),
        prisma.holding.findMany({
          where: { account: { userId: user.id } },
          include: { account: { select: { accountType: true } } },
        }),
        prisma.employmentBenefits.findUnique({ where: { userId: user.id } }),
        prisma.onboardingProfile.findUnique({ where: { userId: user.id } }),
        prisma.recoveryEvent.findMany({ where: { userId: user.id } }),
      ])

    const gaps = evaluateGaps(
      {
        accounts,
        transactions,
        holdings,
        benefits,
        profile,
        existingEvents: existingEvents.map(e => ({
          gapId: e.gapId,
          annualValue: e.annualValue,
          recoveredAt: e.recoveredAt,
        })),
      },
      { hysaRate: HYSA_RATE, checkingRate: CHECKING_RATE },
    )

    const existingGapIds = new Set(existingEvents.map(e => e.gapId))
    const candidates = gaps.filter(g => g.status === 'recovered' && !existingGapIds.has(g.id))

    if (candidates.length === 0) {
      console.log(`[backfill] ${user.email}: nothing to credit`)
      continue
    }

    console.log(
      `[backfill] ${user.email}: crediting ${candidates.length} gap(s)`,
      candidates.map(g => `${g.id}=${g.annualValue}`).join(', '),
    )

    if (!dryRun) {
      const written = await persistNewRecoveries(prisma, user.id, gaps, existingGapIds)
      totalRecovered += written.length
    } else {
      totalRecovered += candidates.length
    }
  }

  console.log(`[backfill] done. ${dryRun ? 'would credit' : 'credited'} ${totalRecovered} event(s) total.`)
}

main()
  .catch(err => {
    console.error('[backfill] fatal', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

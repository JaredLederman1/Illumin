import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  evaluateGaps,
  persistNewRecoveries,
  summarize,
} from '@/lib/recovery'

const HYSA_RATE = 0.045
const CHECKING_RATE = 0.0001

export async function GET() {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  try {
    const sinceDate = new Date()
    sinceDate.setMonth(sinceDate.getMonth() - 3)

    const [accounts, transactions, holdings, benefits, profile, existingEvents] =
      await Promise.all([
        prisma.account.findMany({ where: { userId: dbUser.id } }),
        prisma.transaction.findMany({
          where: { account: { userId: dbUser.id }, date: { gte: sinceDate } },
        }),
        prisma.holding.findMany({
          where: { account: { userId: dbUser.id } },
          include: { account: { select: { accountType: true } } },
        }),
        prisma.employmentBenefits.findUnique({ where: { userId: dbUser.id } }),
        prisma.onboardingProfile.findUnique({ where: { userId: dbUser.id } }),
        prisma.recoveryEvent.findMany({ where: { userId: dbUser.id } }),
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
    const newlyPersisted = await persistNewRecoveries(prisma, dbUser.id, gaps, existingGapIds)

    if (newlyPersisted.length > 0) {
      const justRecorded = new Map(newlyPersisted.map(g => [g.id, g.recoveredAt!]))
      for (const g of gaps) {
        if (justRecorded.has(g.id)) g.recoveredAt = justRecorded.get(g.id)
      }
    }

    return NextResponse.json(summarize(gaps))
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'user:recovery' } })
    console.error('[user/recovery]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

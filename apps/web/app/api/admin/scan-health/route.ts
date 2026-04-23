/**
 * Admin diagnostic: snapshot of scan pipeline health.
 *
 * Gated by Supabase session + ADMIN_EMAILS allowlist. Returns 401 for
 * unauthenticated callers or authenticated callers not on the allowlist.
 * Intended for quick manual checks without opening Sentry.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminAllowlist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STALE_HOURS = 12
const RECENT_FAILURE_LIMIT = 20
const STALE_USER_LIMIT = 20

export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminEmail(authResult.user.dbUser.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const since24h = new Date(now - 24 * 60 * 60 * 1000)
  const staleCutoff = new Date(now - STALE_HOURS * 60 * 60 * 1000)

  const [
    totalUsers,
    scansLast24h,
    successfulScansLast24h,
    failedScansLast24h,
    usersWithPlaid,
    recentFailuresRaw,
  ] = await Promise.all([
    prisma.user.count({
      where: { accounts: { some: { plaidAccessToken: { not: null } } } },
    }),
    prisma.scan.count({ where: { startedAt: { gte: since24h } } }),
    prisma.scan.count({
      where: {
        startedAt: { gte: since24h },
        status: { in: ['completed', 'partial'] },
      },
    }),
    prisma.scan.count({
      where: { startedAt: { gte: since24h }, status: 'failed' },
    }),
    prisma.user.findMany({
      where: { accounts: { some: { plaidAccessToken: { not: null } } } },
      select: {
        id: true,
        scans: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { startedAt: true, completedAt: true },
        },
      },
    }),
    prisma.scan.findMany({
      where: { status: 'failed' },
      orderBy: { startedAt: 'desc' },
      take: RECENT_FAILURE_LIMIT,
      select: {
        id: true,
        userId: true,
        startedAt: true,
        errorMessage: true,
        trigger: true,
      },
    }),
  ])

  let usersNeverScanned = 0
  const staleCandidates: Array<{
    userId: string
    lastScanAt: Date | null
    hoursStale: number
  }> = []

  for (const user of usersWithPlaid) {
    const latest = user.scans[0]
    if (!latest) {
      usersNeverScanned++
      staleCandidates.push({
        userId: user.id,
        lastScanAt: null,
        hoursStale: Number.POSITIVE_INFINITY,
      })
      continue
    }
    const referenceAt = latest.completedAt ?? latest.startedAt
    if (referenceAt < staleCutoff) {
      const hoursStale = (now - referenceAt.getTime()) / (60 * 60 * 1000)
      staleCandidates.push({
        userId: user.id,
        lastScanAt: referenceAt,
        hoursStale,
      })
    }
  }

  const usersWithStaleScans = staleCandidates.length

  const staleUsers = staleCandidates
    .sort((a, b) => b.hoursStale - a.hoursStale)
    .slice(0, STALE_USER_LIMIT)
    .map(entry => ({
      userId: entry.userId,
      lastScanAt: entry.lastScanAt ? entry.lastScanAt.toISOString() : null,
      hoursStale: Number.isFinite(entry.hoursStale)
        ? Math.round(entry.hoursStale * 10) / 10
        : -1,
    }))

  const recentFailures = recentFailuresRaw.map(f => ({
    scanId: f.id,
    userId: f.userId,
    startedAt: f.startedAt.toISOString(),
    errorMessage: f.errorMessage,
    trigger: f.trigger,
  }))

  return NextResponse.json({
    summary: {
      totalUsers,
      scansLast24h,
      successfulScansLast24h,
      failedScansLast24h,
      usersNeverScanned,
      usersWithStaleScans,
    },
    recentFailures,
    staleUsers,
  })
}

/**
 * GET /api/cron/email-digest — daily digest dispatcher.
 *
 * Fires at 14:00 UTC via Vercel Cron (about 9-10am US East), after the 11:30
 * UTC scan has had time to finish. Selects users on digest_daily or
 * digest_weekly who have at least one Notification created since their last
 * email send (or since 24h ago if they have never been sent to). For weekly
 * users, only sends on Sundays (UTC).
 *
 * Sequential send for v1. Each user is wrapped in try/catch so a single
 * failure cannot stop the batch. Summary returned for observability.
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/email/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Weekly digest policy: v1 fires on Sunday in UTC. Picked once app-wide rather
 * than per-user so every weekly recipient gets the same cadence without us
 * needing to persist a weekday preference. Revisit once per-user timezones are
 * tracked.
 */
function isWeeklyDigestDay(now: Date): boolean {
  return now.getUTCDay() === 0
}

export async function GET(request: Request) {
  Sentry.setTag('cron', 'email-digest')

  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const expectedHeader = secret ? `Bearer ${secret}` : null
  if (
    !expectedHeader ||
    !authHeader ||
    !timingSafeEqual(authHeader, expectedHeader)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weeklyDay = isWeeklyDigestDay(now)

  const eligibleModes = weeklyDay
    ? ['digest_daily', 'digest_weekly']
    : ['digest_daily']

  let processed = 0
  let sent = 0
  let skipped = 0

  try {
    const users = await prisma.user.findMany({
      where: {
        notificationEmailMode: { in: eligibleModes },
        notifications: {
          some: { dismissedAt: null },
        },
      },
      select: {
        id: true,
        notificationEmailMode: true,
        notificationEmailLastSentAt: true,
      },
    })

    for (const user of users) {
      processed++
      try {
        const since = user.notificationEmailLastSentAt ?? twentyFourHoursAgo

        const notifications = await prisma.notification.findMany({
          where: {
            userId: user.id,
            dismissedAt: null,
            createdAt: { gt: since },
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            kind: true,
            domain: true,
            title: true,
            dollarImpact: true,
            createdAt: true,
          },
        })

        if (notifications.length === 0) {
          skipped++
          continue
        }

        const result = await sendNotificationEmail({
          userId: user.id,
          notifications: notifications.map(n => ({
            id: n.id,
            kind: n.kind as 'new' | 'reopened' | 'worsened',
            domain: n.domain,
            title: n.title,
            dollarImpact: n.dollarImpact,
            createdAt: n.createdAt,
          })),
        })

        if (result.sent) {
          sent++
        } else {
          skipped++
          Sentry.addBreadcrumb({
            category: 'cron',
            message: 'email_digest_skip',
            level: 'info',
            data: { userId: user.id, reason: result.reason },
          })
        }
      } catch (userErr) {
        skipped++
        Sentry.captureException(userErr, {
          tags: { component: 'cron_email_digest', userId: user.id },
        })
        console.error('[cron/email-digest] user failed', user.id, userErr)
      }
    }

    const durationMs = Date.now() - start
    Sentry.addBreadcrumb({
      category: 'cron',
      message: 'email_digest_summary',
      level: 'info',
      data: { processed, sent, skipped, weeklyDay, durationMs },
    })

    return NextResponse.json({ processed, sent, skipped, durationMs })
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'cron_email_digest' },
    })
    console.error('[cron/email-digest] handler failed', err)
    return NextResponse.json(
      { error: 'Digest batch failed', processed, sent, skipped },
      { status: 500 },
    )
  }
}

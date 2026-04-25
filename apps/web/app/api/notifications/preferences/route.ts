/**
 * GET/POST /api/notifications/preferences — read or update the authenticated
 * user's notification email settings.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_MODES = ['off', 'instant', 'digest_daily', 'digest_weekly'] as const
type Mode = (typeof VALID_MODES)[number]

function isValidMode(mode: unknown): mode is Mode {
  return typeof mode === 'string' && (VALID_MODES as readonly string[]).includes(mode)
}

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const user = await prisma.user.findUnique({
    where: { id: auth.user.dbUser.id },
    select: {
      notificationEmailMode: true,
      notificationEmailLastSentAt: true,
    },
  })

  return NextResponse.json({
    mode: (user?.notificationEmailMode ?? 'digest_daily') as Mode,
    lastSentAt: user?.notificationEmailLastSentAt
      ? user.notificationEmailLastSentAt.toISOString()
      : null,
  })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mode = (body as { mode?: unknown })?.mode
  if (!isValidMode(mode)) {
    return NextResponse.json(
      { error: `mode must be one of: ${VALID_MODES.join(', ')}` },
      { status: 400 },
    )
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.dbUser.id },
    data: { notificationEmailMode: mode },
    select: {
      notificationEmailMode: true,
      notificationEmailLastSentAt: true,
    },
  })

  return NextResponse.json({
    mode: updated.notificationEmailMode as Mode,
    lastSentAt: updated.notificationEmailLastSentAt
      ? updated.notificationEmailLastSentAt.toISOString()
      : null,
  })
}

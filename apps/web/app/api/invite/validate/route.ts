import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type InvalidReason = 'not_found' | 'expired' | 'exhausted' | 'disabled'

function invalid(reason: InvalidReason) {
  return NextResponse.json({ valid: false, reason }, { status: 200 })
}

export async function POST(request: NextRequest) {
  let body: { code?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = typeof body.code === 'string' ? body.code.trim() : ''
  if (!raw) return invalid('not_found')

  const normalized = raw.toUpperCase()

  const row = await prisma.inviteCode.findUnique({ where: { code: normalized } })
  if (!row) return invalid('not_found')
  if (row.disabledAt) return invalid('disabled')
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return invalid('expired')
  if (row.usedCount >= row.maxUses) return invalid('exhausted')

  return NextResponse.json({ valid: true }, { status: 200 })
}

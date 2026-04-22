import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

type RedeemError =
  | 'not_found'
  | 'expired'
  | 'exhausted'
  | 'disabled'
  | 'already_redeemed'

function fail(reason: RedeemError, status: number = 400) {
  return NextResponse.json({ ok: false, reason }, { status })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return authResult.error
  const { user: { dbUser } } = authResult

  let body: { code?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = typeof body.code === 'string' ? body.code.trim() : ''
  if (!raw) return fail('not_found')
  const normalized = raw.toUpperCase()

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.inviteCode.findUnique({ where: { code: normalized } })
      if (!row) throw new RedemptionError('not_found')
      if (row.disabledAt) throw new RedemptionError('disabled')
      if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
        throw new RedemptionError('expired')
      }
      if (row.usedCount >= row.maxUses) throw new RedemptionError('exhausted')

      try {
        await tx.inviteCodeRedemption.create({
          data: { inviteCodeId: row.id, userId: dbUser.id },
        })
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new RedemptionError('already_redeemed')
        }
        throw err
      }

      await tx.inviteCode.update({
        where: { id: row.id },
        data: { usedCount: { increment: 1 } },
      })
    })
  } catch (err) {
    if (err instanceof RedemptionError) {
      return fail(err.reason, err.reason === 'already_redeemed' ? 409 : 400)
    }
    console.error('[invite/redeem]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

class RedemptionError extends Error {
  constructor(public readonly reason: RedeemError) {
    super(reason)
  }
}

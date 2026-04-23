import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhook } from '@/lib/plaid/webhookVerification'
import {
  handleItemError,
  handleItemPendingExpiration,
  handleTransactionsUpdate,
  handleUserPermissionRevoked,
} from '@/lib/plaid/webhookHandlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface WebhookBody {
  webhook_type?: string
  webhook_code?: string
  item_id?: string
  environment?: string
  consent_expiration_time?: string
  error?: {
    error_code?: string
    error_message?: string
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const jwt = request.headers.get('plaid-verification')

  if (!jwt) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
  }

  const isValid = await verifyWebhook(rawBody, jwt)
  if (!isValid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  let body: WebhookBody
  try {
    body = JSON.parse(rawBody) as WebhookBody
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const itemId = body.item_id
  const eventKey = `${body.webhook_type}:${body.webhook_code}`

  if (!itemId) {
    console.warn('[plaid:webhook] missing item_id', { eventKey })
    return NextResponse.json({ acknowledged: true })
  }

  try {
    switch (eventKey) {
      case 'TRANSACTIONS:SYNC_UPDATES_AVAILABLE':
      case 'TRANSACTIONS:DEFAULT_UPDATE':
      case 'TRANSACTIONS:INITIAL_UPDATE':
      case 'TRANSACTIONS:HISTORICAL_UPDATE':
        await handleTransactionsUpdate(itemId, prisma)
        break
      case 'ITEM:ERROR':
        await handleItemError(
          itemId,
          body.error?.error_code ?? 'UNKNOWN',
          body.error?.error_message ?? '',
          prisma,
        )
        break
      case 'ITEM:PENDING_EXPIRATION':
        await handleItemPendingExpiration(
          itemId,
          body.consent_expiration_time ?? '',
          prisma,
        )
        break
      case 'ITEM:USER_PERMISSION_REVOKED':
        await handleUserPermissionRevoked(itemId, prisma)
        break
      default:
        console.log('[plaid:webhook] unhandled event', { eventKey, itemId })
    }
  } catch (err) {
    // Signature was verified; internal errors should not cause Plaid retries.
    console.error('[plaid:webhook] handler error', { eventKey, itemId, err })
  }

  return NextResponse.json({ acknowledged: true })
}

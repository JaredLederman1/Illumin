/**
 * Per-event-type handlers for Plaid webhooks. The route dispatcher lives
 * in app/api/plaid/webhook/route.ts and is responsible for signature
 * verification before any handler runs.
 *
 * Edge case re: webhook delivery for pre-registration Items: Items that
 * were linked before PLAID_WEBHOOK_URL was set in the Plaid dashboard
 * will not receive webhooks until they are either re-linked or patched
 * via Plaid's /item/webhook/update endpoint. That reconciliation is a
 * one-time admin task, not wired up here.
 */

import type { PrismaClient } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'
import { syncPlaidForUser } from '@/lib/plaid/sync'
import { runScanForUser } from '@/lib/vigilance/scanRunner'

export interface TransactionsUpdateResult {
  synced: boolean
  scanQueued: boolean
}

export async function handleTransactionsUpdate(
  itemId: string,
  prisma: PrismaClient,
): Promise<TransactionsUpdateResult> {
  const accounts = await prisma.account.findMany({
    where: { plaidItemId: itemId },
    select: { id: true, userId: true },
  })

  if (accounts.length === 0) {
    console.warn('[plaid:webhook] no accounts found for item; ignoring', { itemId })
    return { synced: false, scanQueued: false }
  }

  const userIds = Array.from(new Set(accounts.map(a => a.userId)))
  let synced = false
  let scanQueued = false

  for (const userId of userIds) {
    try {
      await syncPlaidForUser(userId)
      synced = true
    } catch (err) {
      console.error('[plaid:webhook] sync failed', { itemId, userId, err })
      Sentry.captureException(err, { tags: { area: 'plaid:webhook:sync' } })
      continue
    }

    try {
      await runScanForUser(userId, 'post_sync')
      scanQueued = true
    } catch (err) {
      console.error('[plaid:webhook] post-sync scan failed', { itemId, userId, err })
      Sentry.captureException(err, { tags: { area: 'plaid:webhook:scan' } })
    }
  }

  return { synced, scanQueued }
}

export async function handleItemError(
  itemId: string,
  errorCode: string,
  errorMessage: string,
  prisma: PrismaClient,
): Promise<void> {
  const errorString = `${errorCode}:${errorMessage}`.slice(0, 500)

  const result = await prisma.account.updateMany({
    where: { plaidItemId: itemId },
    data: { lastSyncError: errorString },
  })

  if (result.count === 0) {
    console.warn('[plaid:webhook] ITEM:ERROR for unknown item', { itemId, errorCode })
    return
  }

  console.error('[plaid:webhook] item error recorded', {
    itemId,
    errorCode,
    errorMessage,
    affectedAccounts: result.count,
  })

  Sentry.captureMessage('Plaid Item error', {
    level: 'error',
    tags: { area: 'plaid:webhook:item_error' },
    extra: { itemId, errorCode, errorMessage },
  })
}

export async function handleItemPendingExpiration(
  itemId: string,
  expirationTime: string,
  prisma: PrismaClient,
): Promise<void> {
  const accountCount = await prisma.account.count({ where: { plaidItemId: itemId } })

  console.warn('[plaid:webhook] item pending expiration', {
    itemId,
    expirationTime,
    affectedAccounts: accountCount,
  })

  Sentry.captureMessage('Plaid Item pending expiration', {
    level: 'warning',
    tags: { area: 'plaid:webhook:pending_expiration' },
    extra: { itemId, expirationTime, accountCount },
  })
}

export async function handleUserPermissionRevoked(
  itemId: string,
  prisma: PrismaClient,
): Promise<void> {
  const result = await prisma.account.updateMany({
    where: { plaidItemId: itemId },
    data: { lastSyncError: 'USER_REVOKED' },
  })

  if (result.count === 0) {
    console.warn('[plaid:webhook] USER_PERMISSION_REVOKED for unknown item', { itemId })
    return
  }

  console.warn('[plaid:webhook] user revoked permission; marked accounts', {
    itemId,
    affectedAccounts: result.count,
  })

  Sentry.captureMessage('Plaid user revoked permission', {
    level: 'warning',
    tags: { area: 'plaid:webhook:user_revoked' },
    extra: { itemId, affectedAccounts: result.count },
  })
}

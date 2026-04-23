/**
 * One-time backfill: set the webhook URL on every existing Plaid Item so that
 * Items linked before PLAID_WEBHOOK_URL was configured in the Plaid dashboard
 * start receiving TRANSACTIONS:SYNC_UPDATES_AVAILABLE / ITEM:* webhooks.
 *
 * Run with:
 *   cd apps/web
 *   npx tsx scripts/backfill-plaid-webhook.ts
 *
 * Requires PLAID_WEBHOOK_URL in the environment (usually apps/web/.env.local
 * for local runs; Vercel env for production). PLAID_CLIENT_ID + PLAID_SECRET
 * (or PLAID_SANDBOX_SECRET) must also be present so plaidClient can
 * authenticate.
 *
 * Safe to re-run. Idempotent: Plaid's /item/webhook/update is a set operation
 * and accepts the same URL repeatedly.
 */

import { prisma } from '@/lib/prisma'
import { plaidClient } from '@/lib/plaid'

function maskToken(token: string): string {
  return `${token.slice(0, 10)}...`
}

async function main() {
  const webhookUrl = process.env.PLAID_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('PLAID_WEBHOOK_URL must be set. Run script with env var loaded.')
    process.exit(1)
  }

  const accounts = await prisma.account.findMany({
    where: { plaidAccessToken: { not: null } },
    select: { id: true, plaidAccessToken: true, plaidItemId: true, userId: true },
    distinct: ['plaidAccessToken'],
  })

  console.log(`[backfill:webhook] found ${accounts.length} unique Plaid Item(s)`)
  console.log(`[backfill:webhook] target webhook: ${webhookUrl}`)

  let succeeded = 0
  let failed = 0
  const failures: { token: string; error: string }[] = []

  for (const account of accounts) {
    const token = account.plaidAccessToken
    if (!token) continue
    const masked = maskToken(token)

    try {
      await plaidClient.itemWebhookUpdate({
        access_token: token,
        webhook: webhookUrl,
      })
      console.log(`${masked}  OK`)
      succeeded++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`${masked}  FAILED: ${message}`)
      failures.push({ token: masked, error: message })
      failed++
    }

    await new Promise(r => setTimeout(r, 100))
  }

  console.log('')
  console.log('Backfill complete.')
  console.log(`Total Items: ${accounts.length}`)
  console.log(`Succeeded: ${succeeded}`)
  console.log(`Failed: ${failed}`)

  if (failures.length > 0) {
    console.log('')
    console.log('Failed Items (for manual review):')
    for (const f of failures) {
      console.log(`  ${f.token}  ${f.error}`)
    }
  }
}

main()
  .catch(err => {
    console.error('[backfill:webhook] fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

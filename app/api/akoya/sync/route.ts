import { NextRequest, NextResponse } from 'next/server'
import { fetchAkoyaAccounts, fetchAkoyaTransactions, refreshAkoyaToken, normalizeAkoyaAccounts, parseAkoyaDate, extractEmbeddedTransactions } from '@/lib/akoya'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get all accounts with tokens
    const accounts = await prisma.account.findMany({
      where: { akoyaToken: { not: null } },
    })

    if (accounts.length === 0) {
      return NextResponse.json({ message: 'No connected accounts to sync' })
    }

    let synced = 0

    for (const account of accounts) {
      if (!account.akoyaToken || !account.akoyaAccountId || !account.akoyaConnectorId) continue

      const connectorId = account.akoyaConnectorId

      try {
        // Refresh the OAuth token before making any Akoya API calls
        if (!account.akoyaRefreshToken) {
          console.error(`No refresh token stored for account ${account.id} — re-connect required`)
          continue
        }
        let activeToken: string
        try {
          const refreshed = await refreshAkoyaToken(account.akoyaRefreshToken)
          activeToken = refreshed.access_token
          await prisma.account.update({
            where: { id: account.id },
            data: {
              akoyaToken: refreshed.access_token,
              akoyaRefreshToken: refreshed.refresh_token,
            },
          })
        } catch (refreshErr) {
          console.error(`Token refresh failed for account ${account.id}:`, refreshErr)
          continue
        }

        // Refresh balance
        const accountsResponse = await fetchAkoyaAccounts(connectorId, activeToken)
        const akoyaAccounts = normalizeAkoyaAccounts(accountsResponse)
        const matching = akoyaAccounts.find((a: Record<string, unknown>) => (a.accountId ?? a.id) === account.akoyaAccountId)

        if (matching) {
          // depositAccount uses currentBalance, investmentAccount uses currentValue, loans use principalBalance
          const balance = (matching.currentBalance ?? matching.currentValue ?? matching.principalBalance ?? matching.balance ?? account.balance) as number
          await prisma.account.update({
            where: { id: account.id },
            data: { balance },
          })
        }

        // Collect transactions: prefer embedded, fall back to separate endpoint
        let txList: Record<string, unknown>[] = matching ? extractEmbeddedTransactions(matching) : []
        if (txList.length === 0) {
          try {
            const txResponse = await fetchAkoyaTransactions(connectorId, account.akoyaAccountId, activeToken)
            txList = txResponse.transactions ?? []
          } catch (txErr) {
            console.error(`[Akoya sync] transactions endpoint failed for ${account.akoyaAccountId}:`, txErr)
          }
        }
        console.log(`[Akoya sync] ${txList.length} transactions for account ${account.akoyaAccountId}`)

        let savedCount = 0
        for (const tx of txList) {
          const txId = tx.transactionId ?? tx.id
          if (!txId) continue
          const parsedDate = parseAkoyaDate(tx.postedTimestamp ?? tx.transactionTimestamp ?? tx.date)
          if (!parsedDate) continue
          try {
            await prisma.transaction.upsert({
              where: { id: String(txId) },
              create: {
                id: String(txId),
                accountId: account.id,
                merchantName: (tx.merchant as Record<string, unknown>)?.name as string ?? tx.description as string ?? null,
                amount: tx.amount as number ?? 0,
                category: tx.category as string ?? null,
                date: parsedDate,
                pending: tx.status === 'PENDING',
              },
              update: {
                amount: tx.amount as number ?? 0,
                pending: tx.status === 'PENDING',
              },
            })
            savedCount++
          } catch (upsertErr) {
            console.error('[Akoya sync] upsert failed for tx', txId, upsertErr)
          }
        }
        console.log(`[Akoya sync] saved ${savedCount}/${txList.length} transactions for ${account.akoyaAccountId}`)

        synced++
      } catch (err) {
        console.error(`Sync failed for account ${account.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, synced })
  } catch (error) {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

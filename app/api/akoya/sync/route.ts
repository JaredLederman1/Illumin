import { NextRequest, NextResponse } from 'next/server'
import { fetchAkoyaAccounts, fetchAkoyaTransactions, refreshAkoyaToken } from '@/lib/akoya'
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

    const FDX_ACCOUNT_KEYS = ['depositAccount', 'investmentAccount', 'loanAccount', 'lineOfCredit', 'insuranceAccount', 'annuityAccount']

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
        // FDX wraps each account in a typed key, e.g. { depositAccount: {...} } — unwrap first
        const akoyaAccounts = (accountsResponse.accounts ?? []).map((entry: Record<string, unknown>) => {
          const key = FDX_ACCOUNT_KEYS.find(k => entry[k])
          return key ? (entry[key] as Record<string, unknown>) : entry
        })
        const matching = akoyaAccounts.find((a: Record<string, unknown>) => (a.accountId ?? a.id) === account.akoyaAccountId)

        if (matching) {
          // depositAccount uses currentBalance, investmentAccount uses currentValue, loans use principalBalance
          const balance = (matching.currentBalance ?? matching.currentValue ?? matching.principalBalance ?? matching.balance ?? account.balance) as number
          await prisma.account.update({
            where: { id: account.id },
            data: { balance },
          })
        }

        // Sync transactions
        const txResponse = await fetchAkoyaTransactions(connectorId, account.akoyaAccountId, activeToken)
        const txList = txResponse.transactions ?? []

        for (const tx of txList) {
          await prisma.transaction.upsert({
            where: { id: tx.transactionId ?? tx.id },
            create: {
              id: tx.transactionId ?? tx.id,
              accountId: account.id,
              merchantName: tx.merchant?.name ?? tx.description ?? null,
              amount: tx.amount ?? 0,
              category: tx.category ?? null,
              date: new Date(tx.transactionTimestamp ?? tx.date),
              pending: tx.status === 'PENDING',
            },
            update: {
              amount: tx.amount ?? 0,
              pending: tx.status === 'PENDING',
            },
          })
        }

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

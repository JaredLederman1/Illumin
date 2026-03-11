import { NextRequest, NextResponse } from 'next/server'
import { fetchAkoyaAccounts, fetchAkoyaTransactions } from '@/lib/akoya'
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
      if (!account.akoyaToken || !account.akoyaAccountId) continue

      const connectorId = account.institutionName.toLowerCase().includes('schwab') ? 'schwab' : 'capital-one'

      try {
        // Refresh balance
        const accountsResponse = await fetchAkoyaAccounts(connectorId, account.akoyaToken)
        const akoyaAccounts = accountsResponse.accounts ?? []
        const matching = akoyaAccounts.find((a: { accountId?: string; id?: string }) => (a.accountId ?? a.id) === account.akoyaAccountId)

        if (matching) {
          await prisma.account.update({
            where: { id: account.id },
            data: { balance: matching.currentBalance ?? matching.balance ?? account.balance },
          })
        }

        // Sync transactions
        const txResponse = await fetchAkoyaTransactions(connectorId, account.akoyaAccountId, account.akoyaToken)
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

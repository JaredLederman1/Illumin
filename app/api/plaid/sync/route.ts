import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { syncAccountBalances, getTransactions } from '@/lib/plaid'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user: authUser } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const accounts = await prisma.account.findMany({
      where: { userId: dbUser.id, plaidAccessToken: { not: null } },
    })

    if (accounts.length === 0) {
      return NextResponse.json({ message: 'No connected accounts to sync', synced: 0 })
    }

    // Group accounts by access token to minimize API calls
    const tokenMap = new Map<string, typeof accounts>()
    for (const account of accounts) {
      if (!account.plaidAccessToken) continue
      const group = tokenMap.get(account.plaidAccessToken) ?? []
      group.push(account)
      tokenMap.set(account.plaidAccessToken, group)
    }

    let updatedAccounts = 0
    let updatedTransactions = 0

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 30)
    const start = startDate.toISOString().split('T')[0]
    const end = now.toISOString().split('T')[0]

    for (const [accessToken, accountGroup] of tokenMap) {
      try {
        const plaidAccounts = await syncAccountBalances(accessToken)

        for (const account of accountGroup) {
          const plaidAccount = plaidAccounts.find(p => p.account_id === account.plaidAccountId)
          if (!plaidAccount) continue

          const balance = plaidAccount.balances.current ?? plaidAccount.balances.available ?? account.balance
          await prisma.account.update({
            where: { id: account.id },
            data: { balance },
          })
          updatedAccounts++
        }

        // Fetch recent transactions
        try {
          const transactions = await getTransactions(accessToken, start, end)
          for (const tx of transactions) {
            const accountRecord = accountGroup.find(a => a.plaidAccountId === tx.account_id)
            if (!accountRecord) continue
            try {
              await prisma.transaction.upsert({
                where: { id: tx.transaction_id },
                create: {
                  id: tx.transaction_id,
                  accountId: accountRecord.id,
                  merchantName: tx.merchant_name ?? tx.name ?? null,
                  amount: -tx.amount,
                  category: tx.personal_finance_category?.primary ?? (tx.category?.[0] ?? null),
                  date: new Date(tx.date),
                  pending: tx.pending,
                },
                update: {
                  amount: -tx.amount,
                  pending: tx.pending,
                },
              })
              updatedTransactions++
            } catch {
              // Skip duplicates
            }
          }
        } catch (txErr) {
          console.error('[Plaid sync] transaction fetch failed:', txErr)
        }
      } catch (err) {
        console.error('[Plaid sync] failed for access token group:', err)
      }
    }

    return NextResponse.json({ success: true, updatedAccounts, updatedTransactions })
  } catch (error) {
    console.error('[Plaid sync] error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

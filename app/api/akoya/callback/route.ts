import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { exchangeCodeForToken, fetchAkoyaAccounts, fetchAkoyaTransactions, normalizeAkoyaAccounts, parseAkoyaDate, extractEmbeddedTransactions } from '@/lib/akoya'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const connectorId = searchParams.get('state')?.split(':')[0] ?? null
  const akoyaError = searchParams.get('error')
  const akoyaErrorDesc = searchParams.get('error_description')

  console.log('[Akoya callback] received params:', {
    code: code ? `${code.slice(0, 8)}…` : null,
    connectorId,
    akoyaError,
    akoyaErrorDesc,
    allParams: Object.fromEntries(searchParams.entries()),
  })

  // Akoya rejected the auth request (e.g. bad client_id, wrong redirect_uri, unknown connector)
  if (akoyaError) {
    console.error('[Akoya callback] Akoya returned an error:', akoyaError, akoyaErrorDesc)
    const msg = encodeURIComponent(akoyaErrorDesc ?? akoyaError)
    return NextResponse.redirect(new URL(`/dashboard/accounts?error=${encodeURIComponent(akoyaError)}&desc=${msg}`, request.url))
  }

  if (!code || !connectorId) {
    console.error('[Akoya callback] missing code or state, got:', { code, connectorId })
    return NextResponse.redirect(new URL('/dashboard/accounts?error=missing_params', request.url))
  }

  try {
    const { access_token, id_token, refresh_token } = await exchangeCodeForToken(code)

    // Resolve authenticated user from session cookie
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
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.redirect(new URL('/auth/login?error=session_expired', request.url))
    }

    // Fetch accounts from Akoya
    const accountsResponse = await fetchAkoyaAccounts(connectorId, access_token, id_token)
    console.log('[Akoya callback] raw accountsResponse keys:', Object.keys(accountsResponse ?? {}))

    const akoyaAccounts = normalizeAkoyaAccounts(accountsResponse)
    console.log('[Akoya callback] normalized account count:', akoyaAccounts.length)

    // Ensure user record exists and resolve internal userId
    const dbUser = await prisma.user.upsert({
      where: { email: authUser.email! },
      update: {},
      create: { id: authUser.id, email: authUser.email! },
    })
    const userId = dbUser.id

    for (const akoyaAccount of akoyaAccounts) {
      console.log('[Akoya callback] saving account:', {
        accountId: akoyaAccount.accountId ?? akoyaAccount.id,
        accountType: akoyaAccount.accountType,
        currentBalance: akoyaAccount.currentBalance,
        currentValue: akoyaAccount.currentValue,
        principalBalance: akoyaAccount.principalBalance,
        balance: akoyaAccount.balance,
        allKeys: Object.keys(akoyaAccount),
      })
      const acctId = String(akoyaAccount.accountId ?? akoyaAccount.id ?? '')
      const acctType = String(akoyaAccount.accountType ?? 'checking')
      const balance = Number(akoyaAccount.currentBalance ?? akoyaAccount.currentValue ?? akoyaAccount.principalBalance ?? akoyaAccount.balance ?? 0)
      const last4 = typeof akoyaAccount.accountNumber === 'string' ? akoyaAccount.accountNumber.slice(-4) : null
      const institutionName = connectorId === 'schwab' ? 'Charles Schwab' : connectorId === 'capital-one' ? 'Capital One' : 'Mikomo Bank'

      const account = await prisma.account.upsert({
        where: { akoyaAccountId: acctId },
        create: {
          userId,
          institutionName,
          accountType: acctType,
          balance,
          last4,
          akoyaAccountId: acctId,
          akoyaToken: access_token,
          akoyaRefreshToken: refresh_token ?? null,
          akoyaConnectorId: connectorId,
        },
        update: {
          balance,
          akoyaToken: access_token,
          akoyaRefreshToken: refresh_token ?? null,
          akoyaConnectorId: connectorId,
        },
      })

      // Collect transactions: prefer embedded (investment accounts return them in
      // the account object itself), fall back to the separate transactions endpoint
      let txList: Record<string, unknown>[] = extractEmbeddedTransactions(akoyaAccount)
      if (txList.length === 0) {
        try {
          const txResponse = await fetchAkoyaTransactions(connectorId, account.akoyaAccountId!, access_token)
          txList = txResponse.transactions ?? []
        } catch (txErr) {
          console.error(`[Akoya callback] transactions endpoint failed for ${account.akoyaAccountId}:`, txErr)
        }
      }
      console.log(`[Akoya callback] ${txList.length} transactions for account ${account.akoyaAccountId}`)

      let savedCount = 0
      for (const tx of txList) {
        const txId = tx.transactionId ?? tx.id
        if (!txId) continue
        const parsedDate = parseAkoyaDate(tx.postedTimestamp ?? tx.transactionTimestamp ?? tx.date)
        if (!parsedDate) {
          console.warn('[Akoya callback] skipping tx with unparseable date:', { txId, ts: tx.transactionTimestamp })
          continue
        }
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
          console.error('[Akoya callback] upsert failed for tx', txId, upsertErr)
        }
      }
      console.log(`[Akoya callback] saved ${savedCount}/${txList.length} transactions for ${account.akoyaAccountId}`)
    }

    return NextResponse.redirect(new URL('/dashboard/accounts?success=connected', request.url))
  } catch (error) {
    console.error('Akoya callback error:', error)
    const msg = encodeURIComponent(error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL(`/dashboard/accounts?error=connection_failed&desc=${msg}`, request.url))
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { normalizeCategory } from '@/lib/categories'
import { findRecurringChain, groupByMerchant } from '@/lib/recurring'

export interface RecurringCharge {
  date: string
  amount: number
}

export interface RecurringMerchant {
  // Preserved fields consumed by the existing page
  name: string
  occurrences: number
  lastAmount: number
  lastDate: string
  averageAmount: number
  frequency: 'monthly' | 'irregular'
  category: string | null
  totalSpent: number
  charges: RecurringCharge[]
  nextExpectedDate: string | null
  // Fields defined by the recurring spec
  merchantName: string
  estimatedMonthlyAmount: number
  expectedDay: number
  lastChargeDate: string
  consecutiveMonths: number
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d)
}

function mode(values: number[]): number {
  const counts = new Map<number, number>()
  let best = values[0]
  let bestCount = 0
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1
    counts.set(v, c)
    if (c > bestCount) {
      bestCount = c
      best = v
    }
  }
  return best
}

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: dbUser.id } },
      include: { account: true },
      orderBy: { date: 'asc' },
    })

    const exclusions = await prisma.recurringExclusion.findMany({
      where: { userId: dbUser.id },
      select: { merchantName: true },
    })
    const excludedSet = new Set(exclusions.map(e => e.merchantName.trim().toLowerCase()))

    const merchantMap = groupByMerchant(transactions, excludedSet)

    const recurring: RecurringMerchant[] = []

    for (const [, txs] of merchantMap) {
      const chain = findRecurringChain(txs)
      if (!chain) continue

      // Only keep expense merchants (chain sums must be negative)
      const chainTotal = chain.reduce((s, t) => s + t.amount, 0)
      if (chainTotal >= 0) continue

      const last = chain[chain.length - 1]
      const displayName = last.merchantName!.trim()
      const days = chain.map(t => toDate(t.date).getDate())
      const expectedDay = mode(days)
      const estimatedMonthlyAmount = chain.reduce((s, t) => s + t.amount, 0) / chain.length
      const lastChargeDate = toDate(last.date).toISOString()

      // Project the next expected date: next month after the last charge, clamped to that month's length.
      const lastD = toDate(last.date)
      const next = new Date(lastD)
      next.setDate(1)
      next.setMonth(next.getMonth() + 1)
      const monthLen = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(expectedDay, monthLen))
      const nextExpectedDate = next.toISOString()

      const charges: RecurringCharge[] = chain
        .slice()
        .reverse()
        .map(t => ({ date: toDate(t.date).toISOString(), amount: t.amount }))

      recurring.push({
        name: displayName,
        merchantName: displayName,
        occurrences: chain.length,
        consecutiveMonths: chain.length,
        lastAmount: last.amount,
        lastDate: lastChargeDate,
        lastChargeDate,
        averageAmount: estimatedMonthlyAmount,
        estimatedMonthlyAmount,
        expectedDay,
        frequency: 'monthly',
        category: normalizeCategory(last.category),
        totalSpent: chainTotal,
        charges,
        nextExpectedDate,
      })
    }

    // Sort by absolute value of last amount, descending
    recurring.sort((a, b) => Math.abs(b.lastAmount) - Math.abs(a.lastAmount))

    const totalMonthlyEstimate = recurring.reduce((s, r) => s + r.estimatedMonthlyAmount, 0)

    return NextResponse.json({
      recurring,
      totalMonthlyEstimate,
      totalCount: recurring.length,
    })
  } catch (error) {
    console.error('[recurring]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

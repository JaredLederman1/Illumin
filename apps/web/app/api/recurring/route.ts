import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { normalizeCategory } from '@/lib/categories'

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

type TxLike = { merchantName: string | null; amount: number; category: string | null; date: Date | string }

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
}

// True if `curr` is exactly one calendar month after `prev` (both "YYYY-MM" with 0-indexed month).
function isNextMonthKey(prev: string, curr: string): boolean {
  const [py, pm] = prev.split('-').map(Number)
  const [cy, cm] = curr.split('-').map(Number)
  if (cy === py && cm === pm + 1) return true
  if (cy === py + 1 && pm === 11 && cm === 0) return true
  return false
}

// Day-of-month difference that tolerates month-end wrap (e.g., 31 vs 1 is 1 day apart).
function dayOfMonthDiff(a: number, b: number): number {
  const raw = Math.abs(a - b)
  return Math.min(raw, 31 - raw)
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

/**
 * Detect the longest run of consecutive months where this merchant has
 * exactly one transaction per month and each adjacent pair falls within
 * +/- 2 days of each other by day-of-month. Returns null if no run reaches
 * at least 2 consecutive months.
 */
function findBestChain<T extends TxLike>(txs: T[]): T[] | null {
  // Group by calendar month
  const byMonth = new Map<string, T[]>()
  for (const t of txs) {
    const key = monthKey(toDate(t.date))
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(t)
  }

  const months = [...byMonth.keys()].sort()

  let best: T[] = []
  let current: T[] = []

  for (let i = 0; i < months.length; i++) {
    const key = months[i]
    const inMonth = byMonth.get(key)!

    // Multiple charges in one month disqualifies this month from the chain.
    if (inMonth.length !== 1) {
      if (current.length > best.length) best = current
      current = []
      continue
    }

    const tx = inMonth[0]
    const day = toDate(tx.date).getDate()

    if (current.length === 0) {
      current = [tx]
      continue
    }

    const prevKey = months[i - 1]
    const prevTx = current[current.length - 1]
    const prevDay = toDate(prevTx.date).getDate()

    const consecutive = isNextMonthKey(prevKey, key)
    const closeEnough = dayOfMonthDiff(day, prevDay) <= 2

    if (consecutive && closeEnough) {
      current.push(tx)
    } else {
      if (current.length > best.length) best = current
      current = [tx]
    }
  }
  if (current.length > best.length) best = current

  return best.length >= 2 ? best : null
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

    // Group by normalized merchant name (lowercase, trimmed)
    const merchantMap = new Map<string, typeof transactions>()
    for (const tx of transactions) {
      if (!tx.merchantName) continue
      const key = tx.merchantName.trim().toLowerCase()
      if (excludedSet.has(key)) continue
      if (!merchantMap.has(key)) merchantMap.set(key, [])
      merchantMap.get(key)!.push(tx)
    }

    const recurring: RecurringMerchant[] = []

    for (const [, txs] of merchantMap) {
      // Sort ascending by date (defensive; query already returns asc)
      const sorted = [...txs].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())

      const chain = findBestChain(sorted)
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

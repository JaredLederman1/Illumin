/**
 * Shared recurring-charge detection logic.
 *
 * A merchant is considered "recurring" if it has at least 2 consecutive
 * calendar months each containing exactly one transaction from that merchant,
 * where adjacent months fall within +/- 2 days of each other by day-of-month.
 *
 * Used by:
 *  - app/api/recurring/route.ts (recurring page feed)
 *  - lib/data.ts detectRecurringMerchants (transactions page "recurring" badge)
 */

export type RecurringTxInput = {
  merchantName: string | null
  date: string | Date
  amount?: number
}

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

/**
 * Walks a merchant's transactions and returns the longest chain of
 * consecutive months satisfying the recurring rules, or null if no chain
 * reaches at least 2 months.
 */
export function findRecurringChain<T extends RecurringTxInput>(txs: T[]): T[] | null {
  // Sort ascending by date
  const sorted = [...txs].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())

  // Bucket by calendar month
  const byMonth = new Map<string, T[]>()
  for (const t of sorted) {
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

    // More than one charge in a single month disqualifies that month.
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

/**
 * Group transactions by normalized merchant key, skipping excluded merchants
 * and any row without a merchant name.
 */
export function groupByMerchant<T extends RecurringTxInput>(
  transactions: T[],
  excludedMerchants?: Set<string>,
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const tx of transactions) {
    if (!tx.merchantName) continue
    const key = tx.merchantName.trim().toLowerCase()
    if (excludedMerchants?.has(key)) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }
  return map
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDashboard } from '@/lib/dashboardData'
import type { DashboardState } from '@/lib/dashboardState'
import type { HeroMetrics } from './HeroRow'

const DEFAULT_LIABILITY_APR = 0.24
const DISCRETIONARY = new Set([
  'Dining',
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Travel',
])
const FIXED_VARIABLE_EXCLUDE = new Set([
  'Housing',
  'Utilities',
  'Insurance',
  'Debt Payment',
])
const IRA_LIMIT = 7000
const HSA_LIMIT = 4300

interface HeroStateResponse {
  state: DashboardState
  rationale?: unknown
  computedAt?: string
}

/**
 * Fetches /api/dashboard/state and computes the per-hero display metrics from
 * the existing dashboard context. Returning a single object keeps the wiring
 * in page.tsx small.
 */
export function useDashboardHeroState(): {
  state: DashboardState | null
  loading: boolean
  metrics: HeroMetrics
  failed: boolean
} {
  const {
    authToken,
    accounts,
    transactions,
    spendingByCategory,
    netWorth,
    profile,
    benefits,
    forecast,
  } = useDashboard()

  const [state, setState] = useState<DashboardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {}
    fetch('/api/dashboard/state', { headers })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: HeroStateResponse) => {
        if (cancelled) return
        if (data?.state) {
          setState(data.state)
          setFailed(false)
        } else {
          setFailed(true)
        }
      })
      .catch(err => {
        if (cancelled) return
        console.warn('[dashboard] failed to fetch state', err)
        setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authToken])

  const metrics = useMemo<HeroMetrics>(() => {
    // ── annualInterestCost ────────────────────────────────────────────────
    const liabilities = accounts.filter(a => (a as { classification?: string }).classification === 'liability')
    const annualInterestCost = liabilities.reduce(
      (s, a) => s + Math.abs(a.balance) * DEFAULT_LIABILITY_APR,
      0,
    )

    // ── emergency fund ─────────────────────────────────────────────────────
    const emergencyFundMonths = forecast?.emergencyFundMonths ?? 0
    const emergencyFundTargetMonths =
      ((profile as unknown as { emergencyFundMonthsTarget?: number })?.emergencyFundMonthsTarget) ?? 6

    // ── annualMatchGap ─────────────────────────────────────────────────────
    const extracted = benefits?.extracted ?? null
    const salary = profile?.annualIncome ?? 0
    let annualMatchGap = 0
    if (extracted?.has401k && extracted.matchRate && extracted.matchCap && salary > 0) {
      const fullMatch = salary * extracted.matchCap * extracted.matchRate
      // Conservative assumption: user is at the fallback 2% contribution rate
      // when we cannot infer a better signal. Phase 2 will pipe the
      // server-inferred contribution rate through instead.
      const assumedCapturedRate = Math.min(extracted.matchCap, 0.02)
      const captured = salary * assumedCapturedRate * extracted.matchRate
      annualMatchGap = Math.max(0, fullMatch - captured)
    }

    // ── remaining tax-advantaged capacity ─────────────────────────────────
    // Simple approximation: full IRA + HSA annual limits. Refined in phase 2.
    const remainingTaxAdvantagedCapacity = IRA_LIMIT + HSA_LIMIT

    // ── top-3 discretionary share of variable spend ───────────────────────
    const totalByCat = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.amount >= 0) continue
      const cat = tx.category ?? 'Other'
      totalByCat.set(cat, (totalByCat.get(cat) ?? 0) + Math.abs(tx.amount))
    }
    // Fallback to spendingByCategory from /api/cashflow if transactions array
    // was empty or unavailable — spendingByCategory is already last-30-days.
    if (totalByCat.size === 0) {
      for (const entry of spendingByCategory) {
        totalByCat.set(entry.category, entry.amount)
      }
    }
    const variable = Array.from(totalByCat.entries())
      .filter(([c]) => !FIXED_VARIABLE_EXCLUDE.has(c))
      .reduce((s, [, v]) => s + v, 0)
    const top3 = Array.from(totalByCat.entries())
      .filter(([c]) => DISCRETIONARY.has(c))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .reduce((s, [, v]) => s + v, 0)
    const top3DiscretionaryShare = variable > 0 ? top3 / variable : 0

    return {
      annualInterestCost,
      emergencyFundMonths,
      emergencyFundTargetMonths,
      annualMatchGap,
      remainingTaxAdvantagedCapacity,
      top3DiscretionaryShare,
      netWorth: netWorth?.current ?? 0,
    }
  }, [accounts, transactions, spendingByCategory, netWorth, profile, benefits, forecast])

  return { state, loading, metrics, failed }
}

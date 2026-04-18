'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, Dispatch, SetStateAction } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeCategory } from '@/lib/categories'
import type { ScoreReport } from '@illumin/types'
import type { BenefitStatus, ExtractedBenefits } from '@/lib/benefitsAnalysis'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface NetWorthData {
  current: number
  lastMonth: number
  totalAssets: number
  totalLiabilities: number
}

export interface Transaction {
  id: string
  accountId: string
  merchantName: string | null
  amount: number
  category: string | null
  date: string | Date
  pending: boolean
}

export interface Account {
  id: string
  institutionName: string
  accountType: string
  classification?: string
  balance: number
  last4: string | null
}

export interface MonthlyData {
  month: string
  year?: number
  income: number
  expenses: number
  savings: number
}

export interface SpendingCategory {
  category: string
  amount: number
  color: string
}

export interface ForecastData {
  avgIncome: number
  avgExpenses: number
  avgSavings: number
  checkingBalance: number
  emergencyFundMonths: number
  historicalMonths: { month: string; balance: number; projected: boolean }[]
  projectedMonths: { month: string; balance: number; projected: boolean }[]
}

export interface OnboardingProfile {
  age: number
  annualIncome: number
  savingsRate: number
  retirementAge: number
}

export interface BenefitsData {
  extracted: ExtractedBenefits | null
  crossCheck: BenefitStatus[]
  actionItemsDone: string[]
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface DashboardContextValue {
  loading: boolean
  authToken: string | null
  email: string | null
  netWorth: NetWorthData | null
  transactions: Transaction[]
  accounts: Account[]
  setAccounts: Dispatch<SetStateAction<Account[]>>
  monthlyData: MonthlyData[]
  spendingByCategory: SpendingCategory[]
  forecast: ForecastData | null
  scoreReport: ScoreReport | null
  profile: OnboardingProfile | null
  setProfile: Dispatch<SetStateAction<OnboardingProfile | null>>
  benefits: BenefitsData | null
  setBenefits: Dispatch<SetStateAction<BenefitsData | null>>
  refresh: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [loading,            setLoading]    = useState(true)
  const [authToken,          setAuthToken]  = useState<string | null>(null)
  const [email,              setEmail]      = useState<string | null>(null)
  const [netWorth,           setNetWorth]   = useState<NetWorthData | null>(null)
  const [transactions,       setTransactions]     = useState<Transaction[]>([])
  const [accounts,           setAccounts]         = useState<Account[]>([])
  const [monthlyData,        setMonthlyData]       = useState<MonthlyData[]>([])
  const [spendingByCategory, setSpending]          = useState<SpendingCategory[]>([])
  const [forecast,           setForecast]          = useState<ForecastData | null>(null)
  const [scoreReport,        setScoreReport]       = useState<ScoreReport | null>(null)
  const [profile,            setProfile]           = useState<OnboardingProfile | null>(null)
  const [benefits,           setBenefits]          = useState<BenefitsData | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    const tok  = session?.access_token ?? null
    const mail = session?.user?.email  ?? null
    setAuthToken(tok)
    setEmail(mail)

    const auth: Record<string, string> = tok ? { Authorization: `Bearer ${tok}` } : {}

    const [nw, tx, accts, cf, fc, scoreRes, profileRes, benefitsRes] = await Promise.allSettled([
      fetch('/api/networth',             { headers: auth }).then(r => r.json()),
      fetch('/api/transactions?limit=500', { headers: auth }).then(r => r.json()),
      fetch('/api/accounts',             { headers: auth }).then(r => r.json()),
      fetch('/api/cashflow',             { headers: auth }).then(r => r.json()),
      fetch('/api/forecast',             { headers: auth }).then(r => r.json()),
      tok ? fetch('/api/user/score',      { headers: auth }).then(r => r.json()) : Promise.resolve(null),
      tok ? fetch('/api/user/onboarding', { headers: auth }).then(r => r.json()) : Promise.resolve(null),
      tok ? fetch('/api/user/benefits',   { headers: auth }).then(r => r.json()) : Promise.resolve(null),
    ])

    // Each block is isolated so a thrown exception in one (e.g. transforming
    // transactions) cannot skip the handlers that follow it, including the
    // final setLoading(false). Previously a single throw here left accounts
    // and transactions stuck as empty arrays with loading=true.
    const safely = (label: string, fn: () => void) => {
      try { fn() }
      catch (err) { console.error(`[useDashboard] ${label} handler threw:`, err) }
    }

    if (nw.status === 'rejected') console.error('[useDashboard] /api/networth rejected:', nw.reason)
    else if (nw.value?.netWorth === undefined) console.warn('[useDashboard] /api/networth unexpected shape:', nw.value)

    if (accts.status === 'rejected') console.error('[useDashboard] /api/accounts rejected:', accts.reason)
    else if (!Array.isArray(accts.value?.accounts)) console.warn('[useDashboard] /api/accounts unexpected shape:', accts.value)

    if (tx.status === 'rejected') console.error('[useDashboard] /api/transactions rejected:', tx.reason)
    else if (!Array.isArray(tx.value?.transactions)) console.warn('[useDashboard] /api/transactions unexpected shape:', tx.value)

    safely('networth', () => {
      if (nw.status === 'fulfilled' && nw.value?.netWorth !== undefined) {
        setNetWorth({
          current:          nw.value.netWorth,
          lastMonth:        nw.value.previousNetWorth ?? nw.value.netWorth,
          totalAssets:      nw.value.totalAssets,
          totalLiabilities: nw.value.totalLiabilities,
        })
      }
    })

    safely('accounts', () => {
      if (accts.status === 'fulfilled' && Array.isArray(accts.value?.accounts)) {
        setAccounts(accts.value.accounts)
      }
    })

    safely('transactions', () => {
      if (tx.status === 'fulfilled' && Array.isArray(tx.value?.transactions)) {
        const normalized = tx.value.transactions.map((t: Transaction) => {
          try {
            return { ...t, category: normalizeCategory(t.category) }
          } catch {
            return { ...t, category: 'Other' }
          }
        })
        setTransactions(normalized)
      }
    })

    safely('cashflow', () => {
      if (cf.status === 'fulfilled') {
        if (cf.value?.months?.length)             setMonthlyData(cf.value.months)
        if (cf.value?.spendingByCategory?.length) setSpending(cf.value.spendingByCategory)
      }
    })

    safely('forecast', () => {
      if (fc.status === 'fulfilled' && fc.value?.avgIncome !== undefined) {
        setForecast(fc.value)
      }
    })

    safely('score', () => {
      if (scoreRes.status === 'fulfilled' && scoreRes.value?.report) {
        setScoreReport(scoreRes.value.report)
      }
    })

    safely('profile', () => {
      if (profileRes.status === 'fulfilled' && profileRes.value?.profile) {
        setProfile(profileRes.value.profile)
      }
    })

    safely('benefits', () => {
      if (benefitsRes.status === 'fulfilled' && benefitsRes.value?.benefits) {
        setBenefits({
          extracted:       benefitsRes.value.extracted,
          crossCheck:      benefitsRes.value.crossCheck ?? [],
          actionItemsDone: benefitsRes.value.actionItemsDone ?? [],
        })
      }
    })

    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return (
    <DashboardContext.Provider value={{
      loading, authToken, email,
      netWorth, transactions, accounts, setAccounts,
      monthlyData, spendingByCategory, forecast,
      scoreReport, profile, setProfile, benefits, setBenefits,
      refresh: fetchAll,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

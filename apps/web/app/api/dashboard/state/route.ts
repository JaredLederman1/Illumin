import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCategory } from '@/lib/categories'
import {
  classifyHoldingKind,
  detectDashboardState,
  DashboardStateInput,
  StateAccount,
  StateHolding,
  StateTransactionsSummary,
  StateTotals,
  HoldingAccountKind,
} from '@/lib/dashboardState'

const LIQUID_ACCOUNT_TYPES = new Set([
  'checking', 'savings', 'money market', 'cd',
])

const DISCRETIONARY_CATEGORIES = new Set([
  'Dining', 'Entertainment', 'Shopping', 'Subscriptions', 'Travel',
])

const FIXED_VARIABLE_EXCLUDE = new Set([
  'Housing', 'Utilities', 'Insurance', 'Debt Payment',
])

const RETIREMENT_CATEGORY_HINTS = ['retirement', '401k', 'ira', 'roth']

function isRetirementMerchant(merchant: string | null): boolean {
  if (!merchant) return false
  const m = merchant.toLowerCase()
  return (
    m.includes('401k') ||
    m.includes('401(k)') ||
    m.includes('fidelity') && m.includes('contribution') ||
    m.includes('vanguard') && m.includes('contribution') ||
    m.includes('roth') ||
    m.includes('ira contribution')
  )
}

export async function GET() {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  try {
    const [rawAccounts, rawHoldings, onboarding, sinceDate] = await Promise.all([
      prisma.account.findMany({ where: { userId: dbUser.id } }),
      prisma.holding.findMany({
        where: { account: { userId: dbUser.id } },
        include: { account: { select: { accountType: true } } },
      }),
      prisma.onboardingProfile.findUnique({ where: { userId: dbUser.id } }),
      Promise.resolve((() => {
        const d = new Date()
        d.setMonth(d.getMonth() - 3)
        return d
      })()),
    ])

    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: dbUser.id }, date: { gte: sinceDate } },
      include: { account: { select: { accountType: true, classification: true } } },
    })

    // ── Accounts ──────────────────────────────────────────────────────────
    const accounts: StateAccount[] = rawAccounts.map(a => ({
      id: a.id,
      classification: (a.classification === 'liability' ? 'liability' : 'asset'),
      accountType: a.accountType,
      balance: a.balance,
      apr: null,
    }))

    // ── Holdings ──────────────────────────────────────────────────────────
    // First, any Prisma holdings rows grouped by their account's type.
    const holdingsByKind: Map<HoldingAccountKind, number> = new Map()
    for (const h of rawHoldings) {
      const kind = classifyHoldingKind(h.account.accountType)
      holdingsByKind.set(kind, (holdingsByKind.get(kind) ?? 0) + h.value)
    }
    // Also treat retirement-type accounts themselves as holdings even when no
    // per-security holdings rows exist — Plaid Investments is not always
    // available and the account balance alone is enough to know the user has
    // a 401k/IRA/HSA.
    for (const a of rawAccounts) {
      const kind = classifyHoldingKind(a.accountType)
      if (kind === 'other') continue
      // Avoid double counting if we already summed holdings for the same kind.
      const existing = holdingsByKind.get(kind) ?? 0
      if (existing === 0 && a.balance > 0) {
        holdingsByKind.set(kind, a.balance)
      }
    }
    const holdings: StateHolding[] = Array.from(holdingsByKind.entries()).map(
      ([accountKind, balance]) => ({ accountKind, balance }),
    )

    // ── Totals ────────────────────────────────────────────────────────────
    const liquidAssets = rawAccounts
      .filter(a => a.classification === 'asset' && LIQUID_ACCOUNT_TYPES.has(a.accountType.toLowerCase()))
      .reduce((s, a) => s + a.balance, 0)

    const totalDebt = rawAccounts
      .filter(a => a.classification === 'liability')
      .reduce((s, a) => s + Math.abs(a.balance), 0)

    const retirementBalance =
      (holdingsByKind.get('401k') ?? 0) +
      (holdingsByKind.get('ira') ?? 0) +
      (holdingsByKind.get('roth_ira') ?? 0)

    const iraBalance =
      (holdingsByKind.get('ira') ?? 0) + (holdingsByKind.get('roth_ira') ?? 0)
    const hsaBalance = holdingsByKind.get('hsa') ?? 0

    // ── Transactions summary (trailing ~3 months → averaged per month) ───
    const MONTHS_WINDOW = 3
    let income = 0
    let expenseTotal = 0
    let retirementContrib = 0
    const byCategory = new Map<string, number>()

    for (const tx of transactions) {
      const isLiability = tx.account.classification === 'liability'
      if (tx.amount > 0 && !isLiability) {
        income += tx.amount
      } else if (tx.amount < 0) {
        const spent = Math.abs(tx.amount)
        expenseTotal += spent
        const cat = normalizeCategory(tx.category)
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + spent)

        // Detect retirement contributions: either Plaid-tagged category hints
        // at retirement or the merchant name matches common broker patterns.
        const rawCat = (tx.category ?? '').toLowerCase()
        const retirementTagged = RETIREMENT_CATEGORY_HINTS.some(h => rawCat.includes(h))
        if (retirementTagged || isRetirementMerchant(tx.merchantName)) {
          retirementContrib += spent
        }
      }
    }

    const monthlyIncome = income / MONTHS_WINDOW
    const monthlyRetirementContributions = retirementContrib / MONTHS_WINDOW

    const variableSpend = Array.from(byCategory.entries())
      .filter(([cat]) => !FIXED_VARIABLE_EXCLUDE.has(cat))
      .reduce((s, [, amt]) => s + amt, 0)
    const monthlyVariableSpend = variableSpend / MONTHS_WINDOW

    const discretionarySpend = Array.from(byCategory.entries())
      .filter(([cat]) => DISCRETIONARY_CATEGORIES.has(cat))
      .reduce((s, [, amt]) => s + amt, 0)
    const monthlyDiscretionary = discretionarySpend / MONTHS_WINDOW

    const top3DiscretionaryTotal = Array.from(byCategory.entries())
      .filter(([cat]) => DISCRETIONARY_CATEGORIES.has(cat))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .reduce((s, [, amt]) => s + amt, 0)
    const top3DiscretionaryShare =
      variableSpend > 0 ? top3DiscretionaryTotal / variableSpend : 0

    const monthlyExpenses = expenseTotal / MONTHS_WINDOW
    const emergencyFundMonths =
      monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0

    // Equity allocation: fraction of holdings that are equity-like.
    // We use a loose proxy: holdings in brokerage/401k/ira/roth_ira are
    // treated as equity-heavy. HSA is mixed. Without per-security data we
    // return null and let the detector skip the allocation check.
    const equityAllocationPct = null

    const transactionsSummary: StateTransactionsSummary = {
      monthlyIncome,
      monthlyDiscretionary,
      monthlyVariableSpend,
      top3DiscretionaryShare,
      monthlyRetirementContributions,
    }

    const totals: StateTotals = {
      liquidAssets,
      totalDebt,
      retirementBalance,
      iraBalance,
      hsaBalance,
      emergencyFundMonths,
      equityAllocationPct,
    }

    const input: DashboardStateInput = {
      accounts,
      holdings,
      onboardingProfile: onboarding
        ? {
            age: onboarding.age,
            annualIncome: onboarding.annualIncome,
            savingsRate: onboarding.savingsRate,
            retirementAge: onboarding.retirementAge,
            emergencyFundMonthsTarget: onboarding.emergencyFundMonthsTarget ?? null,
            contractParsedData: (onboarding.contractParsedData ?? null) as Record<string, unknown> | null,
          }
        : null,
      transactionsSummary,
      totals,
    }

    let detected
    try {
      detected = detectDashboardState(input)
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'dashboard:state' } })
      console.warn('[dashboard:state] detectDashboardState threw, defaulting to PRE_LINK', err)
      detected = {
        state: 'PRE_LINK' as const,
        rationale: {
          matchedRule: 'PRE_LINK' as const,
          signals: { fallback: true },
          notes: ['exception in detectDashboardState'],
        },
      }
    }

    console.log('[dashboard:state]', {
      userId: dbUser.id,
      state: detected.state,
      rationale: detected.rationale,
    })

    return NextResponse.json({
      state: detected.state,
      rationale: detected.rationale,
      computedAt: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'dashboard:state' } })
    console.error('[dashboard:state] fatal', error)
    return NextResponse.json({ error: 'Failed to compute dashboard state' }, { status: 500 })
  }
}

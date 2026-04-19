/**
 * Dashboard state detection.
 *
 * Evaluates a user's financial situation and returns a single state identifier
 * that drives the hero row and (eventually) the rest of the dashboard layout.
 *
 * Rules are evaluated in priority order. The first matching state wins. The
 * rationale object explains the decision and is intended for server logs and
 * debugging, not for user-facing copy.
 */

export type DashboardState =
  | 'PRE_LINK'
  | 'LIABILITY_ONLY'
  | 'DEBT_DOMINANT'
  | 'FOUNDATION'
  | 'MATCH_GAP'
  | 'OPTIMIZING'
  | 'SPENDING_LEAK'
  | 'OPTIMIZED'

export type AccountClassification = 'asset' | 'liability'

export interface StateAccount {
  id: string
  classification: AccountClassification
  accountType: string
  balance: number
  /** APR as decimal fraction (e.g. 0.24 for 24%). Null when unknown. */
  apr: number | null
}

export type HoldingAccountKind = '401k' | 'ira' | 'roth_ira' | 'hsa' | 'brokerage' | 'other'

export interface StateHolding {
  accountKind: HoldingAccountKind
  balance: number
}

export interface StateOnboardingProfile {
  age: number | null
  annualIncome: number | null
  savingsRate: number | null
  retirementAge: number | null
  emergencyFundMonthsTarget: number | null
  contractParsedData: Record<string, unknown> | null
}

export interface StateTransactionsSummary {
  monthlyIncome: number
  monthlyDiscretionary: number
  monthlyVariableSpend: number
  top3DiscretionaryShare: number
  monthlyRetirementContributions: number
}

export interface StateTotals {
  liquidAssets: number
  totalDebt: number
  retirementBalance: number
  iraBalance: number
  hsaBalance: number
  emergencyFundMonths: number
  equityAllocationPct: number | null
}

export interface DashboardStateInput {
  accounts: StateAccount[]
  holdings: StateHolding[]
  onboardingProfile: StateOnboardingProfile | null
  transactionsSummary: StateTransactionsSummary
  totals: StateTotals
}

export interface StateRationale {
  matchedRule: DashboardState
  signals: Record<string, unknown>
  notes: string[]
}

export interface DetectResult {
  state: DashboardState
  rationale: StateRationale
}

// ── Constants ────────────────────────────────────────────────────────────────

/** APR threshold for "high-APR" debt. */
const HIGH_APR_THRESHOLD = 0.08

/** Conservative default APR for liability accounts when none is known. */
export const DEFAULT_LIABILITY_APR = 0.24

/** Annual IRA contribution limit (2026 estimate, rounded). Used only as a
 *  ceiling for "remaining capacity" checks. */
export const IRA_ANNUAL_LIMIT = 7000

/** Annual HSA contribution limit, individual coverage. */
export const HSA_ANNUAL_LIMIT = 4300

/** Placeholder contribution rate used when we cannot infer one from data but
 *  the user plausibly has a 401k and a match formula is known. Keeping this
 *  conservative (2% of salary) biases us toward MATCH_GAP when in doubt,
 *  because the cost of missing the match is higher than the cost of a
 *  slightly-wrong hero. */
export const FALLBACK_CONTRIBUTION_RATE = 0.02

// ── Helpers ──────────────────────────────────────────────────────────────────

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

interface MatchFormula {
  matchRate: number
  matchCap: number
}

function extractMatchFormula(
  contractParsedData: Record<string, unknown> | null,
): MatchFormula | null {
  if (!contractParsedData) return null
  const raw = contractParsedData as Record<string, unknown>
  const matchRate = typeof raw.matchRate === 'number' ? raw.matchRate : null
  const matchCap = typeof raw.matchCap === 'number' ? raw.matchCap : null
  if (matchRate == null || matchCap == null) return null
  if (matchRate <= 0 || matchCap <= 0) return null
  return { matchRate, matchCap }
}

function inferContributionRate(
  input: DashboardStateInput,
): { rate: number; source: 'transactions' | 'fallback' } {
  const { transactionsSummary, onboardingProfile } = input
  const annualIncome = onboardingProfile?.annualIncome ?? 0
  if (annualIncome <= 0) {
    return { rate: FALLBACK_CONTRIBUTION_RATE, source: 'fallback' }
  }
  const annualContribFromTx = transactionsSummary.monthlyRetirementContributions * 12
  if (annualContribFromTx > 0) {
    return { rate: annualContribFromTx / annualIncome, source: 'transactions' }
  }
  return { rate: FALLBACK_CONTRIBUTION_RATE, source: 'fallback' }
}

function hasHoldingKind(
  holdings: StateHolding[],
  kinds: HoldingAccountKind[],
): boolean {
  const set = new Set(kinds)
  return holdings.some(h => set.has(h.accountKind) && h.balance > 0)
}

function has401kHoldings(holdings: StateHolding[]): boolean {
  return hasHoldingKind(holdings, ['401k'])
}

function hasAnyRetirementHoldings(holdings: StateHolding[]): boolean {
  return hasHoldingKind(holdings, ['401k', 'ira', 'roth_ira', 'hsa'])
}

function highAprDebtTotal(accounts: StateAccount[]): number {
  return sum(
    accounts
      .filter(a => a.classification === 'liability')
      .filter(a => (a.apr ?? DEFAULT_LIABILITY_APR) > HIGH_APR_THRESHOLD)
      .map(a => Math.abs(a.balance)),
  )
}

// ── Main detector ────────────────────────────────────────────────────────────

export function detectDashboardState(
  input: DashboardStateInput,
): DetectResult {
  const {
    accounts,
    holdings,
    onboardingProfile,
    transactionsSummary,
    totals,
  } = input

  const notes: string[] = []
  const signals: Record<string, unknown> = {
    accountCount: accounts.length,
    assetAccountCount: accounts.filter(a => a.classification === 'asset').length,
    liabilityAccountCount: accounts.filter(a => a.classification === 'liability').length,
    liquidAssets: totals.liquidAssets,
    totalDebt: totals.totalDebt,
    retirementBalance: totals.retirementBalance,
    emergencyFundMonths: totals.emergencyFundMonths,
    equityAllocationPct: totals.equityAllocationPct,
    monthlyIncome: transactionsSummary.monthlyIncome,
    monthlyDiscretionary: transactionsSummary.monthlyDiscretionary,
    monthlyVariableSpend: transactionsSummary.monthlyVariableSpend,
    top3DiscretionaryShare: transactionsSummary.top3DiscretionaryShare,
    savingsRate: onboardingProfile?.savingsRate ?? null,
    age: onboardingProfile?.age ?? null,
    annualIncome: onboardingProfile?.annualIncome ?? null,
    hasContractData: !!onboardingProfile?.contractParsedData,
  }

  // 1. PRE_LINK ────────────────────────────────────────────────────────────
  if (accounts.length === 0) {
    return {
      state: 'PRE_LINK',
      rationale: { matchedRule: 'PRE_LINK', signals, notes: ['no accounts linked'] },
    }
  }

  // 2. LIABILITY_ONLY ─────────────────────────────────────────────────────
  const hasAnyAsset = accounts.some(a => a.classification === 'asset')
  if (!hasAnyAsset) {
    return {
      state: 'LIABILITY_ONLY',
      rationale: {
        matchedRule: 'LIABILITY_ONLY',
        signals,
        notes: ['no asset accounts linked'],
      },
    }
  }

  // 3. DEBT_DOMINANT ──────────────────────────────────────────────────────
  const hasAnyHighAprDebt = accounts.some(
    a =>
      a.classification === 'liability' &&
      (a.apr ?? DEFAULT_LIABILITY_APR) > HIGH_APR_THRESHOLD,
  )
  const highAprDebt = highAprDebtTotal(accounts)
  signals.highAprDebtTotal = highAprDebt
  if (
    hasAnyHighAprDebt &&
    totals.liquidAssets > 0 &&
    highAprDebt > totals.liquidAssets * 0.5
  ) {
    notes.push('high-APR debt > 50% of liquid assets')
    return {
      state: 'DEBT_DOMINANT',
      rationale: { matchedRule: 'DEBT_DOMINANT', signals, notes },
    }
  }
  // Edge case: no liquid assets at all but non-trivial high-APR debt.
  if (hasAnyHighAprDebt && totals.liquidAssets <= 0 && highAprDebt > 0) {
    notes.push('high-APR debt present with zero liquid assets')
    return {
      state: 'DEBT_DOMINANT',
      rationale: { matchedRule: 'DEBT_DOMINANT', signals, notes },
    }
  }

  // 4. FOUNDATION ─────────────────────────────────────────────────────────
  const efTarget = onboardingProfile?.emergencyFundMonthsTarget ?? 3
  const thinEmergencyFund = totals.emergencyFundMonths < Math.min(3, efTarget)
  if (
    totals.liquidAssets > 0 &&
    !hasAnyRetirementHoldings(holdings) &&
    thinEmergencyFund
  ) {
    notes.push('liquid assets present, no retirement holdings, thin emergency fund')
    return {
      state: 'FOUNDATION',
      rationale: { matchedRule: 'FOUNDATION', signals, notes },
    }
  }

  // 5. MATCH_GAP ──────────────────────────────────────────────────────────
  const matchFormula = extractMatchFormula(onboardingProfile?.contractParsedData ?? null)
  signals.matchFormulaKnown = !!matchFormula
  if (has401kHoldings(holdings) && matchFormula) {
    const { rate, source } = inferContributionRate(input)
    signals.inferredContributionRate = rate
    signals.contributionRateSource = source
    if (rate < matchFormula.matchCap) {
      notes.push(
        `contribution rate ${(rate * 100).toFixed(1)}% below match cap ${(matchFormula.matchCap * 100).toFixed(1)}% (source: ${source})`,
      )
      return {
        state: 'MATCH_GAP',
        rationale: { matchedRule: 'MATCH_GAP', signals, notes },
      }
    }
  } else if (has401kHoldings(holdings) && !matchFormula) {
    notes.push('has 401k holdings but no match formula in contract — cannot confirm MATCH_GAP')
  }

  // 6. OPTIMIZING ─────────────────────────────────────────────────────────
  // Full match is "captured" when either (a) there is no match formula (so
  // we cannot flag a gap and we move on) or (b) contribution rate meets the cap.
  const iraRoom = totals.iraBalance < IRA_ANNUAL_LIMIT
  const hsaRoom = totals.hsaBalance < HSA_ANNUAL_LIMIT
  if (has401kHoldings(holdings) && (iraRoom || hsaRoom)) {
    notes.push('match captured or unverifiable; remaining IRA/HSA capacity')
    return {
      state: 'OPTIMIZING',
      rationale: { matchedRule: 'OPTIMIZING', signals, notes },
    }
  }

  // 7. SPENDING_LEAK ──────────────────────────────────────────────────────
  const savingsRate = onboardingProfile?.savingsRate ?? 0
  if (
    savingsRate >= 0.15 &&
    transactionsSummary.monthlyVariableSpend > 0 &&
    transactionsSummary.top3DiscretionaryShare > 0.5
  ) {
    notes.push(
      `savings rate ${(savingsRate * 100).toFixed(0)}% with top-3 discretionary at ${(transactionsSummary.top3DiscretionaryShare * 100).toFixed(0)}% of variable`,
    )
    return {
      state: 'SPENDING_LEAK',
      rationale: { matchedRule: 'SPENDING_LEAK', signals, notes },
    }
  }

  // 8. OPTIMIZED ──────────────────────────────────────────────────────────
  // Default fallthrough. All boxes checked: no high-APR debt, emergency fund
  // at target, retirement holdings present, allocation within age band.
  const age = onboardingProfile?.age ?? null
  const equity = totals.equityAllocationPct
  const efAtTarget = totals.emergencyFundMonths >= (efTarget ?? 6)
  const allocationHealthy =
    age == null ||
    equity == null ||
    (equity >= 100 - age - 10 && equity <= 130 - age + 10)
  if (
    !hasAnyHighAprDebt &&
    hasAnyRetirementHoldings(holdings) &&
    efAtTarget &&
    allocationHealthy
  ) {
    notes.push('no high-APR debt, retirement present, emergency fund at target, allocation in-band')
    return {
      state: 'OPTIMIZED',
      rationale: { matchedRule: 'OPTIMIZED', signals, notes },
    }
  }

  // Catch-all: if we reach here, the user has assets but doesn't cleanly fit
  // the above. Default to FOUNDATION as the safest action-oriented hero.
  notes.push('no rule matched cleanly; defaulting to FOUNDATION')
  return {
    state: 'FOUNDATION',
    rationale: { matchedRule: 'FOUNDATION', signals, notes },
  }
}

// ── Classification helpers used by the API route ─────────────────────────────

/**
 * Classify a prisma Account row's accountType into a holding account kind.
 * Used when an account itself represents a retirement vehicle (e.g. a linked
 * 401k with no per-security holdings).
 */
export function classifyHoldingKind(accountType: string): HoldingAccountKind {
  const t = accountType.toLowerCase()
  if (t.includes('401') || t.includes('403')) return '401k'
  if (t.includes('roth')) return 'roth_ira'
  if (t.includes('ira') || t.includes('retirement') || t.includes('pension')) return 'ira'
  if (t.includes('hsa')) return 'hsa'
  if (t.includes('brokerage') || t.includes('investment') || t.includes('529')) return 'brokerage'
  return 'other'
}

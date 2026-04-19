/**
 * Employer match computation and long-horizon projection.
 *
 * Handles three formula shapes:
 *  1. Flat match:           { matchRate, matchCap }
 *                           employer pays matchRate on contributions up to
 *                           matchCap (e.g. 50% on first 6% -> 0.5 / 0.06).
 *  2. Tiered match:         { tiers: [{ rate, upTo }, ...] }
 *                           each tier applies to the slice of employee_rate
 *                           inside [prevUpTo, upTo]. Dollar-for-dollar on first
 *                           3% then 50% on next 2% -> tiers of
 *                           [{ rate: 1.0, upTo: 0.03 }, { rate: 0.5, upTo: 0.05 }].
 *  3. Fixed-dollar match:   { fixedDollar, matchCap? }
 *                           employer pays up to fixedDollar/year as long as the
 *                           employee contributes at least matchCap of salary.
 *                           Falls back to pro-rata beneath the threshold.
 *
 * Dollar-for-dollar is just a flat formula with matchRate = 1.
 */

export interface FlatMatchFormula {
  matchRate: number
  matchCap: number
}

export interface TieredMatchFormula {
  tiers: { rate: number; upTo: number }[]
}

export interface FixedDollarMatchFormula {
  fixedDollar: number
  /** Minimum employee contribution rate to unlock the full fixed match. */
  matchCap?: number
}

export type MatchFormula =
  | FlatMatchFormula
  | TieredMatchFormula
  | FixedDollarMatchFormula

export interface MatchDollars {
  employeeContrib: number
  employerMatch: number
  total: number
  gapIfAny: number
}

export interface MatchProjection {
  projectedValue: number
  valueFromEmployerMatch: number
  valueLostToGap: number
}

function isTiered(f: MatchFormula): f is TieredMatchFormula {
  return Array.isArray((f as TieredMatchFormula).tiers)
}

function isFixedDollar(f: MatchFormula): f is FixedDollarMatchFormula {
  return typeof (f as FixedDollarMatchFormula).fixedDollar === 'number'
}

function isFlat(f: MatchFormula): f is FlatMatchFormula {
  return (
    typeof (f as FlatMatchFormula).matchRate === 'number' &&
    typeof (f as FlatMatchFormula).matchCap === 'number'
  )
}

/** Cap of contribution rate at which additional employee contributions no
 *  longer attract employer match. Used to detect "full match" state. */
export function matchCapRate(formula: MatchFormula): number {
  if (isTiered(formula)) {
    return formula.tiers.reduce((mx, t) => Math.max(mx, t.upTo), 0)
  }
  if (isFlat(formula)) return formula.matchCap
  if (isFixedDollar(formula)) return formula.matchCap ?? 0
  return 0
}

/** Maximum annual employer match dollars at the cap rate. */
export function maxAnnualMatch(salary: number, formula: MatchFormula): number {
  if (salary <= 0) return 0
  if (isTiered(formula)) {
    let prev = 0
    let total = 0
    for (const t of formula.tiers) {
      const slice = Math.max(0, t.upTo - prev)
      total += slice * t.rate * salary
      prev = t.upTo
    }
    return total
  }
  if (isFlat(formula)) {
    return salary * formula.matchCap * formula.matchRate
  }
  if (isFixedDollar(formula)) {
    return formula.fixedDollar
  }
  return 0
}

/**
 * Compute employee contribution, employer match, and the annual gap at a given
 * contribution rate for any supported formula.
 */
export function computeMatchDollars(
  salary: number,
  employeeRate: number,
  formula: MatchFormula,
): MatchDollars {
  const rate = Math.max(0, employeeRate)
  const employeeContrib = Math.max(0, salary) * rate
  const fullMatch = maxAnnualMatch(salary, formula)

  let employerMatch = 0
  if (salary > 0) {
    if (isTiered(formula)) {
      let prev = 0
      for (const t of formula.tiers) {
        if (rate <= prev) break
        const slice = Math.max(0, Math.min(rate, t.upTo) - prev)
        employerMatch += slice * t.rate * salary
        prev = t.upTo
      }
    } else if (isFlat(formula)) {
      const cappedRate = Math.min(rate, formula.matchCap)
      employerMatch = salary * cappedRate * formula.matchRate
    } else if (isFixedDollar(formula)) {
      const threshold = formula.matchCap ?? 0
      if (threshold <= 0) {
        employerMatch = rate > 0 ? formula.fixedDollar : 0
      } else {
        const ratio = Math.min(1, rate / threshold)
        employerMatch = formula.fixedDollar * ratio
      }
    }
  }

  const gapIfAny = Math.max(0, fullMatch - employerMatch)
  return {
    employeeContrib: Math.round(employeeContrib),
    employerMatch: Math.round(employerMatch),
    total: Math.round(employeeContrib + employerMatch),
    gapIfAny: Math.round(gapIfAny),
  }
}

/**
 * Future value of a stream of annual contributions, compounded monthly at
 * `annualReturn`. Default 6% real return matches the rest of the app's
 * projections in lib/dashboardState.ts.
 */
function fvAnnuityMonthly(
  annualContribution: number,
  years: number,
  annualReturn: number,
): number {
  if (years <= 0) return 0
  const monthsTotal = Math.round(years * 12)
  const monthlyRate = annualReturn / 12
  const monthlyContrib = annualContribution / 12
  if (monthlyRate === 0) return monthlyContrib * monthsTotal
  return (
    monthlyContrib *
    ((Math.pow(1 + monthlyRate, monthsTotal) - 1) / monthlyRate)
  )
}

/**
 * Project the match component of retirement savings forward to retirement.
 * Assumes a flat salary and constant rate across the horizon — the point is
 * to quantify the cost of the current rate, not to forecast salary growth.
 */
export function projectMatchCompounded(
  salary: number,
  employeeRate: number,
  formula: MatchFormula,
  yearsToRetirement: number,
  annualReturn = 0.06,
): MatchProjection {
  const years = Math.max(0, yearsToRetirement)
  const dollars = computeMatchDollars(salary, employeeRate, formula)
  const fullMatch = maxAnnualMatch(salary, formula)

  const valueFromEmployerMatch = fvAnnuityMonthly(
    dollars.employerMatch,
    years,
    annualReturn,
  )
  const projectedValue = fvAnnuityMonthly(
    dollars.employeeContrib + dollars.employerMatch,
    years,
    annualReturn,
  )
  const valueLostToGap = fvAnnuityMonthly(
    Math.max(0, fullMatch - dollars.employerMatch),
    years,
    annualReturn,
  )

  return {
    projectedValue: Math.round(projectedValue),
    valueFromEmployerMatch: Math.round(valueFromEmployerMatch),
    valueLostToGap: Math.round(valueLostToGap),
  }
}

/** Provider inference from a linked retirement account's institution name. */
const SUPPORTED_PROVIDERS = [
  'Fidelity',
  'Vanguard',
  'Empower',
  'Principal',
  'Schwab',
  'TIAA',
] as const

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number]

export interface ProviderAccountInput {
  institutionName: string | null | undefined
  accountType: string
}

/**
 * Returns the provider name when any linked account is classified as a
 * retirement vehicle (401k / 403b / IRA) and its institution substring
 * matches one of the supported list. Case-insensitive.
 */
export function inferMatchProvider(
  accounts: ProviderAccountInput[],
): SupportedProvider | null {
  for (const a of accounts) {
    if (!a.institutionName) continue
    const type = a.accountType.toLowerCase()
    const isRetirement =
      type.includes('401') ||
      type.includes('403') ||
      type.includes('ira') ||
      type.includes('retirement')
    if (!isRetirement) continue
    const hay = a.institutionName.toLowerCase()
    for (const p of SUPPORTED_PROVIDERS) {
      if (hay.includes(p.toLowerCase())) return p
    }
  }
  return null
}

/**
 * Step-by-step guidance for changing contribution rates at each provider.
 * Used by the MatchGapCard drawer CTA.
 */
export const PROVIDER_GUIDES: Record<SupportedProvider, string[]> = {
  Fidelity: [
    'Sign in to NetBenefits at nb.fidelity.com.',
    'Select your 401k plan from the Accounts tab.',
    'Open Contribution Amount, then Change Contribution Amount.',
    'Set the pre-tax or Roth percentage to at least the full match cap.',
    'Submit and confirm the effective pay period.',
  ],
  Vanguard: [
    'Sign in at vanguard.com and open My Accounts.',
    'Select your employer plan, then Plan Details.',
    'Click Change contributions under Paycheck deferrals.',
    'Raise the percentage to the full match cap and save.',
  ],
  Empower: [
    'Sign in at empower.com and open your workplace plan.',
    'Select Contributions, then Change.',
    'Update the percentage to the full match cap.',
    'Review and confirm. Changes typically take one pay cycle.',
  ],
  Principal: [
    'Sign in at principal.com and open your retirement plan.',
    'Go to Manage Contributions.',
    'Raise the rate to at least the full match cap and submit.',
  ],
  Schwab: [
    'Sign in at workplace.schwab.com.',
    'Open Manage Your Account, then Contribution Rates.',
    'Set the rate to the full match cap and confirm.',
  ],
  TIAA: [
    'Sign in at tiaa.org and open your employer plan.',
    'Select Actions, then Change contributions.',
    'Raise the percentage to the full match cap and submit.',
  ],
}

export const GENERIC_GUIDE: string[] = [
  'Log in to your 401k provider or HR/benefits portal.',
  'Find the page named Contributions, Paycheck Deferrals, or similar.',
  'Raise your pre-tax or Roth percentage to at least the full match cap.',
  'Save the change and confirm the pay period it takes effect.',
]

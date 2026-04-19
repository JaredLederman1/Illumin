/**
 * Tax-advantaged account eligibility and capacity.
 *
 * All limits are 2026 federal figures. Eligibility logic relies on two
 * inputs: the user's onboarding profile and the contract-parsed data
 * extracted from their offer letter or benefits document. When contract
 * data is missing or ambiguous for a given lever, eligibility degrades
 * to 'unknown' with a reason string explaining what the user must
 * confirm before we can surface a number.
 */

// ── 2026 federal limits ──────────────────────────────────────────────────────

/** Employee 401k elective deferral limit (2026). */
export const LIMIT_401K_EMPLOYEE = 23_500

/** 401k section 415(c) combined limit (employee + employer + after-tax). */
export const LIMIT_401K_TOTAL = 70_000

/** Traditional or Roth IRA contribution limit (2026). */
export const LIMIT_IRA_BASE = 7_000

/** Additional IRA catch-up for age 50+. */
export const LIMIT_IRA_CATCHUP = 1_000

/** HSA contribution limit, self-only coverage. */
export const LIMIT_HSA_SELF = 4_300

/** HSA contribution limit, family coverage. */
export const LIMIT_HSA_FAMILY = 8_550

/** Roth IRA direct contribution income phase-out range, single filer. */
export const ROTH_PHASEOUT_SINGLE = { start: 150_000, end: 165_000 }

/** Roth IRA direct contribution income phase-out range, married filing jointly. */
export const ROTH_PHASEOUT_MFJ = { start: 236_000, end: 246_000 }

// ── Input shapes ─────────────────────────────────────────────────────────────

export type FilingStatus = 'single' | 'mfj'
export type HsaCoverage = 'self' | 'family'
export type EligibilityTriState = 'eligible' | 'ineligible' | 'unknown'

export interface TaxAdvantagedProfile {
  age: number | null
  annualIncome: number | null
  filingStatus: FilingStatus
  hsaCoverage: HsaCoverage
  /** Current traditional IRA balance (pre-tax). Drives the pro-rata check. */
  traditionalIraBalance: number
  /** YTD contributions observed across all retirement accounts. */
  iraContributedYtd: number
  hsaContributedYtd: number
  employee401kContributedYtd: number
  employer401kContributedYtd: number
  /** Rough split of the user's 401k contributions currently going to Roth. */
  current401kRothShare: number | null
}

/**
 * Contract-parsed fields we read. Keys mirror the OnboardingProfile
 * contractParsedData JSON blob shape produced by the benefits extractor.
 * Any unknown field degrades its dependent lever to 'unknown'.
 */
export interface TaxAdvantagedContract {
  hasHSA?: boolean | null
  /** Explicit HDHP enrollment flag. When absent we fall back to hasHSA. */
  hasHDHP?: boolean | null
  /** Plan allows after-tax (non-Roth) 401k contributions. */
  allowsAfterTax401k?: boolean | null
  /** Plan allows in-service withdrawals or Roth in-plan conversions. */
  allowsInServiceRollover?: boolean | null
  /** Plan offers a Roth 401k option. */
  hasRoth401k?: boolean | null
}

// ── Output shapes ────────────────────────────────────────────────────────────

export interface IraCapacity {
  limit: number
  contributed: number
  remaining: number
  catchupEligible: boolean
}

export interface Roth401kEligibility {
  eligible: EligibilityTriState
  currentSplit: { roth: number; preTax: number } | null
  recommendedSplit: { roth: number; preTax: number }
  rationale: string
}

export interface HsaCapacity {
  eligible: EligibilityTriState
  limit: number
  contributed: number
  remaining: number | null
  reason?: string
}

export interface BackdoorRothEligibility {
  eligible: EligibilityTriState
  reason: string
  incomeAboveDirect: boolean
  /** True when income is high enough that direct Roth is phased out but not so
   *  high the user needs additional structures (for future use). */
  incomeBelowBackdoorTrap: boolean
}

export interface MegaBackdoorEligibility {
  eligible: EligibilityTriState
  reason: string
  remainingCapacity: number | null
}

export interface TaxAdvantagedBreakdown {
  ira: IraCapacity
  hsa: HsaCapacity
  roth401k: Roth401kEligibility
  backdoorRoth: BackdoorRothEligibility
  megaBackdoor: MegaBackdoorEligibility
  totalRemaining: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rothPhaseout(status: FilingStatus): { start: number; end: number } {
  return status === 'mfj' ? ROTH_PHASEOUT_MFJ : ROTH_PHASEOUT_SINGLE
}

// ── computeIraCapacity ───────────────────────────────────────────────────────

export function computeIraCapacity(profile: TaxAdvantagedProfile): IraCapacity {
  const catchupEligible = (profile.age ?? 0) >= 50
  const limit = LIMIT_IRA_BASE + (catchupEligible ? LIMIT_IRA_CATCHUP : 0)
  const contributed = Math.max(0, profile.iraContributedYtd)
  const remaining = Math.max(0, limit - contributed)
  return { limit, contributed, remaining, catchupEligible }
}

// ── computeRoth401kEligibility ───────────────────────────────────────────────

export function computeRoth401kEligibility(
  profile: TaxAdvantagedProfile,
  contract: TaxAdvantagedContract | null,
): Roth401kEligibility {
  const income = profile.annualIncome ?? 0
  // Default to a balanced baseline: 50/50 if we know nothing about income.
  let recommendedRoth = 0.5
  let rationale = 'Split contributions evenly until we learn more about your tax bracket.'
  if (income > 0) {
    if (income < 100_000) {
      recommendedRoth = 0.8
      rationale = 'Income under $100k puts you in a lower bracket today than you likely will be at retirement. Favor Roth to lock in current rates.'
    } else if (income < 180_000) {
      recommendedRoth = 0.5
      rationale = 'Mid-bracket income supports a balanced split between Roth and pre-tax to hedge future rate changes.'
    } else {
      recommendedRoth = 0.2
      rationale = 'High current bracket makes pre-tax contributions more efficient. Keep a small Roth slice for tax diversification.'
    }
  }

  const hasRoth = contract?.hasRoth401k
  let eligible: EligibilityTriState
  if (hasRoth === true) {
    eligible = 'eligible'
  } else if (hasRoth === false) {
    eligible = 'ineligible'
    rationale = 'Your plan does not offer a Roth 401k option. Direct all 401k contributions to pre-tax.'
  } else if (contract == null) {
    eligible = 'unknown'
    rationale = 'Upload your plan summary to confirm the Roth 401k option is available.'
  } else {
    // Contract present but hasRoth401k unspecified. Treat as eligible by
    // default since most modern plans offer it, with a soft caveat.
    eligible = 'eligible'
    rationale = `${rationale} Confirm your plan offers a Roth option before switching.`
  }

  const currentSplit =
    profile.current401kRothShare != null && profile.current401kRothShare >= 0
      ? {
          roth: Math.max(0, Math.min(1, profile.current401kRothShare)),
          preTax: Math.max(0, Math.min(1, 1 - profile.current401kRothShare)),
        }
      : null

  return {
    eligible,
    currentSplit,
    recommendedSplit: { roth: recommendedRoth, preTax: 1 - recommendedRoth },
    rationale,
  }
}

// ── computeHsaCapacity ───────────────────────────────────────────────────────

export function computeHsaCapacity(
  profile: TaxAdvantagedProfile,
  contract: TaxAdvantagedContract | null,
): HsaCapacity {
  const limit = profile.hsaCoverage === 'family' ? LIMIT_HSA_FAMILY : LIMIT_HSA_SELF
  const contributed = Math.max(0, profile.hsaContributedYtd)

  if (contract == null) {
    return {
      eligible: 'unknown',
      limit,
      contributed,
      remaining: null,
      reason: 'Unknown, confirm HDHP enrollment',
    }
  }

  // Prefer explicit HDHP flag. Fall back to hasHSA as a proxy: if the plan
  // offers an HSA the user is presumed enrolled in an HDHP when they opt in.
  const hdhp =
    contract.hasHDHP === true
      ? true
      : contract.hasHDHP === false
        ? false
        : contract.hasHSA === true
          ? true
          : contract.hasHSA === false
            ? false
            : null

  if (hdhp === true) {
    return {
      eligible: 'eligible',
      limit,
      contributed,
      remaining: Math.max(0, limit - contributed),
    }
  }
  if (hdhp === false) {
    return {
      eligible: 'ineligible',
      limit,
      contributed,
      remaining: 0,
      reason: 'Not eligible, requires HDHP enrollment',
    }
  }
  return {
    eligible: 'unknown',
    limit,
    contributed,
    remaining: null,
    reason: 'Unknown, confirm HDHP enrollment',
  }
}

// ── computeBackdoorRothEligibility ───────────────────────────────────────────

export function computeBackdoorRothEligibility(
  profile: TaxAdvantagedProfile,
): BackdoorRothEligibility {
  const income = profile.annualIncome ?? 0
  const phaseout = rothPhaseout(profile.filingStatus)
  const incomeAboveDirect = income >= phaseout.end
  const incomeBelowBackdoorTrap = true // Backdoor has no upper income limit.

  if (income <= 0) {
    return {
      eligible: 'unknown',
      reason: 'Add your income to see whether a backdoor is needed.',
      incomeAboveDirect: false,
      incomeBelowBackdoorTrap,
    }
  }

  if (!incomeAboveDirect) {
    return {
      eligible: 'ineligible',
      reason: 'Not needed at your income level. Contribute directly to a Roth IRA.',
      incomeAboveDirect: false,
      incomeBelowBackdoorTrap,
    }
  }

  // Pro-rata rule: any pre-tax traditional IRA balance poisons the conversion.
  if (profile.traditionalIraBalance > 0) {
    return {
      eligible: 'ineligible',
      reason: 'Blocked by pro-rata rule. Consider rolling your traditional IRA into a 401k first.',
      incomeAboveDirect: true,
      incomeBelowBackdoorTrap,
    }
  }

  return {
    eligible: 'eligible',
    reason: 'Your income is above the direct Roth phase-out and your traditional IRA balance is zero.',
    incomeAboveDirect: true,
    incomeBelowBackdoorTrap,
  }
}

// ── computeMegaBackdoorEligibility ───────────────────────────────────────────

export function computeMegaBackdoorEligibility(
  profile: TaxAdvantagedProfile,
  contract: TaxAdvantagedContract | null,
): MegaBackdoorEligibility {
  if (contract == null) {
    return {
      eligible: 'unknown',
      reason: 'Upload your plan summary to confirm after-tax contributions and in-service rollovers are available.',
      remainingCapacity: null,
    }
  }

  const allowsAfterTax = contract.allowsAfterTax401k
  const allowsRollover = contract.allowsInServiceRollover

  if (allowsAfterTax == null || allowsRollover == null) {
    return {
      eligible: 'unknown',
      reason: 'Your plan summary does not confirm after-tax contributions or in-service rollovers. Check with HR.',
      remainingCapacity: null,
    }
  }

  if (!allowsAfterTax || !allowsRollover) {
    return {
      eligible: 'ineligible',
      reason: 'Your plan does not support the mega-backdoor. Both after-tax contributions and in-service rollovers are required.',
      remainingCapacity: 0,
    }
  }

  // Remaining capacity = 415(c) total - employee elective - employer match.
  const used =
    Math.max(0, profile.employee401kContributedYtd) +
    Math.max(0, profile.employer401kContributedYtd)
  const remainingCapacity = Math.max(0, LIMIT_401K_TOTAL - used)
  return {
    eligible: 'eligible',
    reason: 'Your plan supports both after-tax contributions and in-service rollovers.',
    remainingCapacity,
  }
}

// ── Top-level breakdown ──────────────────────────────────────────────────────

export function computeTaxAdvantagedBreakdown(
  profile: TaxAdvantagedProfile,
  contract: TaxAdvantagedContract | null,
): TaxAdvantagedBreakdown {
  const ira = computeIraCapacity(profile)
  const hsa = computeHsaCapacity(profile, contract)
  const roth401k = computeRoth401kEligibility(profile, contract)
  const backdoorRoth = computeBackdoorRothEligibility(profile)
  const megaBackdoor = computeMegaBackdoorEligibility(profile, contract)

  // Total remaining counts only capacity the user can actually use this year:
  // direct IRA room, HSA when eligible, and mega-backdoor room when eligible.
  // We exclude the Roth 401k split because it is a reallocation, not new room,
  // and we exclude backdoor Roth because it uses the same IRA bucket already
  // counted above.
  let totalRemaining = ira.remaining
  if (hsa.eligible === 'eligible' && hsa.remaining != null) {
    totalRemaining += hsa.remaining
  }
  if (megaBackdoor.eligible === 'eligible' && megaBackdoor.remainingCapacity != null) {
    totalRemaining += megaBackdoor.remainingCapacity
  }

  return {
    ira,
    hsa,
    roth401k,
    backdoorRoth,
    megaBackdoor,
    totalRemaining,
  }
}

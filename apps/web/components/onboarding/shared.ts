import type { CSSProperties } from 'react'

export interface OnboardingData {
  // Step 1
  age: number | ''
  annualIncome: number
  savingsRate: number
  retirementAge: number

  locationCity: string
  locationState: string

  // Step 2
  jobTitle: string
  employer: string
  employerStartDate: string

  // Step 3
  contractParsedData: Record<string, unknown> | null
  contractUploadedAt: string | null

  // Step 4
  targetRetirementIncome: number | null
  emergencyFundMonthsTarget: number
  majorGoals: string[]
  riskTolerance: number
}

export const DEFAULTS: OnboardingData = {
  age: '',
  annualIncome: 0,
  savingsRate: 20,
  retirementAge: 65,
  locationCity: '',
  locationState: '',
  jobTitle: '',
  employer: '',
  employerStartDate: '',
  contractParsedData: null,
  contractUploadedAt: null,
  targetRetirementIncome: null,
  emergencyFundMonthsTarget: 6,
  majorGoals: [],
  riskTolerance: 3,
}

export const STEP_LABELS = [
  'Basics',
  'Employment',
  'Contract',
  'Goals',
  'Accounts',
  'Overview',
] as const

export const TOTAL_STEPS = 6

// Sub-step counts per top-level step. The orchestrator sums these to drive
// the hairline progress bar and to map (step, subIndex) to a global index.
// Steps 3 and 5 are single-screen by design (file upload; Plaid link).
export const SUB_STEP_COUNTS = [5, 3, 1, 3, 1] as const
export const TOTAL_SUB_STEPS = SUB_STEP_COUNTS.reduce((a, b) => a + b, 0)

export function globalSubIndex(step: number, subIndex: number): number {
  let sum = 0
  for (let i = 0; i < step && i < SUB_STEP_COUNTS.length; i++) {
    sum += SUB_STEP_COUNTS[i]
  }
  return sum + subIndex
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

// Compound growth assuming a constant 7% real annual return, contributions
// made monthly, with contributions = salary * savingsRate. Same future-value
// formula used across the reveal and the live projection.
export function projectWealth(
  age: number,
  salary: number,
  savingsRatePct: number,
  retirementAge: number,
): number {
  const years = Math.max(0, retirementAge - age)
  const months = years * 12
  const monthlyContribution = (salary * (savingsRatePct / 100)) / 12
  if (months <= 0 || monthlyContribution <= 0) return 0
  const r = 0.07 / 12
  return monthlyContribution * ((Math.pow(1 + r, months) - 1) / r)
}

// Target savings rate used to compute the gap-vs-target opportunity cost.
// Kept as a percent (20 = 20%) to match the rest of the codebase's convention.
export const DEFAULT_TARGET_SAVINGS_RATE = 20

// Required nest egg for a given retirement income. Uses the standard 4%
// withdrawal rule to back into a principal number.
export function requiredNestEgg(targetAnnualIncome: number): number {
  if (targetAnnualIncome <= 0) return 0
  return targetAnnualIncome / 0.04
}

// Value of one year of contributions at the given rate, compounded to
// retirement. Represents "what delaying your start by one year costs you" at
// that rate. Used by Step6Reveal's headline figure.
export function oneYearDelayCost(
  age: number,
  salary: number,
  savingsRatePct: number,
  retirementAge: number,
): number {
  if (!age || !salary || !savingsRatePct || !retirementAge || retirementAge <= age) {
    return 0
  }
  const now = projectWealth(age, salary, savingsRatePct, retirementAge)
  const delayed = projectWealth(age + 1, salary, savingsRatePct, retirementAge)
  return Math.max(0, now - delayed)
}

// Gap between the user's current trajectory and a target savings rate. Zero
// when the user is already at or above the target. Surfaced as the onboarding
// "cost of doing nothing" number.
export function opportunityCostOneYear(
  age: number,
  salary: number,
  savingsRatePct: number,
  retirementAge: number,
  targetRatePct: number = DEFAULT_TARGET_SAVINGS_RATE,
): number {
  if (!age || !salary || !retirementAge || retirementAge <= age) return 0
  if (savingsRatePct >= targetRatePct) return 0
  const target = projectWealth(age, salary, targetRatePct, retirementAge)
  const current = projectWealth(age, salary, savingsRatePct, retirementAge)
  return Math.max(0, target - current)
}

// ── Typography tokens ──────────────────────────────────────────────────────
// The visual language is Apple Pro pages crossed with institutional finance.
// Large DM Serif Display questions, restrained Geist body, DM Mono for all
// numerical values. Never hardcode hex: every color via CSS var.

// Large serif question ("How old are you?"). Used above every sub-step's
// input. Scales down on mobile via a secondary style below.
export const questionHeading: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(28px, 4.8vw, 48px)',
  fontWeight: 300,
  color: 'var(--color-text)',
  lineHeight: 1.12,
  letterSpacing: '-0.01em',
  margin: 0,
  textAlign: 'left',
  maxWidth: '620px',
}

// One-sentence declarative context below the input. Short. Geist, not mono.
export const contextCopy: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '15px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  letterSpacing: '0.005em',
  margin: 0,
  maxWidth: '520px',
}

// Legacy heading kept for Step 3 and anywhere the old centered style is still
// referenced. New screens should use questionHeading.
export const heading: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '36px',
  fontWeight: 300,
  color: 'var(--color-text)',
  lineHeight: 1.2,
  marginBottom: '14px',
  textAlign: 'center',
}

export const body: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.65,
  letterSpacing: '0.005em',
  textAlign: 'center',
  margin: 0,
}

export const helperText: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  lineHeight: 1.55,
  marginTop: '8px',
}

export const label: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginBottom: '10px',
  display: 'block',
  fontWeight: 500,
}

export const muted: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 500,
}

// Primary Continue button. Gold fill, 44px min touch-target, Geist sans. Used
// for forward advance on every sub-step.
export const continueBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  minHeight: '44px',
  padding: '12px 34px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-surface)',
  fontSize: '13px',
  fontFamily: 'var(--font-sans)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  cursor: 'pointer',
}

// Outlined gold variant used by WelcomeIntro's Begin button and by the reveal
// secondary CTA. Understated on purpose.
export const outlineBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  minHeight: '44px',
  padding: '12px 34px',
  backgroundColor: 'transparent',
  border: '1px solid var(--color-gold)',
  borderRadius: '2px',
  color: 'var(--color-gold)',
  fontSize: '13px',
  fontFamily: 'var(--font-sans)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  cursor: 'pointer',
}

// "Skip for now" muted text, still meets 44px tap target.
export const secondaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '44px',
  padding: '10px 20px',
  background: 'transparent',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-text-muted)',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 500,
  cursor: 'pointer',
}

// Large input used on every question sub-step. 56px tall on desktop; still
// reads at 44px on mobile. Mono keeps numbers stable-width. Generous padding.
export const textInput: CSSProperties = {
  width: '100%',
  minHeight: '56px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--color-border)',
  borderRadius: '2px',
  padding: '14px 16px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '18px',
  letterSpacing: '0.01em',
  outline: 'none',
}

export const precisionCta =
  'The more you share, the more precise your opportunity cost and recommendations get.'

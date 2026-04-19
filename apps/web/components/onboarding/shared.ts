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
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.7,
  letterSpacing: '0.02em',
  textAlign: 'center',
}

export const helperText: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10.5px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.06em',
  lineHeight: 1.5,
  marginTop: '6px',
}

export const label: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--color-text-mid)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginBottom: '10px',
  display: 'block',
}

export const muted: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

export const continueBtn: CSSProperties = {
  display: 'inline-block',
  padding: '13px 36px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-surface)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 500,
  cursor: 'pointer',
}

export const secondaryBtn: CSSProperties = {
  display: 'inline-block',
  padding: '10px 22px',
  background: 'transparent',
  border: '1px solid var(--color-border)',
  borderRadius: '2px',
  color: 'var(--color-text-muted)',
  fontSize: '10.5px',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 500,
  cursor: 'pointer',
}

export const textInput: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid var(--color-border)',
  borderRadius: '2px',
  padding: '12px 14px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '14px',
  letterSpacing: '0.02em',
  outline: 'none',
}

export const precisionCta =
  'The more you share, the more precise your opportunity cost and recommendations get.'

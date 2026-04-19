'use client'

import HeroShell from './HeroShell'

interface Props {
  annualInterestCost: number
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))
}

export default function HeroDebtDominant({ annualInterestCost }: Props) {
  // TODO(phase2): point at a real debt-payoff page when it exists. For now the
  // opportunity cost page is the closest existing artifact.
  const ctaHref = '/dashboard/opportunity'
  return (
    <HeroShell
      eyebrow="Pay this down first"
      headline={`Your debt is costing you ${fmt(annualInterestCost)}/year in interest.`}
      subtitle="Pay this down before anything else. Every dollar earns you your APR back."
      bigNumberLabel="Annual interest cost"
      bigNumber={`${fmt(annualInterestCost)}/yr`}
      ctaLabel="See payoff plan"
      ctaHref={ctaHref}
      tone="alert"
    />
  )
}

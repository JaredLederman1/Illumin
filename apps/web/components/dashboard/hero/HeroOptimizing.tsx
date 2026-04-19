'use client'

import HeroShell from './HeroShell'

interface Props {
  remainingTaxAdvantagedCapacity: number
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))
}

export default function HeroOptimizing({
  remainingTaxAdvantagedCapacity,
}: Props) {
  return (
    <HeroShell
      eyebrow="Next dollar, next tier"
      headline="Your next dollar matters."
      subtitle="You have captured the easy wins. These optimizations are where real wealth is built."
      bigNumberLabel="Tax-advantaged room remaining"
      bigNumber={fmt(remainingTaxAdvantagedCapacity)}
      ctaLabel="See optimizations"
      ctaHref="/dashboard/checklist"
    />
  )
}

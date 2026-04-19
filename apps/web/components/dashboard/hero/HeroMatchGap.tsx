'use client'

import HeroShell from './HeroShell'

interface Props {
  annualMatchGap: number
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))
}

export default function HeroMatchGap({ annualMatchGap }: Props) {
  return (
    <HeroShell
      eyebrow="Free money on the table"
      headline={`You are leaving ${fmt(annualMatchGap)}/year on the table.`}
      subtitle="Your employer will match more than you are contributing. This is the closest thing to free money."
      bigNumberLabel="Annual match gap"
      bigNumber={`${fmt(annualMatchGap)}/yr`}
      ctaLabel="Close the gap"
      ctaHref="/dashboard/checklist"
      tone="alert"
    />
  )
}

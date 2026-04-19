'use client'

import HeroShell from './HeroShell'

interface Props {
  netWorth: number
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

export default function HeroOptimized({ netWorth }: Props) {
  return (
    <HeroShell
      eyebrow="Strong footing"
      headline="You are doing this right."
      subtitle="Your foundation, match, and allocation are all in good shape. These are the next frontiers."
      bigNumberLabel="Current net worth"
      bigNumber={fmt(netWorth)}
      ctaLabel="Advanced strategies"
      ctaHref="/dashboard/checklist"
      tone="positive"
    />
  )
}

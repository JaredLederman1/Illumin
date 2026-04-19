'use client'

import HeroShell from './HeroShell'

interface Props {
  top3DiscretionaryShare: number
}

export default function HeroSpendingLeak({ top3DiscretionaryShare }: Props) {
  const pct = Math.round(
    Math.max(0, Math.min(1, top3DiscretionaryShare)) * 100,
  )
  return (
    <HeroShell
      eyebrow="The quiet leak"
      headline="You save well. You could save more."
      subtitle={`Your top 3 discretionary categories are consuming ${pct}% of your variable spend. Each dollar redirected compounds.`}
      bigNumberLabel="Top 3 discretionary share"
      bigNumber={`${pct}%`}
      ctaLabel="See where it goes"
      ctaHref="/dashboard/transactions"
    />
  )
}

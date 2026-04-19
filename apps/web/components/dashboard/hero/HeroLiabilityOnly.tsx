'use client'

import HeroShell from './HeroShell'

export default function HeroLiabilityOnly() {
  return (
    <HeroShell
      eyebrow="Half the picture"
      headline="Link a bank or investment account."
      subtitle="Illumin needs at least one checking, savings, or investment account to see your full picture."
      ctaLabel="Link account"
      ctaHref="/dashboard/accounts"
    />
  )
}

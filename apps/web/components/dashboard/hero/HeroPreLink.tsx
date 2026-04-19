'use client'

import HeroShell from './HeroShell'

export default function HeroPreLink() {
  return (
    <HeroShell
      eyebrow="Start here"
      headline="Your dashboard is waiting."
      subtitle="Link your first account to see exactly how much money you are leaving on the table."
      ctaLabel="Link an account"
      ctaHref="/dashboard/accounts"
    />
  )
}

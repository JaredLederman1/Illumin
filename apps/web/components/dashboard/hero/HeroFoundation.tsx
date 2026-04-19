'use client'

import HeroShell from './HeroShell'

interface Props {
  emergencyFundMonths: number
  emergencyFundTargetMonths: number
}

export default function HeroFoundation({
  emergencyFundMonths,
  emergencyFundTargetMonths,
}: Props) {
  const months = Number.isFinite(emergencyFundMonths) ? emergencyFundMonths : 0
  const target = emergencyFundTargetMonths || 6
  return (
    <HeroShell
      eyebrow="Build your base"
      headline="Build your foundation."
      subtitle={`A ${target}-month emergency fund and your first 401k dollar are the highest-impact moves you can make right now.`}
      bigNumberLabel="Emergency fund coverage"
      bigNumber={`${months.toFixed(1)} / ${target}`}
      ctaLabel="See my first steps"
      ctaHref="/dashboard/checklist"
    />
  )
}

'use client'

import WidgetCard from '../widgets/WidgetCard'
import MetricDisplay from '../widgets/MetricDisplay'

interface Props {
  projectedRetirementNetWorth: number | null
  netWorth: number | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n))

export default function WealthTrajectoryCard({
  projectedRetirementNetWorth,
  netWorth,
}: Props) {
  return (
    <WidgetCard
      label="Wealth trajectory"
      title="Projected net worth"
      subtitle="Assumes 6% real return and your current savings rate. Sensitivity controls land in the next release."
      comingSoon
      accent="positive"
    >
      <MetricDisplay
        value={
          projectedRetirementNetWorth != null
            ? fmt(projectedRetirementNetWorth)
            : '—'
        }
        label="At retirement age"
        tone="positive"
      />
      {netWorth != null && (
        <MetricDisplay
          value={fmt(netWorth)}
          label="Net worth today"
          size="md"
        />
      )}
    </WidgetCard>
  )
}

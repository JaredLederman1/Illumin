'use client'

import WidgetCard from '../widgets/WidgetCard'
import MetricDisplay from '../widgets/MetricDisplay'

interface Props {
  concentrationPct: number | null
  topCategories: { category: string; amount: number }[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

export default function CategoryConcentrationCard({
  concentrationPct,
  topCategories,
}: Props) {
  const pct =
    concentrationPct != null
      ? Math.round(Math.max(0, Math.min(1, concentrationPct)) * 100)
      : null
  return (
    <WidgetCard
      label="Spending concentration"
      title="Where your variable dollars go"
      subtitle="Your top three discretionary categories relative to total variable spend."
    >
      <MetricDisplay
        value={pct != null ? `${pct}%` : '—'}
        label="Top 3 share of variable spend"
      />
      {topCategories.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '6px',
          }}
        >
          {topCategories.map(c => (
            <div
              key={c.category}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-text-mid)',
              }}
            >
              <span>{c.category}</span>
              <span>{fmt(c.amount)}/mo</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}

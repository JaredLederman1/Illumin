'use client'

import { CSSProperties } from 'react'
import WidgetCard from '../widgets/WidgetCard'

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

const catRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
}

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
      variant="metric"
      eyebrow="Spending concentration"
      columns={[
        { caption: 'Top 3 share of variable spend', hero: pct != null ? `${pct}%` : '—' },
      ]}
      secondary={
        topCategories.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topCategories.map(c => (
              <div key={c.category} style={catRow}>
                <span>{c.category}</span>
                <span>{fmt(c.amount)}/mo</span>
              </div>
            ))}
          </div>
        ) : null
      }
    />
  )
}

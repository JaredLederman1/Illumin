'use client'

import { CSSProperties } from 'react'
import WidgetCard from '../widgets/WidgetCard'

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

const secondaryLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '4px',
}

const secondaryValue: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '20px',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.1,
  margin: 0,
}

const copy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
}

export default function WealthTrajectoryCard({
  projectedRetirementNetWorth,
  netWorth,
}: Props) {
  const hero =
    projectedRetirementNetWorth != null ? fmt(projectedRetirementNetWorth) : '—'

  return (
    <WidgetCard
      variant="metric"
      eyebrow="Wealth trajectory"
      accent="positive"
      columns={[
        { caption: 'At retirement age', hero, heroColor: 'var(--color-positive)' },
      ]}
      secondary={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {netWorth != null && (
            <div>
              <p style={secondaryLabel}>Net worth today</p>
              <p style={secondaryValue}>{fmt(netWorth)}</p>
            </div>
          )}
          <p style={copy}>
            Assumes 6% real return and your current savings rate. Sensitivity controls land in the next release.
          </p>
        </div>
      }
    />
  )
}

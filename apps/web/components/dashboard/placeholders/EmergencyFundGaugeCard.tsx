'use client'

import { CSSProperties } from 'react'
import WidgetCard from '../widgets/WidgetCard'

interface Props {
  months: number | null
  target: number | null
}

const copy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
}

export default function EmergencyFundGaugeCard({ months, target }: Props) {
  const t = target && target > 0 ? target : 6
  const m = months ?? 0
  const pct = Math.min(100, Math.round((m / t) * 100))
  const hero = months != null ? `${m.toFixed(1)} / ${t}` : '—'
  return (
    <WidgetCard
      variant="metric"
      eyebrow="Emergency fund"
      columns={[{ caption: 'Months of coverage', hero }]}
      secondary={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              height: '4px',
              width: '100%',
              backgroundColor: 'var(--color-gold-subtle)',
              borderRadius: 'var(--radius-pill)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                backgroundColor: 'var(--color-gold)',
              }}
            />
          </div>
          <p style={copy}>Target {t} months of essential expenses. You are {pct}% of the way there.</p>
        </div>
      }
    />
  )
}

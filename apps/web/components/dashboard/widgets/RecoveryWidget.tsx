'use client'

import Link from 'next/link'
import { useRecoveryQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))
}

export default function RecoveryWidget() {
  const { data } = useRecoveryQuery()
  const open = data?.open ?? null
  const recovered = data?.recovered ?? null
  const openCount = data?.gaps.filter(g => g.status === 'open').length ?? 0

  return (
    <WidgetCard label="Recovery counter" title="Still on the table">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '32px',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: 'var(--color-negative)',
            }}
          >
            {open != null ? fmt(open) : '—'}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-text-mid)',
            }}
          >
            Recovered: {recovered != null ? fmt(recovered) : '—'}
          </span>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-mid)',
            margin: 0,
          }}
        >
          {openCount === 0
            ? 'No open gaps detected.'
            : openCount === 1
              ? '1 open gap'
              : `${openCount} open gaps`}
        </p>

        <Link
          href="/dashboard/recovery"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: 'var(--color-gold)',
            textDecoration: 'none',
            marginTop: 'auto',
            alignSelf: 'flex-start',
          }}
        >
          Open recovery &rarr;
        </Link>
      </div>
    </WidgetCard>
  )
}

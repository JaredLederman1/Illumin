'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import type { TaxAdvantagedBreakdown } from '@/lib/dashboardState'
import WidgetCard from '../widgets/WidgetCard'

interface Props {
  breakdown: TaxAdvantagedBreakdown | null
}

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

// The priority row only has the tax-advantaged breakdown, not a standalone
// 401(k) employee-deferral remaining dollar figure. Use the mega-backdoor
// after-tax room as the 401(k) cell when the plan supports it, since that is
// the only 401(k) dollar headroom the breakdown currently surfaces. When it's
// not available (ineligible or unknown plan), show a dash instead of making a
// number up.
function render401kRemaining(breakdown: TaxAdvantagedBreakdown): string {
  if (
    breakdown.megaBackdoor.eligible === 'eligible' &&
    breakdown.megaBackdoor.remainingCapacity != null
  ) {
    return fmtUsd(breakdown.megaBackdoor.remainingCapacity)
  }
  return '—'
}

// TODO: point the CTA at a dedicated tax-advantaged planner page when one
// exists. /dashboard/accounts is a placeholder destination.
const PLANNER_HREF = '/dashboard/accounts'

const triad: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '14px',
}

const triadLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '4px',
}

const triadValue: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '16px',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.2,
  margin: 0,
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const copy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
}

export default function TaxAdvantagedCapacityCard({ breakdown }: Props) {
  if (!breakdown) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Tax-advantaged capacity"
        columns={[{ caption: 'No contribution data yet', hero: '—' }]}
        secondary={
          <p style={copy}>
            Link a retirement account to see how much room is still available this year.
          </p>
        }
        cta={
          <Link href="/dashboard/accounts" style={ctaLink}>
            Link an account &rarr;
          </Link>
        }
      />
    )
  }

  const iraRemaining = breakdown.ira.remaining
  const hsaRemaining =
    breakdown.hsa.eligible === 'eligible' && breakdown.hsa.remaining != null
      ? fmtUsd(breakdown.hsa.remaining)
      : '—'
  const k401Remaining = render401kRemaining(breakdown)
  const totalRemaining = breakdown.totalRemaining

  return (
    <WidgetCard
      variant="metric"
      eyebrow="Tax-advantaged capacity"
      columns={[{ caption: 'Total room remaining', hero: fmtUsd(totalRemaining) }]}
      secondary={
        <div style={triad}>
          <div>
            <p style={triadLabel}>IRA</p>
            <p style={triadValue}>{fmtUsd(iraRemaining)}</p>
          </div>
          <div>
            <p style={triadLabel}>401(k)</p>
            <p style={triadValue}>{k401Remaining}</p>
          </div>
          <div>
            <p style={triadLabel}>HSA</p>
            <p style={triadValue}>{hsaRemaining}</p>
          </div>
        </div>
      }
      cta={
        <Link href={PLANNER_HREF} style={ctaLink}>
          Plan contributions &rarr;
        </Link>
      }
    />
  )
}

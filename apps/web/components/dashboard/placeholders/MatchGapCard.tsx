'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import WidgetCard from '../widgets/WidgetCard'
import type { MatchDetail } from '@/lib/dashboardState'

interface Props {
  matchGapAnnual: number | null
  totalMatchAnnual: number | null
  matchCapturedAnnual: number | null
  matchDetail: MatchDetail | null
}

const fmtDollars = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

const copy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.6,
  margin: 0,
}

const strongMono: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

export default function MatchGapCard({ matchGapAnnual, matchDetail }: Props) {
  const hasDetail =
    !!matchDetail && !!matchDetail.matchFormula && matchDetail.salary > 0

  if (!hasDetail) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="401(k) match gap"
        columns={[{ caption: 'Upload your offer letter', hero: '—' }]}
        secondary={
          <p style={copy}>
            Illumin needs your match formula to size the gap. Two fields, one upload.
          </p>
        }
        cta={
          <Link href="/dashboard/benefits" style={ctaLink}>
            Close the gap &rarr;
          </Link>
        }
      />
    )
  }

  const atCap =
    matchDetail!.currentEmployeeRate >= matchDetail!.matchFormula!.matchCap
  const gap = matchGapAnnual ?? 0
  const compoundedOpportunity = atCap
    ? matchDetail!.compoundedProjection.valueFromEmployerMatch
    : matchDetail!.compoundedProjection.valueLostToGap

  const primaryColor = atCap
    ? 'var(--color-positive)'
    : 'var(--color-negative)'

  const primaryDisplay = atCap
    ? fmtDollars(matchDetail!.compoundedProjection.valueFromEmployerMatch / Math.max(1, matchDetail!.yearsToRetirement))
    : fmtDollars(gap)

  const primaryLine = atCap
    ? 'Annual match captured'
    : 'Annual match left on the table'

  const compoundedLine = atCap
    ? 'Compounded to retirement: '
    : 'Compounded to retirement, that is: '

  return (
    <WidgetCard
      variant="metric"
      eyebrow="401(k) match gap"
      accent={atCap ? 'positive' : 'alert'}
      columns={[{ caption: primaryLine, hero: primaryDisplay, heroColor: primaryColor }]}
      secondary={
        <p style={copy}>
          {compoundedLine}
          <span style={{ ...strongMono, color: atCap ? 'var(--color-positive)' : 'var(--color-negative)' }}>
            {fmtDollars(compoundedOpportunity)}
          </span>
          .{' '}
          {atCap
            ? 'Keep your contribution rate at the full match to preserve this.'
            : 'Raise your contribution to the full match cap to close it.'}
        </p>
      }
      cta={
        <Link href="/dashboard/benefits" style={ctaLink}>
          Close the gap &rarr;
        </Link>
      }
    />
  )
}

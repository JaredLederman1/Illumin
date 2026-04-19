'use client'

import { CSSProperties, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import WidgetCard from '../widgets/WidgetCard'
import type { MatchDetail } from '@/lib/dashboardState'
import {
  computeMatchDollars,
  projectMatchCompounded,
  PROVIDER_GUIDES,
  GENERIC_GUIDE,
  type SupportedProvider,
} from '@/lib/matchProjection'

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

const fmtPct = (f: number) => {
  const v = Math.round(f * 1000) / 10
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`
}

const SLIDER_MIN = 0
const SLIDER_MAX = 20
const TICK_STOPS = [3, 6, 10, 15]

const monoNumberStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '-0.01em',
  margin: 0,
  lineHeight: 1.05,
}

const pStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.6,
  margin: 0,
}

const strongMono: CSSProperties = {
  ...pStyle,
  color: 'var(--color-text)',
}

const projectionCardStyle: CSSProperties = {
  marginTop: '4px',
  padding: '14px 16px',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  backgroundColor: 'var(--color-gold-subtle)',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const projectionRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const ctaButtonStyle: CSSProperties = {
  marginTop: '4px',
  alignSelf: 'flex-start',
  padding: '10px 16px',
  border: '1px solid var(--color-gold)',
  backgroundColor: 'transparent',
  color: 'var(--color-gold)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

const drawerOverlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(8,11,15,0.72)',
  display: 'flex',
  justifyContent: 'flex-end',
  zIndex: 100,
}

const drawerPanel: CSSProperties = {
  width: 'min(420px, 100vw)',
  height: '100%',
  backgroundColor: 'var(--color-surface)',
  borderLeft: '1px solid var(--color-gold-border)',
  padding: '28px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

function Slider({
  pct,
  setPct,
  capPct,
  initialPct,
}: {
  pct: number
  setPct: (n: number) => void
  capPct: number
  initialPct: number
}) {
  const sliderId = useId()
  const leftFor = (v: number) =>
    `${((v - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label
        htmlFor={sliderId}
        style={{
          ...pStyle,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
        }}
      >
        Your contribution rate
      </label>
      <div style={{ position: 'relative', height: '36px' }}>
        <input
          id={sliderId}
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1}
          value={pct}
          onChange={e => setPct(Number(e.target.value))}
          aria-label="Contribution rate"
          aria-valuemin={SLIDER_MIN}
          aria-valuemax={SLIDER_MAX}
          aria-valuenow={pct}
          aria-valuetext={`${pct} percent of salary`}
          style={{
            width: '100%',
            position: 'absolute',
            top: '14px',
            left: 0,
            background: `linear-gradient(to right, var(--color-gold) 0%, var(--color-gold) ${leftFor(
              pct,
            )}, var(--color-gold-subtle) ${leftFor(pct)}, var(--color-gold-subtle) 100%)`,
          }}
        />
        {/* Cap marker */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '6px',
            left: leftFor(capPct),
            transform: 'translateX(-50%)',
            width: '1px',
            height: '18px',
            backgroundColor: 'var(--color-positive)',
            opacity: 0.7,
          }}
        />
        {/* Current-rate marker */}
        <div
          aria-hidden
          title="Your current contribution rate"
          style={{
            position: 'absolute',
            top: '6px',
            left: leftFor(initialPct),
            transform: 'translateX(-50%)',
            width: '1px',
            height: '18px',
            backgroundColor: 'var(--color-text-mid)',
            opacity: 0.5,
          }}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: 'relative',
          height: '14px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
        }}
      >
        {TICK_STOPS.map(t => (
          <span
            key={t}
            style={{
              position: 'absolute',
              left: leftFor(t),
              transform: 'translateX(-50%)',
            }}
          >
            {t}%
          </span>
        ))}
      </div>
    </div>
  )
}

function ProviderDrawer({
  provider,
  onClose,
}: {
  provider: SupportedProvider | null
  onClose: () => void
}) {
  const steps = provider ? PROVIDER_GUIDES[provider] : GENERIC_GUIDE
  const title = provider
    ? `Update your contribution at ${provider}`
    : 'Update your contribution rate'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={drawerOverlay}
      onClick={onClose}
    >
      <div style={drawerPanel} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              margin: 0,
              color: 'var(--color-text)',
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close provider guide"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-mid)',
              padding: '6px 10px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.14em',
            }}
          >
            Close
          </button>
        </div>
        <p style={pStyle}>
          Raise your rate to at least the full match cap. A one-time change, a lifetime of extra dollars.
        </p>
        <ol
          style={{
            margin: 0,
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text)',
            lineHeight: 1.6,
          }}
        >
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {!provider && (
          <p style={{ ...pStyle, color: 'var(--color-text-muted)' }}>
            We could not confidently match a known provider to your linked 401k. These steps apply to most plans.
          </p>
        )}
      </div>
    </div>
  )
}

export default function MatchGapCard({ matchDetail }: Props) {
  const hasDetail =
    !!matchDetail && !!matchDetail.matchFormula && matchDetail.salary > 0

  // Safe defaults so hooks run in a stable order whether or not we have detail.
  const salary = hasDetail ? matchDetail!.salary : 0
  const currentEmployeeRate = hasDetail ? matchDetail!.currentEmployeeRate : 0
  const matchRateVal = hasDetail ? matchDetail!.matchFormula!.matchRate : 0
  const matchCapVal = hasDetail ? matchDetail!.matchFormula!.matchCap : 0
  const yearsToRetirement = hasDetail ? matchDetail!.yearsToRetirement : 0

  const initialPct = Math.max(
    SLIDER_MIN,
    Math.min(SLIDER_MAX, Math.round(currentEmployeeRate * 100)),
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pct, setPct] = useState<number>(initialPct)

  const rate = pct / 100
  const liveDollars = useMemo(
    () =>
      hasDetail
        ? computeMatchDollars(salary, rate, {
            matchRate: matchRateVal,
            matchCap: matchCapVal,
          })
        : { employeeContrib: 0, employerMatch: 0, total: 0, gapIfAny: 0 },
    [hasDetail, salary, rate, matchRateVal, matchCapVal],
  )
  const liveProjection = useMemo(
    () =>
      hasDetail
        ? projectMatchCompounded(
            salary,
            rate,
            { matchRate: matchRateVal, matchCap: matchCapVal },
            yearsToRetirement,
          )
        : {
            projectedValue: 0,
            valueFromEmployerMatch: 0,
            valueLostToGap: 0,
          },
    [hasDetail, salary, rate, matchRateVal, matchCapVal, yearsToRetirement],
  )

  if (!hasDetail) {
    return (
      <WidgetCard
        label="Your 401k match"
        title="Upload your offer letter"
        subtitle="We need your match formula to size the gap. Two fields, one upload."
      >
        <p style={pStyle}>
          Upload your offer letter and we will find the match rate, the cap, and the dollars you are leaving on the table.
        </p>
        <Link
          href="/onboarding"
          aria-label="Upload your offer letter to unlock match gap"
          style={{
            ...ctaButtonStyle,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Upload offer letter
        </Link>
      </WidgetCard>
    )
  }

  const matchProviderInferred = matchDetail!.matchProviderInferred
  const fullMatchProjection = matchDetail!.fullMatchProjection
  const cap = matchCapVal

  const atCap = rate >= cap
  const subtitle = atCap
    ? 'You are capturing the full match.'
    : 'You are leaving this on the table every year.'

  const primaryDisplay = atCap
    ? `${fmtDollars(liveDollars.employerMatch)}/yr`
    : `${fmtDollars(liveDollars.gapIfAny)}/yr`
  const primaryLabel = atCap ? 'Annual match captured' : 'Annual match gap'

  const ctaLabel = matchProviderInferred
    ? `Update your contribution at ${matchProviderInferred}`
    : 'Update your contribution rate'

  return (
    <>
      <WidgetCard
        label="Your 401k match"
        title="Match gap, sized and priced"
        subtitle={subtitle}
        accent={atCap ? 'positive' : 'alert'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              margin: 0,
            }}
          >
            {primaryLabel}
          </p>
          <p
            style={{
              ...monoNumberStyle,
              fontSize: '32px',
              color: atCap
                ? 'var(--color-positive)'
                : 'var(--color-negative)',
            }}
          >
            {primaryDisplay}
          </p>
        </div>

        <Slider
          pct={pct}
          setPct={setPct}
          capPct={Math.min(SLIDER_MAX, Math.round(cap * 100))}
          initialPct={initialPct}
        />

        <p style={strongMono}>
          At <span style={{ color: 'var(--color-text)' }}>{fmtPct(rate)}</span>,
          your employer matches{' '}
          <span style={{ color: 'var(--color-text)' }}>
            {fmtDollars(liveDollars.employerMatch)}
          </span>
          .{' '}
          {atCap ? (
            <span style={{ color: 'var(--color-positive)' }}>
              Nothing left on the table.
            </span>
          ) : (
            <>
              You leave{' '}
              <span style={{ color: 'var(--color-negative)' }}>
                {fmtDollars(liveDollars.gapIfAny)}
              </span>{' '}
              on the table.
            </>
          )}
        </p>

        <div style={projectionCardStyle}>
          <p
            style={{
              ...pStyle,
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            Over{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {yearsToRetirement}
            </span>{' '}
            years, compounded at 6%
          </p>
          <div style={projectionRowStyle}>
            <p style={pStyle}>At your current rate, the match adds</p>
            <p
              style={{
                ...monoNumberStyle,
                fontSize: '22px',
                color: 'var(--color-text)',
              }}
            >
              {fmtDollars(liveProjection.valueFromEmployerMatch)}
            </p>
          </div>
          <div style={projectionRowStyle}>
            <p style={pStyle}>At the full match rate, it would add</p>
            <p
              style={{
                ...monoNumberStyle,
                fontSize: '22px',
                color: atCap ? 'var(--color-positive)' : 'var(--color-gold)',
              }}
            >
              {fmtDollars(fullMatchProjection.valueFromEmployerMatch)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={ctaLabel}
          style={ctaButtonStyle}
        >
          {ctaLabel}
        </button>
      </WidgetCard>

      {drawerOpen && (
        <ProviderDrawer
          provider={matchProviderInferred}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  )
}

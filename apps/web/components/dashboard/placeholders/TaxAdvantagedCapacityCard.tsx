'use client'

import { CSSProperties, useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TaxAdvantagedBreakdown } from '@/lib/dashboardState'
import WidgetCard from '../widgets/WidgetCard'

interface Props {
  breakdown: TaxAdvantagedBreakdown | null
}

// ── Formatting ─────────────────────────────────────────────────────────────

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

const fmtPct = (n: number) => `${Math.round(n * 100)}%`

// ── Shared styles ──────────────────────────────────────────────────────────

const primaryMetric: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '32px',
  lineHeight: 1.1,
  letterSpacing: '-0.01em',
  color: 'var(--color-text)',
  margin: 0,
}

const primaryLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  margin: 0,
}

const rowWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  borderTop: '1px solid var(--color-gold-border)',
  paddingTop: '14px',
}

const rowButton: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '2px 0',
  width: '100%',
  outline: 'none',
}

const rowHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '12px',
  flexWrap: 'wrap',
}

const rowLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--color-text-mid)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  margin: 0,
}

const rowValue: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '14px',
  color: 'var(--color-text)',
  margin: 0,
  letterSpacing: '-0.01em',
}

const rowStatus: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  margin: 0,
  lineHeight: 1.5,
}

const badge: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '9px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-gold)',
  border: '1px solid var(--color-gold-border)',
  padding: '2px 6px',
  borderRadius: '2px',
}

const learnButton: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-gold)',
  outline: 'none',
}

const learnBox: CSSProperties = {
  backgroundColor: 'var(--color-gold-subtle)',
  border: '1px solid var(--color-gold-border)',
  padding: '10px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.5,
  borderRadius: '2px',
}

const expandedBox: CSSProperties = {
  backgroundColor: 'var(--color-surface-2)',
  border: '1px solid var(--color-gold-border)',
  padding: '10px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text)',
  lineHeight: 1.5,
  borderRadius: '2px',
}

// ── Primitives ─────────────────────────────────────────────────────────────

function ProgressBar({
  contributed,
  limit,
  ariaLabel,
  muted = false,
}: {
  contributed: number
  limit: number
  ariaLabel: string
  muted?: boolean
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((contributed / limit) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${fmtUsd(contributed)} of ${fmtUsd(limit)}`}
      style={{
        height: '4px',
        width: '100%',
        backgroundColor: 'var(--color-gold-subtle)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: muted ? 'var(--color-text-muted)' : 'var(--color-gold)',
          transition: 'width 240ms ease-out',
        }}
      />
    </div>
  )
}

function SplitBar({
  rothShare,
  ariaLabel,
}: {
  rothShare: number
  ariaLabel: string
}) {
  const rothPct = Math.max(0, Math.min(100, Math.round(rothShare * 100)))
  return (
    <div
      role="img"
      aria-label={`${ariaLabel}: ${rothPct}% Roth, ${100 - rothPct}% pre-tax`}
      style={{
        display: 'flex',
        height: '4px',
        width: '100%',
        borderRadius: '2px',
        overflow: 'hidden',
        border: '1px solid var(--color-gold-border)',
      }}
    >
      <div style={{ width: `${rothPct}%`, backgroundColor: 'var(--color-gold)' }} />
      <div
        style={{
          width: `${100 - rothPct}%`,
          backgroundColor: 'var(--color-text-muted)',
          opacity: 0.6,
        }}
      />
    </div>
  )
}

interface RowProps {
  id: string
  label: string
  valueSlot?: React.ReactNode
  badgeText?: string
  statusSlot: React.ReactNode
  learn: string
  expandedContent: React.ReactNode
  expanded: boolean
  learnOpen: boolean
  onToggleExpanded: () => void
  onToggleLearn: () => void
}

function BreakdownRow({
  id,
  label,
  valueSlot,
  badgeText,
  statusSlot,
  learn,
  expandedContent,
  expanded,
  learnOpen,
  onToggleExpanded,
  onToggleLearn,
}: RowProps) {
  const contentId = `${id}-content`
  const learnId = `${id}-learn`
  return (
    <div style={rowWrap}>
      <button
        type="button"
        style={rowButton}
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={`${label} breakdown. ${expanded ? 'Hide' : 'Show'} next steps.`}
      >
        <div style={rowHeader}>
          <p style={rowLabel}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {badgeText && <span style={badge}>{badgeText}</span>}
            {valueSlot}
          </div>
        </div>
        {statusSlot}
      </button>
      <button
        type="button"
        style={learnButton}
        onClick={onToggleLearn}
        aria-expanded={learnOpen}
        aria-controls={learnId}
        aria-label={`${learnOpen ? 'Hide' : 'Show'} explanation of ${label}`}
      >
        {learnOpen ? 'Hide explanation' : 'Learn'}
      </button>
      <AnimatePresence initial={false}>
        {learnOpen && (
          <motion.div
            id={learnId}
            key="learn"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={learnBox}>{learn}</div>
          </motion.div>
        )}
        {expanded && (
          <motion.div
            id={contentId}
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={expandedBox}>{expandedContent}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main card ──────────────────────────────────────────────────────────────

export default function TaxAdvantagedCapacityCard({ breakdown }: Props) {
  const base = useId()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [learnOpen, setLearnOpen] = useState<string | null>(null)

  if (!breakdown) {
    return (
      <WidgetCard
        label="Tax-advantaged capacity"
        title="Your sheltered room"
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-mid)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Upload your offer letter or link a retirement account to see your tax-advantaged capacity.
        </p>
      </WidgetCard>
    )
  }

  const { ira, hsa, roth401k, backdoorRoth, megaBackdoor, totalRemaining } = breakdown

  const toggleExpand = (key: string) => setExpanded(prev => (prev === key ? null : key))
  const toggleLearn = (key: string) => setLearnOpen(prev => (prev === key ? null : key))

  // IRA ──────────────────────────────────────────────────────────────────
  const iraStatus = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <ProgressBar
        contributed={ira.contributed}
        limit={ira.limit}
        ariaLabel={`IRA contributions ${fmtUsd(ira.contributed)} of ${fmtUsd(ira.limit)}`}
      />
      <p style={rowStatus}>
        You can still shelter {fmtUsd(ira.remaining)} in an IRA this year.
      </p>
    </div>
  )
  const iraExpanded = (
    <div>
      <p style={{ margin: '0 0 6px 0' }}>
        Next step: raise your IRA contribution by {fmtUsd(ira.remaining)} to hit the {fmtUsd(ira.limit)} limit.
      </p>
      <p style={{ margin: 0, color: 'var(--color-text-mid)' }}>
        Contribute at your provider: Fidelity, Vanguard, Schwab, or whichever broker holds your IRA.
      </p>
    </div>
  )

  // HSA ──────────────────────────────────────────────────────────────────
  let hsaStatus: React.ReactNode
  let hsaExpanded: React.ReactNode
  if (hsa.eligible === 'eligible') {
    hsaStatus = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        <ProgressBar
          contributed={hsa.contributed}
          limit={hsa.limit}
          ariaLabel={`HSA contributions ${fmtUsd(hsa.contributed)} of ${fmtUsd(hsa.limit)}`}
        />
        <p style={rowStatus}>
          You can still shelter {fmtUsd(hsa.remaining ?? 0)} in an HSA this year.
        </p>
      </div>
    )
    hsaExpanded = (
      <div>
        <p style={{ margin: '0 0 6px 0' }}>
          Next step: raise your HSA payroll deduction by {fmtUsd(hsa.remaining ?? 0)} to hit the {fmtUsd(hsa.limit)} limit.
        </p>
        <p style={{ margin: 0, color: 'var(--color-text-mid)' }}>
          HSA contributions are triple tax-advantaged: deductible going in, untaxed growth, untaxed withdrawals for medical spend.
        </p>
      </div>
    )
  } else if (hsa.eligible === 'ineligible') {
    hsaStatus = <p style={rowStatus}>Not eligible, requires HDHP enrollment.</p>
    hsaExpanded = (
      <p style={{ margin: 0 }}>
        Your current plan is not an HDHP. If open enrollment comes up, compare an HDHP plus HSA against your current coverage.
      </p>
    )
  } else {
    hsaStatus = <p style={rowStatus}>Confirm HDHP enrollment to unlock HSA capacity.</p>
    hsaExpanded = (
      <p style={{ margin: 0 }}>
        Check your benefits portal. If your plan is a high-deductible health plan, you are eligible to contribute up to {fmtUsd(hsa.limit)}.
      </p>
    )
  }

  // 401k split ───────────────────────────────────────────────────────────
  const rothPct = Math.round(roth401k.recommendedSplit.roth * 100)
  const currentRothPct =
    roth401k.currentSplit != null ? Math.round(roth401k.currentSplit.roth * 100) : null
  const split401kStatus = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {currentRothPct != null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <p style={{ ...rowStatus, color: 'var(--color-text-muted)', fontSize: '11px' }}>
            Current: {currentRothPct}% Roth, {100 - currentRothPct}% pre-tax
          </p>
          <SplitBar rothShare={roth401k.currentSplit!.roth} ariaLabel="Current 401k split" />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <p style={{ ...rowStatus, fontSize: '11px' }}>
          Recommended: {rothPct}% Roth, {100 - rothPct}% pre-tax
        </p>
        <SplitBar rothShare={roth401k.recommendedSplit.roth} ariaLabel="Recommended 401k split" />
      </div>
      <p style={rowStatus}>{roth401k.rationale}</p>
    </div>
  )
  const split401kExpanded = (
    <div>
      <p style={{ margin: '0 0 6px 0' }}>
        Next step: log in to your 401k provider and set the Roth election to {rothPct}%. Pre-tax takes the remaining {100 - rothPct}%.
      </p>
      {roth401k.eligible === 'unknown' && (
        <p style={{ margin: 0, color: 'var(--color-text-mid)' }}>
          Confirm your plan offers a Roth option before switching.
        </p>
      )}
    </div>
  )

  // Backdoor Roth ────────────────────────────────────────────────────────
  let backdoorStatus: React.ReactNode
  if (backdoorRoth.eligible === 'eligible') {
    backdoorStatus = <p style={rowStatus}>Available. {backdoorRoth.reason}</p>
  } else if (backdoorRoth.eligible === 'ineligible') {
    backdoorStatus = <p style={rowStatus}>{backdoorRoth.reason}</p>
  } else {
    backdoorStatus = <p style={rowStatus}>{backdoorRoth.reason}</p>
  }
  const backdoorExpanded = (
    <div>
      {backdoorRoth.eligible === 'eligible' && (
        <>
          <p style={{ margin: '0 0 6px 0' }}>
            Next step: contribute {fmtUsd(ira.limit)} to a traditional IRA, then convert it to Roth within days. No tax is owed when the traditional IRA balance starts at zero.
          </p>
          <p style={{ margin: 0, color: 'var(--color-text-mid)' }}>
            File IRS Form 8606 with your return to document the non-deductible basis.
          </p>
        </>
      )}
      {backdoorRoth.eligible === 'ineligible' && backdoorRoth.incomeAboveDirect && (
        <p style={{ margin: 0 }}>
          The pro-rata rule taxes your conversion across all pre-tax IRA balances. Rolling a traditional IRA into your 401k removes it from the pro-rata calculation.
        </p>
      )}
      {backdoorRoth.eligible === 'ineligible' && !backdoorRoth.incomeAboveDirect && (
        <p style={{ margin: 0 }}>
          Contribute directly to a Roth IRA. Backdoor is only needed above the income phase-out.
        </p>
      )}
      {backdoorRoth.eligible === 'unknown' && (
        <p style={{ margin: 0 }}>
          Add your income to your profile so we can tell whether a direct Roth or a backdoor Roth is the right path.
        </p>
      )}
    </div>
  )

  // Mega-backdoor ────────────────────────────────────────────────────────
  let megaStatus: React.ReactNode
  if (megaBackdoor.eligible === 'eligible') {
    megaStatus = (
      <p style={rowStatus}>
        Available up to {fmtUsd(megaBackdoor.remainingCapacity ?? 0)}.
      </p>
    )
  } else if (megaBackdoor.eligible === 'ineligible') {
    megaStatus = <p style={rowStatus}>Plan does not support the mega-backdoor.</p>
  } else {
    megaStatus = <p style={rowStatus}>Unknown, check your plan documents.</p>
  }
  const megaExpanded = (
    <div>
      {megaBackdoor.eligible === 'eligible' && (
        <>
          <p style={{ margin: '0 0 6px 0' }}>
            Next step: set an after-tax 401k contribution with your payroll and enable automatic in-service Roth conversion. Up to {fmtUsd(megaBackdoor.remainingCapacity ?? 0)} of additional sheltered room is available.
          </p>
          <p style={{ margin: 0, color: 'var(--color-text-mid)' }}>
            This is the single largest tax-advantaged lever available to high earners.
          </p>
        </>
      )}
      {megaBackdoor.eligible === 'ineligible' && (
        <p style={{ margin: 0 }}>{megaBackdoor.reason}</p>
      )}
      {megaBackdoor.eligible === 'unknown' && (
        <p style={{ margin: 0 }}>
          Ask your benefits contact whether the plan allows after-tax (non-Roth) contributions and in-service withdrawals or Roth in-plan conversions.
        </p>
      )}
    </div>
  )

  return (
    <WidgetCard label="Tax-advantaged capacity" title="Your sheltered room">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={primaryLabel}>Total remaining this year</p>
        <p style={primaryMetric} aria-label={`Total remaining tax-advantaged capacity ${fmtUsd(totalRemaining)}`}>
          {fmtUsd(totalRemaining)}
        </p>
        <p style={{ ...rowStatus, margin: 0 }}>
          You can still shelter this much from taxes across eligible accounts this year.
        </p>
      </div>

      <BreakdownRow
        id={`${base}-ira`}
        label="IRA"
        valueSlot={<p style={rowValue}>{fmtUsd(ira.remaining)} left</p>}
        badgeText={ira.catchupEligible ? 'Catch-up' : undefined}
        statusSlot={iraStatus}
        learn="An IRA shelters investment growth from tax. Traditional IRAs defer tax until withdrawal, Roth IRAs tax now and grow tax-free forever. Limit is $7,000 in 2026, plus $1,000 if you are 50 or older."
        expandedContent={iraExpanded}
        expanded={expanded === 'ira'}
        learnOpen={learnOpen === 'ira'}
        onToggleExpanded={() => toggleExpand('ira')}
        onToggleLearn={() => toggleLearn('ira')}
      />

      <BreakdownRow
        id={`${base}-hsa`}
        label="HSA"
        valueSlot={
          hsa.eligible === 'eligible' ? (
            <p style={rowValue}>{fmtUsd(hsa.remaining ?? 0)} left</p>
          ) : undefined
        }
        statusSlot={hsaStatus}
        learn="An HSA is the only triple tax-advantaged account. Contributions are deductible, growth is untaxed, and qualified medical withdrawals are untaxed. Only available if enrolled in a high-deductible health plan."
        expandedContent={hsaExpanded}
        expanded={expanded === 'hsa'}
        learnOpen={learnOpen === 'hsa'}
        onToggleExpanded={() => toggleExpand('hsa')}
        onToggleLearn={() => toggleLearn('hsa')}
      />

      <BreakdownRow
        id={`${base}-401k`}
        label="401k split"
        statusSlot={split401kStatus}
        learn="Your 401k dollars can go into a Roth bucket or a pre-tax bucket. Roth pays tax now, pre-tax defers it. The right split depends on whether you expect your tax bracket to be higher now or in retirement."
        expandedContent={split401kExpanded}
        expanded={expanded === '401k'}
        learnOpen={learnOpen === '401k'}
        onToggleExpanded={() => toggleExpand('401k')}
        onToggleLearn={() => toggleLearn('401k')}
      />

      <BreakdownRow
        id={`${base}-backdoor`}
        label="Backdoor Roth"
        statusSlot={backdoorStatus}
        learn="Backdoor Roth is a workaround for high earners above the direct Roth IRA phase-out. You contribute to a traditional IRA, then convert it to Roth. It only works cleanly when your traditional IRA balance is zero, due to the pro-rata rule."
        expandedContent={backdoorExpanded}
        expanded={expanded === 'backdoor'}
        learnOpen={learnOpen === 'backdoor'}
        onToggleExpanded={() => toggleExpand('backdoor')}
        onToggleLearn={() => toggleLearn('backdoor')}
      />

      <BreakdownRow
        id={`${base}-mega`}
        label="Mega-backdoor Roth"
        statusSlot={megaStatus}
        learn="Mega-backdoor lets you contribute after-tax dollars to your 401k beyond the normal employee limit, then convert them to Roth in-plan. It requires your plan to allow both after-tax contributions and in-service rollovers. Up to $70,000 combined 401k room in 2026."
        expandedContent={megaExpanded}
        expanded={expanded === 'mega'}
        learnOpen={learnOpen === 'mega'}
        onToggleExpanded={() => toggleExpand('mega')}
        onToggleLearn={() => toggleLearn('mega')}
      />
    </WidgetCard>
  )
}

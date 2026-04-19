'use client'

import {
  CSSProperties,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  computeAvalanchePayoff,
  computeMinimumPayoff,
  computeSnowballPayoff,
  DEBT_PAYOFF_MAX_MONTHS,
  type DebtInput,
  type PayoffResult,
} from '@/lib/debtPayoff'
import type { DebtPayoffScenarios } from '@/lib/dashboardState'
import WidgetCard from '../widgets/WidgetCard'

interface Props {
  annualInterestCost: number | null
  highAprDebtTotal: number | null
  scenarios: DebtPayoffScenarios | null
}

type Strategy = 'minimum' | 'avalanche' | 'snowball'

const EXTRA_MIN = 0
const EXTRA_MAX = 1000
const EXTRA_STEP = 25

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

const fmtAxisY = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${Math.round(n)}`
}

function fmtPayoff(result: PayoffResult): { date: string; months: string } {
  if (result.totalMonths === 0) {
    return { date: 'Now', months: '0 mo' }
  }
  if (result.capped) {
    return { date: 'Never at this pace', months: `${DEBT_PAYOFF_MAX_MONTHS}+ mo` }
  }
  const d = result.payoffDate
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const years = Math.floor(result.totalMonths / 12)
  const months = result.totalMonths % 12
  const monthsStr =
    years === 0
      ? `${months} mo`
      : months === 0
        ? `${years} yr`
        : `${years} yr ${months} mo`
  return { date: dateStr, months: monthsStr }
}

function usePayoffMonth(result: PayoffResult, accountId: string): number | null {
  return useMemo(() => {
    for (const step of result.monthlySchedule) {
      if ((step.perDebtBalances[accountId] ?? 0) <= 0.01 && step.month > 0) {
        return step.month
      }
    }
    return null
  }, [result, accountId])
}

const STRATEGY_COLORS: Record<Strategy, string> = {
  minimum: 'var(--color-text-muted)',
  avalanche: 'var(--color-negative)',
  snowball: 'var(--color-info)',
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  minimum: 'Minimum only',
  avalanche: 'Avalanche',
  snowball: 'Snowball',
}

// ── Styles ───────────────────────────────────────────────────────────────────

const labelMicro: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  margin: 0,
}

const metricStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '26px',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.1,
  margin: 0,
}

const subMetricStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  margin: 0,
}

const segmentGroup: CSSProperties = {
  display: 'flex',
  border: '1px solid var(--color-border)',
  borderRadius: '2px',
  overflow: 'hidden',
}

const segmentButton = (active: boolean): CSSProperties => ({
  flex: 1,
  padding: '8px 10px',
  background: active ? 'var(--color-gold-subtle)' : 'transparent',
  border: 'none',
  borderRight: '1px solid var(--color-border)',
  color: active ? 'var(--color-text)' : 'var(--color-text-mid)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  outline: 'none',
})

const sliderRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const sliderReadout: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text)',
}

const savingsCallout: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  margin: 0,
  lineHeight: 1.55,
}

const tableWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  borderTop: '1px solid var(--color-border)',
  paddingTop: '12px',
}

const tableHeader: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.4fr 0.7fr 1fr',
  gap: '8px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  padding: '4px 0',
}

const tableRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.4fr 0.7fr 1fr',
  gap: '8px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text)',
  padding: '6px 0',
  borderBottom: '1px solid var(--color-border)',
  alignItems: 'center',
}

// Mobile-stacked "card" variant of a debt row.
const mobileDebtCard: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: '2px',
  padding: '10px 12px',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '4px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 768px)')
    const handler = () => setMobile(m.matches)
    handler()
    m.addEventListener('change', handler)
    return () => m.removeEventListener('change', handler)
  }, [])
  return mobile
}

// ── Chart ────────────────────────────────────────────────────────────────────

interface ChartPoint {
  month: number
  minimum: number
  avalanche: number
  snowball: number
}

function buildChartData(
  minResult: PayoffResult,
  avaResult: PayoffResult,
  snoResult: PayoffResult,
): ChartPoint[] {
  const maxMonths = Math.max(
    minResult.totalMonths,
    avaResult.totalMonths,
    snoResult.totalMonths,
  )
  // Downsample to a ceiling of ~180 points so the 600-month cap case stays
  // performant and visually legible. Below the ceiling, no downsampling.
  const CEILING = 180
  const stride = maxMonths > CEILING ? Math.ceil(maxMonths / CEILING) : 1

  const at = (r: PayoffResult, m: number): number => {
    const idx = Math.min(m, r.monthlySchedule.length - 1)
    return Math.round(r.monthlySchedule[idx]?.totalBalance ?? 0)
  }

  const points: ChartPoint[] = []
  for (let m = 0; m <= maxMonths; m += stride) {
    points.push({
      month: m,
      minimum: at(minResult, m),
      avalanche: at(avaResult, m),
      snowball: at(snoResult, m),
    })
  }
  // Ensure the final point lands exactly on maxMonths so the tail is accurate.
  if (points[points.length - 1].month !== maxMonths) {
    points.push({
      month: maxMonths,
      minimum: at(minResult, maxMonths),
      avalanche: at(avaResult, maxMonths),
      snowball: at(snoResult, maxMonths),
    })
  }
  return points
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '2px',
      padding: '10px 12px',
      fontFamily: 'var(--font-mono)',
    }}>
      <p style={{
        fontSize: '10px',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: '6px',
      }}>
        Month {label}
      </p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ fontSize: '12px', color: p.color, margin: '2px 0' }}>
          {STRATEGY_LABELS[p.dataKey as Strategy]}: {fmtCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Debt row ─────────────────────────────────────────────────────────────────

function DebtRow({
  debt,
  index,
  result,
  mobile,
}: {
  debt: DebtInput
  index: number
  result: PayoffResult
  mobile: boolean
}) {
  const payoffMonth = usePayoffMonth(result, debt.accountId)
  const aprPct = `${(debt.apr * 100).toFixed(1)}%`
  const label = `Debt ${index + 1}`
  const payoffLabel =
    payoffMonth != null
      ? `Month ${payoffMonth}`
      : result.capped
        ? `${DEBT_PAYOFF_MAX_MONTHS}+`
        : '--'
  if (mobile) {
    return (
      <div style={mobileDebtCard}>
        <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span style={{ textAlign: 'right', color: 'var(--color-text)' }}>{fmtCurrency(debt.balance)}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>APR</span>
        <span style={{ textAlign: 'right', color: 'var(--color-text)' }}>{aprPct}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>Paid off</span>
        <span style={{ textAlign: 'right', color: 'var(--color-text)' }}>{payoffLabel}</span>
      </div>
    )
  }
  return (
    <div style={tableRow}>
      <span>
        {label}
        <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>
          {fmtCurrency(debt.balance)}
        </span>
      </span>
      <span style={{ color: 'var(--color-text-mid)' }}>{aprPct}</span>
      <span style={{ textAlign: 'right' }}>{payoffLabel}</span>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DebtTrajectoryCard({
  annualInterestCost,
  highAprDebtTotal,
  scenarios,
}: Props) {
  const noHighApr = (highAprDebtTotal ?? 0) <= 0
  if (!scenarios || scenarios.debts.length === 0 || noHighApr) {
    return (
      <DebtTrajectoryEmpty
        annualInterestCost={annualInterestCost}
        highAprDebtTotal={highAprDebtTotal}
      />
    )
  }
  return <DebtTrajectoryLoaded scenarios={scenarios} />
}

function DebtTrajectoryEmpty({
  annualInterestCost,
  highAprDebtTotal,
}: {
  annualInterestCost: number | null
  highAprDebtTotal: number | null
}) {
  const positive = (highAprDebtTotal ?? 0) === 0
  return (
    <WidgetCard
      title={positive ? 'No high-APR debt' : 'Debt payoff'}
      accent="positive"
    >
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--color-text-mid)',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {positive
          ? 'No high-APR balances to pay down. This is a good position.'
          : annualInterestCost != null
            ? `Current interest cost runs ${fmtCurrency(annualInterestCost)} per year. Link a credit card or loan to model a payoff.`
            : 'Link a credit card or loan to model a payoff plan.'}
      </p>
    </WidgetCard>
  )
}

function DebtTrajectoryLoaded({ scenarios }: { scenarios: DebtPayoffScenarios }) {
  const { debts, defaultExtraMonthly } = scenarios
  const [strategy, setStrategy] = useState<Strategy>('avalanche')
  const [extra, setExtra] = useState<number>(defaultExtraMonthly)
  const mobile = useIsMobile()

  // Client-side recomputation, instant feedback on slider drags.
  const results = useMemo(() => {
    const minimum = computeMinimumPayoff(debts)
    const avalanche = computeAvalanchePayoff(debts, extra)
    const snowball = computeSnowballPayoff(debts, extra)
    return { minimum, avalanche, snowball }
  }, [debts, extra])

  const chartData = useMemo(
    () => buildChartData(results.minimum, results.avalanche, results.snowball),
    [results],
  )

  const selected = results[strategy]
  const selectedColor = STRATEGY_COLORS[strategy]

  const payoff = fmtPayoff(selected)
  const interestCost = Math.round(selected.totalInterestPaid)

  const avalancheSavings = Math.max(
    0,
    results.minimum.totalInterestPaid - results.avalanche.totalInterestPaid,
  )
  const strategySavings =
    strategy === 'minimum'
      ? 0
      : Math.max(
          0,
          results.minimum.totalInterestPaid - selected.totalInterestPaid,
        )

  const chartHeight = mobile ? 200 : 280

  return (
    <WidgetCard title="Debt payoff" accent="alert">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={labelMicro}>
          {strategy === 'minimum' ? 'Holding steady at minimum payments' : `Payoff at ${fmtCurrency(extra)}/mo extra`}
        </p>
        <p style={metricStyle}>{payoff.date}</p>
        <p style={subMetricStyle}>
          {strategy === 'minimum' && results.minimum.capped
            ? `Costs ${fmtCurrency(interestCost)} in interest at the ${DEBT_PAYOFF_MAX_MONTHS}-month cap`
            : `Costs ${fmtCurrency(interestCost)} in interest over ${payoff.months}`}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Payoff strategy"
        style={segmentGroup}
      >
        {(['minimum', 'avalanche', 'snowball'] as Strategy[]).map((s, i, arr) => (
          <button
            key={s}
            role="radio"
            aria-checked={strategy === s}
            aria-label={`${STRATEGY_LABELS[s]} strategy`}
            onClick={() => setStrategy(s)}
            style={{
              ...segmentButton(strategy === s),
              borderRight: i === arr.length - 1 ? 'none' : '1px solid var(--color-border)',
            }}
          >
            {STRATEGY_LABELS[s]}
          </button>
        ))}
      </div>

      <div style={sliderRow}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={labelMicro}>Extra per month</span>
          <span style={sliderReadout}>{fmtCurrency(extra)}</span>
        </div>
        <input
          type="range"
          min={EXTRA_MIN}
          max={EXTRA_MAX}
          step={EXTRA_STEP}
          value={extra}
          onChange={e => setExtra(Number(e.target.value))}
          aria-label="Extra monthly payment"
          aria-valuemin={EXTRA_MIN}
          aria-valuemax={EXTRA_MAX}
          aria-valuenow={extra}
          aria-valuetext={`${fmtCurrency(extra)} per month`}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <span>{fmtCurrency(EXTRA_MIN)}</span>
          <span>{fmtCurrency(EXTRA_MAX)}</span>
        </div>
      </div>

      <div
        role="img"
        aria-label="Comparison chart of debt balance over time for minimum, avalanche, and snowball strategies"
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="month"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={m => (m === 0 ? '0' : `${m}mo`)}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={fmtAxisY}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            {(['minimum', 'avalanche', 'snowball'] as Strategy[]).map(s => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={STRATEGY_COLORS[s]}
                strokeWidth={strategy === s ? 2.25 : 1}
                strokeOpacity={strategy === s ? 1 : 0.55}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p style={savingsCallout}>
        {strategy === 'avalanche' && avalancheSavings > 0 && (
          <>
            Avalanche saves{' '}
            <span style={{ color: 'var(--color-positive)' }}>{fmtCurrency(avalancheSavings)}</span>{' '}
            in interest versus minimum only.
          </>
        )}
        {strategy === 'snowball' && strategySavings > 0 && (
          <>
            Snowball saves{' '}
            <span style={{ color: 'var(--color-positive)' }}>{fmtCurrency(strategySavings)}</span>{' '}
            in interest versus minimum only, and clears small balances first.
          </>
        )}
        {strategy === 'minimum' && avalancheSavings > 0 && (
          <>
            Switching to avalanche at this extra payment saves{' '}
            <span style={{ color: 'var(--color-positive)' }}>{fmtCurrency(avalancheSavings)}</span>{' '}
            in interest.
          </>
        )}
        {avalancheSavings <= 0 && strategy !== 'minimum' && (
          <>Increase the extra payment to see interest savings accrue.</>
        )}
      </p>

      <div style={tableWrap}>
        {!mobile && (
          <div style={tableHeader}>
            <span>Debt</span>
            <span>APR</span>
            <span style={{ textAlign: 'right' }}>Paid off</span>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: mobile ? '8px' : 0,
          }}
        >
          {debts.map((d, i) => (
            <DebtRow
              key={d.accountId}
              debt={d}
              index={i}
              result={selected}
              mobile={mobile}
            />
          ))}
        </div>
      </div>
    </WidgetCard>
  )
}

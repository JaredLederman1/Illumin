'use client'

import type { OnboardingData } from './shared'
import { heading, body, label, helperText, precisionCta, formatNumber } from './shared'
import { DefaultedInput } from './DefaultedInput'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
}

const RISK_LABELS: Record<number, string> = {
  1: 'Very conservative',
  2: 'Conservative',
  3: 'Balanced',
  4: 'Aggressive',
  5: 'Very aggressive',
}

const EMERGENCY_FUND_MAX = 24
const EMERGENCY_FUND_RECOMMENDED = 6

const UNLOCK_COPY = {
  targetRetirementIncome:
    'The yearly income you want to live on in retirement, before tax. Set a target to see your gap closing live.',
  riskTolerance: 'Share your tolerance to get allocation recommendations.',
}

export function Step4Goals({ data, onChange }: Props) {
  const currentIncome = data.targetRetirementIncome ?? 0
  const incomeDisplay = currentIncome > 0 ? formatNumber(currentIncome) : ''

  const handleIncomeChange = (raw: string) => {
    const clean = raw.replace(/,/g, '').replace(/[^0-9]/g, '')
    const num = parseInt(clean) || 0
    onChange({ targetRetirementIncome: num > 0 ? num : null })
  }

  const emergencyPct = (data.emergencyFundMonthsTarget / EMERGENCY_FUND_MAX) * 100
  const recommendedPct = (EMERGENCY_FUND_RECOMMENDED / EMERGENCY_FUND_MAX) * 100

  return (
    <div>
      <h1 style={heading}>Your financial goals</h1>
      <p style={body}>All optional. {precisionCta}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '36px' }}>
        {/* Target retirement income */}
        <div>
          <label style={label}>Target retirement income (annual)</label>
          <DefaultedInput
            value={incomeDisplay}
            onChange={handleIncomeChange}
            hasDefault={false}
            inputMode="numeric"
            placeholder="0"
            prefix="$"
            ariaLabel="Target retirement income"
          />
          <p style={helperText}>{UNLOCK_COPY.targetRetirementIncome}</p>
        </div>

        {/* Emergency fund */}
        <div>
          <label style={label}>Emergency fund target</label>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative', paddingTop: '14px', paddingBottom: '6px' }}>
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `calc(${recommendedPct}% )`,
                  transform: 'translateX(-50%)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9.5px',
                  color: 'var(--color-gold)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                Recommended
              </span>
              <input
                type="range"
                min={0}
                max={EMERGENCY_FUND_MAX}
                value={data.emergencyFundMonthsTarget}
                onChange={e => onChange({ emergencyFundMonthsTarget: Number(e.target.value) })}
                style={{
                  width: '100%',
                  background: `linear-gradient(to right, var(--color-gold) ${emergencyPct}%, var(--color-border) ${emergencyPct}%)`,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                fontWeight: 300,
                color: 'var(--color-text)',
                minWidth: '110px',
                textAlign: 'right',
              }}
            >
              {data.emergencyFundMonthsTarget} mo
            </span>
          </div>
          <p style={helperText}>Recommended: {EMERGENCY_FUND_RECOMMENDED} months of expenses.</p>
        </div>

        {/* Risk tolerance */}
        <div>
          <label style={label}>Risk tolerance</label>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={data.riskTolerance}
              onChange={e => onChange({ riskTolerance: Number(e.target.value) })}
              style={{
                flex: 1,
                background: `linear-gradient(to right, var(--color-gold) ${((data.riskTolerance - 1) / 4) * 100}%, var(--color-border) ${((data.riskTolerance - 1) / 4) * 100}%)`,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text)',
                letterSpacing: '0.1em',
                textAlign: 'right',
                minWidth: '150px',
              }}
            >
              {data.riskTolerance} · {RISK_LABELS[data.riskTolerance] ?? ''}
            </span>
          </div>
          <p style={helperText}>{UNLOCK_COPY.riskTolerance}</p>
        </div>
      </div>
    </div>
  )
}

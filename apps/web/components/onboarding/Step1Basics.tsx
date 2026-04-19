'use client'

import { useState, useMemo } from 'react'
import type { OnboardingData } from './shared'
import { heading, body, label, helperText, formatNumber } from './shared'
import { LiveProjection } from './LiveProjection'
import { DefaultedInput } from './DefaultedInput'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  isMobile: boolean
  onAdvance: () => void
}

// On mobile, renders one field per screen with a forward arrow to advance and
// a sticky live-projection banner at the top. On desktop, renders every field
// on one screen with the live projection as a side card. The mobile substeps
// are local to this component (no global step bump) — the parent only hears
// onAdvance once Step 1 itself is done.
type SubStep = 'age' | 'location' | 'income' | 'savings' | 'retirement'
const ORDER: SubStep[] = ['age', 'location', 'income', 'savings', 'retirement']

const FIELD_LABELS: Record<SubStep, { heading: string; sub: string }> = {
  age:        { heading: 'How old are you?',                 sub: 'Your age determines how many compounding years remain.' },
  location:   { heading: 'Where do you live?',               sub: 'City and state. Used for cost-of-living context.' },
  income:     { heading: 'What is your annual salary?',      sub: 'Gross income before tax, including reliable bonus.' },
  savings:    { heading: 'What share do you invest?',        sub: 'Include 401(k) contributions. Default is set at 20%.' },
  retirement: { heading: 'Retirement target age',            sub: 'We will project your wealth trajectory to this year.' },
}

export function Step1Basics({ data, onChange, isMobile, onAdvance }: Props) {
  const [incomeDisplay, setIncomeDisplay] = useState(
    data.annualIncome > 0 ? formatNumber(data.annualIncome) : ''
  )
  const [subStep, setSubStep] = useState<SubStep>(ORDER[0])

  const ageStr = data.age === '' ? '' : String(data.age)

  const subIdx = ORDER.indexOf(subStep)
  const subComplete = useMemo<Record<SubStep, boolean>>(() => ({
    age:        typeof data.age === 'number' && data.age > 0,
    location:   Boolean(data.locationCity && data.locationState),
    income:     data.annualIncome > 0,
    savings:    data.savingsRate > 0,
    retirement: data.retirementAge > 0,
  }), [data.age, data.locationCity, data.locationState, data.annualIncome, data.savingsRate, data.retirementAge])

  const allDone = ORDER.every(s => subComplete[s])

  const handleIncomeChange = (raw: string) => {
    const clean = raw.replace(/,/g, '').replace(/[^0-9]/g, '')
    const num = parseInt(clean) || 0
    const patch: Partial<OnboardingData> = { annualIncome: num }
    // Live-update the target_retirement_income default to 80% of salary only
    // if the user has not explicitly set one yet.
    if (data.targetRetirementIncome === null) {
      patch.targetRetirementIncome = null
    }
    onChange(patch)
    setIncomeDisplay(num ? formatNumber(num) : '')
  }

  const advanceSub = () => {
    const next = ORDER[subIdx + 1]
    if (next) setSubStep(next)
    else if (allDone) onAdvance()
  }

  // Desktop: render every field at once
  // Mobile: render only the current substep, with a sticky live projection banner at the top
  const ageField = (
    <div>
      <label style={label}>Age</label>
      <DefaultedInput
        value={ageStr}
        onChange={v => {
          const clean = v.replace(/[^0-9]/g, '')
          const n = parseInt(clean)
          onChange({ age: clean === '' || isNaN(n) ? '' : Math.max(16, Math.min(80, n)) })
        }}
        inputMode="numeric"
        placeholder="e.g. 32"
        ariaLabel="Age"
      />
    </div>
  )

  const locationField = (
    <div>
      <label style={label}>Location</label>
      <div style={{ display: 'flex', gap: '10px' }}>
        <DefaultedInput
          value={data.locationCity}
          onChange={v => onChange({ locationCity: v })}
          placeholder="City"
          ariaLabel="City"
          style={{ flex: 2 }}
        />
        <DefaultedInput
          value={data.locationState}
          onChange={v => onChange({ locationState: v.toUpperCase().slice(0, 2) })}
          placeholder="ST"
          ariaLabel="State"
          style={{ flex: 1, textTransform: 'uppercase' }}
        />
      </div>
    </div>
  )

  const incomeField = (
    <div>
      <label style={label}>Annual salary</label>
      <DefaultedInput
        value={incomeDisplay}
        onChange={handleIncomeChange}
        inputMode="numeric"
        placeholder="120,000"
        prefix="$"
        ariaLabel="Annual salary"
      />
    </div>
  )

  const savingsPct = (data.savingsRate / 50) * 100
  const savingsField = (
    <div>
      <label style={label}>Savings rate</label>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <input
          type="range"
          min={0}
          max={50}
          value={data.savingsRate}
          onChange={e => onChange({ savingsRate: Number(e.target.value) })}
          style={{
            flex: 1,
            background: `linear-gradient(to right, var(--color-gold) ${savingsPct}%, var(--color-border) ${savingsPct}%)`,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 300,
            color: 'var(--color-text)',
            minWidth: '66px',
            textAlign: 'right',
          }}
        >
          {data.savingsRate}%
        </span>
      </div>
      <p style={helperText}>National median: 5%. Recommended: 15 to 20%.</p>
    </div>
  )

  const retirePct = ((data.retirementAge - 45) / (75 - 45)) * 100
  const retirementField = (
    <div>
      <label style={label}>Retirement target age</label>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <input
          type="range"
          min={45}
          max={75}
          value={data.retirementAge}
          onChange={e => onChange({ retirementAge: Number(e.target.value) })}
          style={{
            flex: 1,
            background: `linear-gradient(to right, var(--color-gold) ${retirePct}%, var(--color-border) ${retirePct}%)`,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 300,
            color: 'var(--color-text)',
            minWidth: '66px',
            textAlign: 'right',
          }}
        >
          {data.retirementAge}
        </span>
      </div>
    </div>
  )

  const fieldByKey: Record<SubStep, React.ReactNode> = {
    age:        ageField,
    location:   locationField,
    income:     incomeField,
    savings:    savingsField,
    retirement: retirementField,
  }

  if (isMobile) {
    const copy = FIELD_LABELS[subStep]
    return (
      <div>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            backgroundColor: 'var(--color-bg)',
            paddingBottom: '16px',
            marginBottom: '24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <LiveProjection
            age={data.age}
            annualIncome={data.annualIncome}
            savingsRate={data.savingsRate}
            retirementAge={data.retirementAge}
            compact
          />
        </div>

        <h1 style={heading}>{copy.heading}</h1>
        <p style={body}>{copy.sub}</p>

        <div style={{ marginTop: '32px' }}>{fieldByKey[subStep]}</div>

        <button
          type="button"
          onClick={advanceSub}
          disabled={!subComplete[subStep]}
          aria-label="Next"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '36px',
            marginLeft: 'auto',
            padding: '13px 30px',
            backgroundColor: 'var(--color-gold)',
            border: 'none',
            borderRadius: '2px',
            color: 'var(--color-surface)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 500,
            cursor: subComplete[subStep] ? 'pointer' : 'not-allowed',
            opacity: subComplete[subStep] ? 1 : 0.5,
          }}
        >
          {subIdx < ORDER.length - 1 ? 'Next' : 'Continue'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    )
  }

  // Desktop
  return (
    <div>
      <h1 style={heading}>Tell us the basics</h1>
      <p style={body}>A few numbers let us project your long-term wealth trajectory.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '40px',
          alignItems: 'start',
          marginTop: '36px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {ageField}
          {locationField}
          {incomeField}
          {savingsField}
          {retirementField}
        </div>

        <div style={{ position: 'sticky', top: '40px' }}>
          <LiveProjection
            age={data.age}
            annualIncome={data.annualIncome}
            savingsRate={data.savingsRate}
            retirementAge={data.retirementAge}
          />
        </div>
      </div>
    </div>
  )
}

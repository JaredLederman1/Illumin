'use client'

import { motion } from 'framer-motion'
import { fmt, projectWealth } from './shared'

interface Props {
  age: number | ''
  annualIncome: number
  savingsRate: number
  retirementAge: number
  compact?: boolean
}

// Live projection card shown during Step 1. Pure presentation — it pulls the
// fields it needs out of the current onboarding form state and re-renders the
// future value on every change. A single required field being blank kicks it
// into the placeholder state.
export function LiveProjection({
  age,
  annualIncome,
  savingsRate,
  retirementAge,
  compact = false,
}: Props) {
  const ready =
    typeof age === 'number' &&
    age > 0 &&
    annualIncome > 0 &&
    savingsRate > 0 &&
    retirementAge > 0 &&
    retirementAge > age

  const projection = ready
    ? projectWealth(age as number, annualIncome, savingsRate, retirementAge)
    : 0

  const yearsToRetire = ready ? retirementAge - (age as number) : 0

  return (
    <div
      style={{
        padding: compact ? '14px 18px' : '22px 24px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '2px',
        minHeight: compact ? undefined : '140px',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9.5px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: compact ? '6px' : '12px',
        }}
      >
        Projected retirement net worth
      </p>

      {ready ? (
        <motion.div
          key={`${age}-${annualIncome}-${savingsRate}-${retirementAge}`}
          initial={{ opacity: 0.4, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? '28px' : '46px',
              fontWeight: 300,
              color: 'var(--color-gold)',
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {fmt(projection)}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.06em',
              lineHeight: 1.5,
              marginTop: compact ? '4px' : '10px',
            }}
          >
            Over {yearsToRetire} years at 7% real return
          </p>
        </motion.div>
      ) : (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: compact ? '11px' : '13px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
            margin: 0,
          }}
        >
          Enter your details to see your projection.
        </p>
      )}
    </div>
  )
}

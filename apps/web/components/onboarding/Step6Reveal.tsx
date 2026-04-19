'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { OnboardingData } from './shared'
import { fmt, muted, projectWealth } from './shared'

interface Props {
  data: OnboardingData
}

export function Step6Reveal({ data }: Props) {
  const ageNum = typeof data.age === 'number' ? data.age : 0
  const yearsToRetire = Math.max(0, data.retirementAge - ageNum)
  const monthlyInvest = (data.annualIncome * data.savingsRate / 100) / 12
  const wealthNow = projectWealth(ageNum, data.annualIncome, data.savingsRate, data.retirementAge)
  const wealthMinus1 = projectWealth(ageNum + 1, data.annualIncome, data.savingsRate, data.retirementAge)
  const opportunityCost = Math.max(0, wealthNow - wealthMinus1)
  const wealthAt20 = projectWealth(ageNum, data.annualIncome, 20, data.retirementAge)

  return (
    <motion.div
      key="reveal"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ width: '100%', maxWidth: '880px' }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10.5px',
          color: 'var(--color-gold)',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          marginBottom: '20px',
        }}
      >
        Here is what you are leaving on the table.
      </p>

      <div className="onboarding-reveal-grid" style={{ marginBottom: '52px', alignItems: 'start' }}>
        <div>
          <p style={{ ...muted, marginBottom: '20px' }}>Cost of waiting one year</p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '76px',
              fontWeight: 300,
              color: 'var(--color-text)',
              lineHeight: 1,
              letterSpacing: '-0.01em',
              marginBottom: '28px',
            }}
          >
            {fmt(opportunityCost)}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-gold-subtle)',
              border: '1px solid var(--color-gold)',
              borderRadius: '2px',
              padding: '5px 12px',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-gold)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              Every. Single. Year.
            </span>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 300,
              color: 'var(--color-text)',
              lineHeight: 1.45,
              marginBottom: '16px',
            }}
          >
            This is not a one-time loss. Every year you delay, you forfeit this
            amount in retirement wealth, permanently.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: 300,
              color: 'var(--color-text-mid)',
              lineHeight: 1.5,
              marginBottom: '20px',
            }}
          >
            Wait 5 years and the true cost is{' '}
            <strong style={{ color: 'var(--color-text)' }}>{fmt(opportunityCost * 5)}</strong>.
            Wait 10 years: <strong style={{ color: 'var(--color-text)' }}>{fmt(opportunityCost * 10)}</strong>.
            The clock does not pause.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.7,
              letterSpacing: '0.02em',
            }}
          >
            Based on 7% annualized real return. S&amp;P 500 historical average.
            Calculated in today&apos;s dollars.
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            padding: '28px',
          }}
        >
          {[
            { label: 'Years to retirement',                      value: `${yearsToRetire} yrs` },
            { label: 'Current monthly investment',               value: fmt(monthlyInvest) },
            { label: 'Projected wealth at current savings rate', value: fmt(wealthNow) },
            { label: 'Projected wealth at 20% savings rate',     value: fmt(wealthAt20) },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingBottom: '18px',
                marginBottom: i < arr.length - 1 ? '18px' : 0,
                borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.04em',
                  maxWidth: '140px',
                  lineHeight: 1.5,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  fontWeight: 400,
                  color: 'var(--color-text)',
                  flexShrink: 0,
                  marginLeft: '16px',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'block',
            padding: '14px 48px',
            backgroundColor: 'var(--color-gold)',
            border: 'none',
            borderRadius: '2px',
            color: 'var(--color-surface)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 500,
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Open my dashboard
        </Link>
      </div>
    </motion.div>
  )
}

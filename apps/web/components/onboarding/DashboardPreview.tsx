'use client'

import { motion } from 'framer-motion'
import { fmt, projectWealth, continueBtn } from './shared'

interface Props {
  age: number | ''
  annualIncome: number
  savingsRate: number
  retirementAge: number
  skippedPlaid: boolean
  onContinue: () => void
}

// Blurred-teaser preview shown between Step 5 and Step 6. Not a full dashboard
// load: renders stylized placeholder cards with the user's projected net
// worth and top opportunity cost visible. If the user skipped Plaid link,
// account-dependent sections get a "Link accounts to unlock this" overlay.
export function DashboardPreview({
  age,
  annualIncome,
  savingsRate,
  retirementAge,
  skippedPlaid,
  onContinue,
}: Props) {
  const ageNum = typeof age === 'number' ? age : 0
  const wealthNow = projectWealth(ageNum, annualIncome, savingsRate, retirementAge)
  const wealthMinus1 = projectWealth(ageNum + 1, annualIncome, savingsRate, retirementAge)
  const opportunityCost = Math.max(0, wealthNow - wealthMinus1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        width: '100%',
        maxWidth: '880px',
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '26px',
          fontWeight: 300,
          color: 'var(--color-text)',
          lineHeight: 1.25,
          margin: 0,
          marginBottom: '30px',
        }}
      >
        Link accounts to unlock Illumin&apos;s complete financial analysis.
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '18px',
          filter: 'blur(0.3px)',
        }}
      >
        {/* Net worth card, visible */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          style={{
            padding: '22px 24px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '3px',
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
              marginBottom: '8px',
            }}
          >
            Projected net worth
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '36px',
              fontWeight: 300,
              color: 'var(--color-text)',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {fmt(wealthNow)}
          </p>
        </motion.div>

        {/* Opportunity cost card, visible */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{
            padding: '22px 24px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-gold)',
            borderRadius: '3px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              color: 'var(--color-gold)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Top opportunity cost
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '36px',
              fontWeight: 300,
              color: 'var(--color-gold)',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {fmt(opportunityCost)}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              color: 'var(--color-text-muted)',
              margin: 0,
              marginTop: '8px',
            }}
          >
            Cost of waiting one year.
          </p>
        </motion.div>

        {/* Account-dependent cards, blurred */}
        {[
          'Linked accounts',
          'Monthly cash flow',
          'Transactions',
          'Health score',
        ].map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
            style={{
              position: 'relative',
              padding: '22px 24px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '3px',
              minHeight: '96px',
              filter: skippedPlaid ? 'blur(3px)' : 'blur(1.5px)',
              opacity: 0.55,
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
                marginBottom: '8px',
              }}
            >
              {label}
            </p>
            <div
              style={{
                height: '26px',
                width: '60%',
                backgroundColor: 'var(--color-gold-subtle)',
                borderRadius: '2px',
              }}
            />
          </motion.div>
        ))}
      </div>

      {skippedPlaid && (
        <div
          style={{
            marginTop: '22px',
            padding: '16px 20px',
            border: '1px solid var(--color-border-strong)',
            borderRadius: '3px',
            backgroundColor: 'var(--color-gold-subtle)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              color: 'var(--color-text)',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            Link accounts to unlock this
          </p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '40px',
        }}
      >
        <button
          type="button"
          onClick={onContinue}
          style={{
            ...continueBtn,
            padding: '13px 36px',
          }}
        >
          Continue
        </button>
      </div>
    </motion.div>
  )
}

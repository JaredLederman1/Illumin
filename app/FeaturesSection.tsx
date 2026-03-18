'use client'

import styles from './page.module.css'
import ScrollReveal from './ScrollReveal'

const TRANSACTIONS = [
  { category: 'Food',         merchant: 'Whole Foods Market',   amount: '-$87.50'  },
  { category: 'Transport',    merchant: 'Uber',                  amount: '-$14.20'  },
  { category: 'Utilities',    merchant: 'Con Edison',            amount: '-$124.00' },
  { category: 'Dining',       merchant: 'Blue Bottle Coffee',    amount: '-$6.50'   },
  { category: 'Software',     merchant: 'Adobe Creative Cloud',  amount: '-$54.99'  },
]

const CASH_FLOW = [
  { label: 'Income',   value: '$5,200', fill: 80 },
  { label: 'Expenses', value: '$3,140', fill: 50 },
  { label: 'Savings',  value: '$780',   fill: 20 },
]

const SUBSCRIPTIONS = [
  { name: 'Netflix',          amount: '$15.99/mo', status: 'ACTIVE'   },
  { name: 'Spotify',          amount: '$9.99/mo',  status: 'ACTIVE'   },
  { name: 'Adobe Creative',   amount: '$54.99/mo', status: 'UPCOMING' },
  { name: 'iCloud+',          amount: '$2.99/mo',  status: 'ACTIVE'   },
]

export default function FeaturesSection() {
  return (
    <section className={styles.features}>

      <ScrollReveal>
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresHeadline}>Track every dollar.</h2>
          <p className={styles.featuresDesc}>
            One dashboard for everything your money is doing, and everything it isn&apos;t.
          </p>
        </div>
      </ScrollReveal>

      {/* ── ROW 1: Spending Intelligence ──────────────────── */}
      <ScrollReveal>
        <div className={`${styles.featureRow} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Spending Intelligence</span>
            <h3 className={styles.featureH3}>Know where every dollar goes</h3>
            <p className={styles.featureText}>
              Every transaction automatically categorized, every pattern surfaced. Stop guessing and start seeing.
            </p>
          </div>
          <div className={styles.featureRight}>
            <div className={`card ${styles.mockCard}`}>
              {TRANSACTIONS.map((tx) => (
                <div key={tx.merchant} className={styles.txRow}>
                  <span className={styles.txCategory}>{tx.category}</span>
                  <span className={styles.txMerchant}>{tx.merchant}</span>
                  <span className={styles.txAmount}>{tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── ROW 2: Cash Flow ──────────────────────────────── */}
      <ScrollReveal>
        <div className={`${styles.featureRow} ${styles.featureRowReverse} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Cash Flow</span>
            <h3 className={styles.featureH3}>See what&apos;s coming in and out</h3>
            <p className={styles.featureText}>
              A clear view of income, expenses, and what&apos;s left over. Updated every time a transaction clears.
            </p>
          </div>
          <div className={styles.featureRight}>
            <div className={`card ${styles.mockCard}`}>
              {CASH_FLOW.map((row) => (
                <div key={row.label} className={styles.barRow}>
                  <span className={styles.barLabel}>{row.label}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${row.fill}%` }} />
                  </div>
                  <span className={styles.barValue}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── ROW 3: Subscriptions ──────────────────────────── */}
      <ScrollReveal>
        <div className={`${styles.featureRow} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Subscriptions</span>
            <h3 className={styles.featureH3}>Spot what you forgot you&apos;re paying for</h3>
            <p className={styles.featureText}>
              Recurring charges automatically detected and grouped. See the real monthly total before it hits.
            </p>
          </div>
          <div className={styles.featureRight}>
            <div className={`card ${styles.mockCard}`}>
              {SUBSCRIPTIONS.map((sub) => (
                <div key={sub.name} className={styles.subRow}>
                  <span className={styles.subName}>{sub.name}</span>
                  <span className={styles.subAmount}>{sub.amount}</span>
                  <span className={`${styles.subBadge} ${sub.status === 'UPCOMING' ? styles.upcoming : ''}`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

    </section>
  )
}

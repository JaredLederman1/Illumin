'use client'

import { useEffect, useRef } from 'react'
import { countUp } from '@/lib/countUp'
import styles from './page.module.css'

// Sparkline points — upward trend, y-decreasing = visually rising
const SPARKLINE = '0,72 28,68 56,71 84,60 112,55 140,57 168,46 196,40 224,34 252,27 280,20'
const SPARKLINE_AREA = `0,72 ${SPARKLINE.split(' ').slice(1).join(' ')} 280,80 0,80`

const BALANCES = [
  { label: '12 mo ago', value: '$94,200'  },
  { label: '6 mo ago',  value: '$108,500' },
  { label: 'Today',     value: '$124,850' },
]

export default function LightFeaturesSection() {
  const rowsRef   = useRef<(HTMLDivElement | null)[]>([])
  const figureRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add(styles.visible)
          // Fire countUp when the opportunity cost row enters
          if (entry.target === rowsRef.current[0] && figureRef.current) {
            countUp(figureRef.current, 23400, 1600)
          }
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.12 }
    )

    rowsRef.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <section className={styles.lightFeatures}>

      {/* Section header */}
      <div className={styles.featuresHeader}>
        <h2 className={styles.featuresHeadline}>See the cost of waiting.</h2>
        <p className={styles.featuresDesc}>
          Every month you delay is a number. Illumin shows you exactly what it is.
        </p>
      </div>

      {/* ── ROW 1: Opportunity Cost ───────────────────────── */}
      <div
        ref={(el) => { rowsRef.current[0] = el }}
        className={styles.featureRow}
      >
        <div className={styles.featureLeft}>
          <span className={styles.featureLabel}>Opportunity Cost</span>
          <h3 className={styles.featureH3}>The price of doing nothing</h3>
          <p className={styles.featureText}>
            Inaction has a dollar amount. See the compounding cost of every delayed decision, calculated from your actual accounts.
          </p>
        </div>

        <div className={styles.featureRight}>
          <div className={styles.invertedCard}>
            <p className={styles.invCardLabel}>Cost of waiting one year</p>
            <p className={styles.invCardFigure}>
              $<span ref={figureRef}>0</span>
            </p>
            <div className={styles.invCardBreakdown}>
              <span>Unrealized gains&nbsp;&nbsp;·&nbsp;&nbsp;$18,200</span>
              <span>Compounding cost&nbsp;&nbsp;·&nbsp;&nbsp;$5,200</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Net Worth ──────────────────────────────── */}
      <div
        ref={(el) => { rowsRef.current[1] = el }}
        className={`${styles.featureRow} ${styles.featureRowReverse}`}
      >
        <div className={styles.featureLeft}>
          <span className={styles.featureLabel}>Net Worth</span>
          <h3 className={styles.featureH3}>Your full picture, unified</h3>
          <p className={styles.featureText}>
            Every account in one place. Checking, savings, investments, and debt — all updating automatically so your number is always current.
          </p>
        </div>

        <div className={styles.featureRight}>
          <div className={styles.invertedCard}>
            {/* Sparkline */}
            <svg
              viewBox="0 0 280 80"
              width="100%"
              height="80"
              aria-hidden="true"
              className={styles.sparkline}
            >
              <polygon
                points={SPARKLINE_AREA}
                fill="var(--color-accent)"
                fillOpacity={0.08}
              />
              <polyline
                points={SPARKLINE}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            {/* Balance figures */}
            <div className={styles.sparkBalances}>
              {BALANCES.map((b) => (
                <div key={b.label} className={styles.sparkBalance}>
                  <span className={styles.sparkBalanceLabel}>{b.label}</span>
                  <span className={styles.sparkBalanceValue}>{b.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}

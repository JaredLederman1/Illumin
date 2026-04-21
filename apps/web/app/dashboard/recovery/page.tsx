'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRecoveryQuery, type RecoveryGap } from '@/lib/queries'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))
}

function formatDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function HeroFigure({
  label,
  value,
  tone,
  caption,
}: {
  label: string
  value: number | null
  tone: 'gold' | 'negative'
  caption: string
}) {
  const color = tone === 'gold' ? 'var(--color-gold)' : 'var(--color-negative)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(40px, 6vw, 64px)',
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          color,
          margin: 0,
        }}
      >
        {value != null ? fmt(value) : '—'}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          color: 'var(--color-text-mid)',
          lineHeight: 1.6,
          margin: 0,
          maxWidth: '440px',
        }}
      >
        {caption}
      </p>
    </div>
  )
}

function ProgressBar({ recovered, open }: { recovered: number; open: number }) {
  const total = recovered + open
  const pct = total > 0 ? (recovered / total) * 100 : 0
  return (
    <div
      style={{
        height: '2px',
        backgroundColor: 'var(--color-gold-subtle)',
        borderRadius: '1px',
        overflow: 'hidden',
        width: '100%',
      }}
      aria-label="Recovery progress"
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          height: '100%',
          backgroundColor: 'var(--color-gold)',
        }}
      />
    </div>
  )
}

function GapRow({ gap }: { gap: RecoveryGap }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '20px 24px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-gold-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--color-text)',
            margin: 0,
          }}
        >
          {gap.label}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: 'var(--color-text-mid)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {gap.description}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '22px',
            color: 'var(--color-negative)',
            letterSpacing: '-0.01em',
          }}
        >
          {fmt(gap.annualValue)}
        </span>
        {gap.actionPath && (
          <Link
            href={gap.actionPath}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: 'var(--color-gold)',
              textDecoration: 'none',
              border: '1px solid var(--color-gold-border)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 14px',
            }}
          >
            Take action &rarr;
          </Link>
        )}
      </div>
    </div>
  )
}

function RecoveredRow({ gap }: { gap: RecoveryGap }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '14px 20px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-gold-border)',
        borderRadius: 'var(--radius-lg)',
        opacity: 0.65,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            color: 'var(--color-text-mid)',
            margin: 0,
          }}
        >
          {gap.label}
        </p>
        {gap.recoveredAt && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              margin: 0,
            }}
          >
            Recovered {formatDate(gap.recoveredAt)}
          </p>
        )}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '16px',
          color: 'var(--color-text-mid)',
        }}
      >
        {fmt(gap.annualValue)}
      </span>
    </div>
  )
}

export default function RecoveryPage() {
  const { data, isLoading } = useRecoveryQuery()
  const [recoveredOpen, setRecoveredOpen] = useState(false)

  const open = data?.open ?? 0
  const recovered = data?.recovered ?? 0

  const openGaps = useMemo(
    () =>
      (data?.gaps ?? [])
        .filter(g => g.status === 'open')
        .sort((a, b) => b.annualValue - a.annualValue),
    [data],
  )
  const recoveredGaps = useMemo(
    () =>
      (data?.gaps ?? [])
        .filter(g => g.status === 'recovered')
        .sort((a, b) => {
          const ad = a.recoveredAt ? new Date(a.recoveredAt).getTime() : 0
          const bd = b.recoveredAt ? new Date(b.recoveredAt).getTime() : 0
          return bd - ad
        }),
    [data],
  )

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg)',
        padding: '40px clamp(24px, 4vw, 64px) 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--color-gold)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            margin: 0,
          }}
        >
          Recovery counter
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.5vw, 40px)',
            fontWeight: 400,
            color: 'var(--color-text)',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          What you have recovered, and what is still on the table.
        </h1>
      </header>

      {isLoading && !data && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            color: 'var(--color-text-mid)',
          }}
        >
          Loading recovery state...
        </p>
      )}

      {data && (
        <>
          <section
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-gold-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '36px clamp(24px, 4vw, 48px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '32px',
                flexWrap: 'wrap',
              }}
            >
              <HeroFigure
                label="Recovered"
                value={recovered}
                tone="gold"
                caption="Cumulative annual dollars unlocked since you signed up."
              />
              <HeroFigure
                label="Still on the table"
                value={open}
                tone="negative"
                caption="Annual dollars currently sitting in unclosed gaps."
              />
            </div>
            <ProgressBar recovered={recovered} open={open} />
          </section>

          {open === 0 ? (
            <section
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-positive-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  color: 'var(--color-text)',
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                You have closed every gap Illumin can currently see. Total recovered: {fmt(recovered)}.
              </p>
              <Link
                href="/dashboard/accounts"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  color: 'var(--color-gold)',
                  textDecoration: 'none',
                  alignSelf: 'flex-start',
                }}
              >
                Connect more accounts to surface new gaps &rarr;
              </Link>
            </section>
          ) : (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 400,
                    color: 'var(--color-text)',
                    margin: 0,
                  }}
                >
                  Still to recover
                </h2>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {openGaps.length} {openGaps.length === 1 ? 'gap' : 'gaps'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {openGaps.map(gap => (
                  <GapRow key={gap.id} gap={gap} />
                ))}
              </div>
            </section>
          )}

          {recoveredGaps.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setRecoveredOpen(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 400,
                    color: 'var(--color-text)',
                    margin: 0,
                  }}
                >
                  Recovered
                </h2>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--color-gold)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {recoveredGaps.length} {recoveredGaps.length === 1 ? 'gap' : 'gaps'} {recoveredOpen ? '▲' : '▼'}
                </span>
              </button>
              {recoveredOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recoveredGaps.map(gap => (
                    <RecoveredRow key={gap.id} gap={gap} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

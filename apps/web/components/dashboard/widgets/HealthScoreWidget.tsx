'use client'

import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import WidgetCard from './WidgetCard'

interface ScoreRingProps {
  score: number
}

function ScoreRing({ score }: ScoreRingProps) {
  const radius = 48
  const stroke = 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const tone =
    score >= 75
      ? 'var(--color-positive)'
      : score >= 50
      ? 'var(--color-gold)'
      : 'var(--color-negative)'
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle
        cx={60}
        cy={60}
        r={radius}
        fill="none"
        stroke="var(--color-gold-subtle)"
        strokeWidth={stroke}
      />
      <circle
        cx={60}
        cy={60}
        r={radius}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text
        x={60}
        y={64}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={22}
        fill="var(--color-text)"
      >
        {Math.round(score)}
      </text>
    </svg>
  )
}

export default function HealthScoreWidget() {
  const { scoreReport } = useDashboard()
  const score = scoreReport?.overallScore ?? null

  return (
    <WidgetCard label="Financial health" title="Your score">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {score != null ? (
          <ScoreRing score={score} />
        ) : (
          <div
            style={{
              width: '120px',
              height: '120px',
              border: '1px dashed var(--color-border)',
              borderRadius: '50%',
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-text-mid)',
              margin: 0,
            }}
          >
            {score != null
              ? 'Weighted across benefits, savings, and retirement.'
              : 'Finish onboarding to see your score.'}
          </p>
          <Link
            href="/dashboard/score"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: 'var(--color-gold)',
              textDecoration: 'none',
            }}
          >
            Full breakdown →
          </Link>
        </div>
      </div>
    </WidgetCard>
  )
}

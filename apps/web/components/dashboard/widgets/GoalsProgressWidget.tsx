'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import WidgetCard from './WidgetCard'

interface Goal {
  id: string
  name: string
  percentage: number
}

export default function GoalsProgressWidget() {
  const { authToken } = useDashboard()
  const [goals, setGoals] = useState<Goal[] | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {}
    fetch('/api/goals', { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.goals) setGoals(d.goals)
      })
      .catch(() => {})
  }, [authToken])

  return (
    <WidgetCard label="Goals progress" title="Your milestones">
      {goals == null ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Loading…
        </p>
      ) : goals.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Finish onboarding to see goal tracking.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {goals.slice(0, 3).map(g => (
            <div key={g.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text-mid)',
                  marginBottom: '4px',
                }}
              >
                <span>{g.name}</span>
                <span>{Math.round(g.percentage)}%</span>
              </div>
              <div
                style={{
                  height: '3px',
                  backgroundColor: 'var(--color-gold-subtle)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, g.percentage)}%`,
                    backgroundColor: 'var(--color-gold)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/dashboard/goals"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        View all →
      </Link>
    </WidgetCard>
  )
}

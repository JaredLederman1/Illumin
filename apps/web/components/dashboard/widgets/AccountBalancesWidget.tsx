'use client'

import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import WidgetCard from './WidgetCard'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n))

export default function AccountBalancesWidget() {
  const { accounts } = useDashboard()
  const ordered = [...accounts].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))

  return (
    <WidgetCard label="Accounts" title="Balances">
      {ordered.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          No accounts linked.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {ordered.slice(0, 5).map(a => {
            const isLiability = (a as { classification?: string }).classification === 'liability'
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text-mid)',
                }}
              >
                <span>
                  {a.institutionName}
                  {a.last4 ? ` ····${a.last4}` : ''}
                </span>
                <span
                  style={{
                    color: isLiability
                      ? 'var(--color-negative)'
                      : 'var(--color-text)',
                  }}
                >
                  {fmt(a.balance)}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <Link
        href="/dashboard/accounts"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        Manage →
      </Link>
    </WidgetCard>
  )
}

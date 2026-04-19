'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboardData'
import { detectRecurringMerchants } from '@/lib/data'
import WidgetCard from './WidgetCard'
import MetricDisplay from './MetricDisplay'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

export default function RecurringChargesWidget() {
  const { transactions } = useDashboard()
  const summary = useMemo(() => {
    const recurring = detectRecurringMerchants(transactions)
    const monthlySpend = new Map<string, number>()
    // Monthly approximation: sum last 30 days of recurring charges.
    const since = new Date()
    since.setDate(since.getDate() - 30)
    for (const tx of transactions) {
      if (tx.amount >= 0) continue
      if (!tx.merchantName || !recurring.has(tx.merchantName)) continue
      const d = new Date(tx.date)
      if (d < since) continue
      monthlySpend.set(
        tx.merchantName,
        (monthlySpend.get(tx.merchantName) ?? 0) + Math.abs(tx.amount),
      )
    }
    const total = Array.from(monthlySpend.values()).reduce((s, v) => s + v, 0)
    const topMerchants = Array.from(monthlySpend.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    return { count: recurring.size, total, topMerchants }
  }, [transactions])

  return (
    <WidgetCard
      label="Recurring charges"
      title="Monthly subscriptions"
      subtitle="Everything Illumin detects as a recurring charge, summed over the last 30 days."
    >
      <MetricDisplay
        value={fmt(summary.total)}
        label={`${summary.count} merchant${summary.count === 1 ? '' : 's'}`}
      />
      {summary.topMerchants.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '4px',
          }}
        >
          {summary.topMerchants.map(([name, amt]) => (
            <div
              key={name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-text-mid)',
              }}
            >
              <span>{name}</span>
              <span>{fmt(amt)}</span>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/dashboard/recurring"
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

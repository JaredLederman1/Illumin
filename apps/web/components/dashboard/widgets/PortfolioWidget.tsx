'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useDashboard } from '@/lib/dashboardData'
import DonutChart from '@/components/ui/DonutChart'
import WidgetCard from './WidgetCard'

interface Alloc {
  label: string
  value: number
  percentage: number
}

interface PortfolioResponse {
  totalValue: number
  allocationByType: Alloc[]
  hasHoldings: boolean
}

const PALETTE = ['#B8913A', '#2D6A4F', '#8B4513', '#4A6785', '#9B7B4A', '#7A6A5A']

export default function PortfolioWidget() {
  const { authToken } = useDashboard()
  const [data, setData] = useState<PortfolioResponse | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {}
    fetch('/api/portfolio', { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) setData(d)
      })
      .catch(() => {})
  }, [authToken])

  return (
    <WidgetCard label="Portfolio" title="Asset allocation">
      {!data?.hasHoldings ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Link an investment account to see your allocation.
        </p>
      ) : (
        <DonutChart
          data={data.allocationByType.map((a, i) => ({
            category: a.label,
            amount: a.value,
            color: PALETTE[i % PALETTE.length],
          }))}
        />
      )}
      <Link
        href="/dashboard/portfolio"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        Full breakdown →
      </Link>
    </WidgetCard>
  )
}

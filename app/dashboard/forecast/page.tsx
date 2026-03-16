'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import ForecastChart from '@/components/ui/ForecastChart'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const card = {
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
} as const

const sectionLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: '#A89880',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

interface ForecastData {
  avgIncome: number
  avgExpenses: number
  avgSavings: number
  checkingBalance: number
  emergencyFundMonths: number
  historicalMonths: { month: string; balance: number; projected: boolean }[]
  projectedMonths: { month: string; balance: number; projected: boolean }[]
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px', textAlign: 'center' }}
    >
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid rgba(184,145,58,0.25)', backgroundColor: 'rgba(184,145,58,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
        ◈
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: '#1A1714', marginBottom: '8px' }}>No forecast data</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', lineHeight: 1.7 }}>Connect a bank account to generate a 6-month cash flow projection.</p>
      </div>
      <Link href="/dashboard/accounts" style={{ padding: '10px 24px', backgroundColor: '#B8913A', border: 'none', borderRadius: '2px', color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
        Connect an Account
      </Link>
    </motion.div>
  )
}

export default function ForecastPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData]       = useState<ForecastData | null>(null)

  useEffect(() => {
    fetch('/api/forecast')
      .then(r => r.json())
      .then(d => { if (d.avgIncome !== undefined) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', letterSpacing: '0.06em' }}>Loading…</p>
      </div>
    )
  }

  if (!data) return <EmptyState />

  const { avgIncome, avgExpenses, avgSavings, emergencyFundMonths, historicalMonths, projectedMonths } = data
  const forecastData = [...historicalMonths, ...projectedMonths]

  const summaryItems = [
    { label: 'Avg Monthly Income',   value: avgIncome,   color: '#2D6A4F' },
    { label: 'Avg Monthly Expenses', value: avgExpenses, color: '#8B2635' },
    { label: 'Avg Monthly Savings',  value: avgSavings,  color: '#B8913A' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {summaryItems.map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
            style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color }}>{fmt(value)}</p>
          </motion.div>
        ))}
      </div>

      {/* Forecast chart */}
      <div style={card}>
        <p style={sectionLabel}>Checking Balance: 6-Month Projection</p>
        <ForecastChart data={forecastData} emergencyFundMonths={emergencyFundMonths} />
      </div>

      {/* Projection table */}
      <div style={card}>
        <p style={sectionLabel}>Projected Monthly Balances</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Month', 'Projected Balance', 'Type'].map(h => (
                <th key={h} style={{ padding: '8px 16px 12px', textAlign: 'left', fontSize: '10px', color: '#A89880', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 400, borderBottom: '1px solid rgba(184,145,58,0.2)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projectedMonths.map(({ month, balance }, i) => (
              <tr key={`${month}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(184,145,58,0.02)' }}>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#1A1714', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{month}</td>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#2D6A4F', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{fmt(balance)}</td>
                <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>
                  <span style={{ fontSize: '9px', color: '#B8913A', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(184,145,58,0.3)', padding: '2px 7px', borderRadius: '2px' }}>
                    Projected
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

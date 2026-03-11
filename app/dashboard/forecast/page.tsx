'use client'

import ForecastChart from '@/components/ui/ForecastChart'
import { mockMonthlyData, mockAccounts } from '@/lib/mockData'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ForecastPage() {
  const avgIncome = mockMonthlyData.reduce((s, m) => s + m.income, 0) / mockMonthlyData.length
  const avgExpenses = mockMonthlyData.reduce((s, m) => s + m.expenses, 0) / mockMonthlyData.length
  const avgSavings = avgIncome - avgExpenses

  const checkingBalance = mockAccounts.find(a => a.accountType === 'checking')?.balance ?? 12450
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()

  // Last 3 months actuals + 6 months projected
  const historicalMonths = mockMonthlyData.slice(-3).map((m, i) => ({
    month: m.month,
    balance: checkingBalance - (avgSavings * (2 - i)),
    projected: false,
  }))
  historicalMonths[historicalMonths.length - 1].balance = checkingBalance

  const projectedMonths = Array.from({ length: 6 }, (_, i) => {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    return {
      month: monthNames[futureDate.getMonth()],
      balance: Math.round(checkingBalance + avgSavings * (i + 1)),
      projected: true,
    }
  })

  const forecastData = [...historicalMonths, ...projectedMonths]
  const emergencyFundMonths = checkingBalance / avgExpenses

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Avg Monthly Income', value: avgIncome, color: '#8aad78' },
          { label: 'Avg Monthly Expenses', value: avgExpenses, color: '#c4806a' },
          { label: 'Avg Monthly Savings', value: avgSavings, color: '#c4a882' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: '#140c02',
            border: '1px solid rgba(196,168,130,0.12)',
            borderRadius: '10px',
            padding: '20px',
          }}>
            <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</p>
            <p style={{ fontSize: '22px', color, fontFamily: 'var(--font-mono)' }}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {/* Forecast chart */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
          Checking Balance — 6-Month Projection
        </p>
        <ForecastChart data={forecastData} emergencyFundMonths={emergencyFundMonths} />
      </div>

      {/* Projection table */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
          Projected Monthly Balances
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
          {['Month', 'Projected Balance', 'Type'].map(h => (
            <div key={h} style={{ padding: '8px 12px', fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(196,168,130,0.1)' }}>{h}</div>
          ))}
          {projectedMonths.map(({ month, balance }) => (
            <>
              <div key={`${month}-m`} style={{ padding: '12px 12px', fontSize: '13px', color: '#c4a882', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)' }}>{month}</div>
              <div key={`${month}-b`} style={{ padding: '12px 12px', fontSize: '13px', color: '#8aad78', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)' }}>{formatCurrency(balance)}</div>
              <div key={`${month}-t`} style={{ padding: '12px 12px', fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)', letterSpacing: '0.06em' }}>PROJECTED</div>
            </>
          ))}
        </div>
      </div>
    </div>
  )
}

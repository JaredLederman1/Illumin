'use client'

import { mockMonthlyData } from '@/lib/mockData'
import BarChart from '@/components/ui/BarChart'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function CashFlowPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Monthly cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {mockMonthlyData.slice(-3).map(({ month, income, expenses, savings }) => {
          const savingsRate = ((savings / income) * 100).toFixed(0)
          return (
            <div key={month} style={{
              backgroundColor: '#140c02',
              border: '1px solid rgba(196,168,130,0.12)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <p style={{ color: '#c4a882', fontFamily: 'var(--font-heading)', marginBottom: '16px', fontSize: '16px' }}>{month} 2026</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>Income</span>
                  <span style={{ fontSize: '13px', color: '#8aad78', fontFamily: 'var(--font-mono)' }}>{formatCurrency(income)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>Expenses</span>
                  <span style={{ fontSize: '13px', color: '#c4806a', fontFamily: 'var(--font-mono)' }}>{formatCurrency(expenses)}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(196,168,130,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>Net Savings</span>
                  <span style={{ fontSize: '13px', color: '#e8d5b0', fontFamily: 'var(--font-mono)' }}>{formatCurrency(savings)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>Savings Rate</span>
                  <span style={{ fontSize: '13px', color: '#c4a882', fontFamily: 'var(--font-mono)' }}>{savingsRate}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 6-month overview */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
          6-Month Overview
        </p>
        <BarChart data={mockMonthlyData} />
      </div>

      {/* All months table */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' }}>
          Monthly Breakdown
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0' }}>
          {['Month', 'Income', 'Expenses', 'Net Savings', 'Rate'].map(h => (
            <div key={h} style={{ padding: '8px 12px', fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(196,168,130,0.1)' }}>{h}</div>
          ))}
          {mockMonthlyData.map(({ month, income, expenses, savings }) => {
            const rate = ((savings / income) * 100).toFixed(0)
            return (
              <>
                <div key={`${month}-month`} style={{ padding: '12px 12px', fontSize: '13px', color: '#c4a882', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)' }}>{month}</div>
                <div key={`${month}-income`} style={{ padding: '12px 12px', fontSize: '13px', color: '#8aad78', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)' }}>{formatCurrency(income)}</div>
                <div key={`${month}-expenses`} style={{ padding: '12px 12px', fontSize: '13px', color: '#c4806a', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)' }}>{formatCurrency(expenses)}</div>
                <div key={`${month}-savings`} style={{ padding: '12px 12px', fontSize: '13px', color: '#e8d5b0', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)' }}>{formatCurrency(savings)}</div>
                <div key={`${month}-rate`} style={{ padding: '12px 12px', fontSize: '13px', color: '#c4a882', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(196,168,130,0.06)' }}>{rate}%</div>
              </>
            )
          })}
        </div>
      </div>
    </div>
  )
}

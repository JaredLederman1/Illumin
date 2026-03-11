'use client'

import NetWorthCard from '@/components/ui/NetWorthCard'
import DonutChart from '@/components/ui/DonutChart'
import BarChart from '@/components/ui/BarChart'
import TransactionRow from '@/components/ui/TransactionRow'
import { mockNetWorth, mockTransactions, mockSpendingByCategory, mockMonthlyData } from '@/lib/mockData'

export default function DashboardPage() {
  const recentTransactions = mockTransactions.slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Net Worth Hero */}
      <NetWorthCard
        current={mockNetWorth.current}
        lastMonth={mockNetWorth.lastMonth}
        totalAssets={mockNetWorth.totalAssets}
        totalLiabilities={mockNetWorth.totalLiabilities}
      />

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Spending Donut */}
        <div style={{
          backgroundColor: '#140c02',
          border: '1px solid rgba(196,168,130,0.12)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Spending by Category
          </p>
          <DonutChart data={mockSpendingByCategory} />
        </div>

        {/* Income vs Expenses Bar */}
        <div style={{
          backgroundColor: '#140c02',
          border: '1px solid rgba(196,168,130,0.12)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Income vs Expenses — Last 6 Months
          </p>
          <BarChart data={mockMonthlyData} />
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Recent Transactions
          </p>
        </div>
        {recentTransactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            merchantName={tx.merchantName}
            amount={tx.amount}
            category={tx.category}
            date={tx.date}
            pending={tx.pending}
          />
        ))}
      </div>
    </div>
  )
}

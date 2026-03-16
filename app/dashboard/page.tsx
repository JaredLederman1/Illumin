'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NetWorthCard from '@/components/ui/NetWorthCard'
import DonutChart from '@/components/ui/DonutChart'
import BarChart from '@/components/ui/BarChart'
import TransactionRow from '@/components/ui/TransactionRow'

const card = {
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
} as const

const label = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: '#A89880',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

interface NetWorthState {
  current: number
  lastMonth: number
  totalAssets: number
  totalLiabilities: number
}

interface Transaction {
  id: string
  merchantName: string | null
  amount: number
  category: string | null
  date: string | Date
  pending: boolean
}

interface SpendingCategory {
  category: string
  amount: number
  color: string
}

interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}

export default function DashboardPage() {
  const [loading, setLoading]                 = useState(true)
  const [netWorth, setNetWorth]               = useState<NetWorthState | null>(null)
  const [transactions, setTransactions]       = useState<Transaction[]>([])
  const [monthlyData, setMonthlyData]         = useState<MonthlyData[]>([])
  const [spendingByCategory, setSpending]     = useState<SpendingCategory[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/networth').then(r => r.json()).catch(() => null),
      fetch('/api/transactions?limit=10').then(r => r.json()).catch(() => null),
      fetch('/api/cashflow').then(r => r.json()).catch(() => null),
    ]).then(([nw, tx, cf]) => {
      if (nw?.netWorth !== undefined) {
        setNetWorth({
          current:          nw.netWorth,
          lastMonth:        nw.previousNetWorth ?? nw.netWorth,
          totalAssets:      nw.totalAssets,
          totalLiabilities: nw.totalLiabilities,
        })
      }
      if (Array.isArray(tx?.transactions) && tx.transactions.length > 0) {
        setTransactions(tx.transactions)
      }
      if (cf?.months?.length)              setMonthlyData(cf.months)
      if (cf?.spendingByCategory?.length)  setSpending(cf.spendingByCategory)
    }).finally(() => setLoading(false))
  }, [])

  const hasData = netWorth !== null && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', letterSpacing: '0.06em' }}>
          Loading…
        </p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', gap: '20px', textAlign: 'center',
        }}
      >
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '1px solid rgba(184,145,58,0.25)',
          backgroundColor: 'rgba(184,145,58,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: '#1A1714', marginBottom: '8px' }}>
            No data yet
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', lineHeight: 1.7 }}>
            Connect a bank account to see your net worth, spending, and transactions here.
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          style={{
            padding: '10px 24px',
            backgroundColor: '#B8913A',
            border: 'none',
            borderRadius: '2px',
            color: '#FFFFFF',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <NetWorthCard
        current={netWorth.current}
        lastMonth={netWorth.lastMonth}
        totalAssets={netWorth.totalAssets}
        totalLiabilities={netWorth.totalLiabilities}
      />

      {/* Thin gold rule */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(184,145,58,0.35) 25%, rgba(184,145,58,0.35) 75%, transparent)',
      }} />

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        <div style={card}>
          <p style={label}>Spending by Category</p>
          <DonutChart data={spendingByCategory} />
        </div>
        <div style={card}>
          <p style={label}>Income vs Expenses, Last 6 Months</p>
          <BarChart data={monthlyData} />
        </div>
      </motion.div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.16 }}
          style={card}
        >
          <p style={label}>Recent Transactions</p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                merchantName={tx.merchantName}
                amount={tx.amount}
                category={tx.category}
                date={tx.date}
                pending={tx.pending}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

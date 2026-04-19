'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDashboard } from '@/lib/dashboardData'
import { detectRecurringMerchants } from '@/lib/data'
import TransactionRow from '@/components/ui/TransactionRow'
import WidgetCard from './WidgetCard'

export default function RecentTransactionsWidget() {
  const { transactions, accounts } = useDashboard()
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id, a])),
    [accounts],
  )
  const recurring = useMemo(
    () => detectRecurringMerchants(transactions),
    [transactions],
  )

  return (
    <WidgetCard label="Recent transactions">
      {transactions.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          No transactions yet.
        </p>
      ) : (
        <>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {transactions.slice(0, 6).map(tx => {
              const acct = accountMap[tx.accountId]
              return (
                <TransactionRow
                  key={tx.id}
                  id={tx.id}
                  merchantName={tx.merchantName}
                  amount={tx.amount}
                  category={tx.category}
                  date={tx.date}
                  pending={tx.pending}
                  accountName={acct?.institutionName ?? null}
                  last4={acct?.last4 ?? null}
                  recurring={tx.merchantName ? recurring.has(tx.merchantName) : false}
                />
              )
            })}
          </motion.div>
          <Link
            href="/dashboard/transactions"
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
        </>
      )}
    </WidgetCard>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TransactionRow from '@/components/ui/TransactionRow'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import { detectRecurringMerchants } from '@/lib/data'

// Maps display label → Plaid personal_finance_category.primary values
const CATEGORY_MAP: Record<string, string[]> = {
  Income:        ['INCOME', 'TRANSFER_IN'],
  Groceries:     ['FOOD_AND_DRINK'],
  Dining:        ['FOOD_AND_DRINK'],
  Entertainment: ['ENTERTAINMENT', 'RECREATION'],
  Transport:     ['TRANSPORTATION', 'TRAVEL'],
  Utilities:     ['HOME_IMPROVEMENT', 'UTILITIES', 'RENT_AND_UTILITIES'],
  Shopping:      ['GENERAL_MERCHANDISE', 'PERSONAL_CARE', 'APPAREL_AND_ACCESSORIES'],
  Health:        ['MEDICAL', 'HEALTHCARE'],
  Travel:        ['TRAVEL', 'TRANSPORTATION'],
}
const CATEGORIES = ['All', ...Object.keys(CATEGORY_MAP)]
const PAGE_SIZE = 10

const controlStyle = {
  padding: '8px 12px',
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.25)',
  borderRadius: '2px',
  color: '#1A1714',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
} as const

export default function TransactionsPage() {
  const { loading, accounts, transactions } = useDashboard()

  const [search,        setSearch]        = useState('')
  const [category,      setCategory]      = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [page,          setPage]          = useState(1)

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() => detectRecurringMerchants(transactions), [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch   = !search || (tx.merchantName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || (CATEGORY_MAP[category] ?? [category]).includes(tx.category ?? '')
      const matchAccount  = accountFilter === 'All' || tx.accountId === accountFilter
      return matchSearch && matchCategory && matchAccount
    })
  }, [transactions, search, category, accountFilter])

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', letterSpacing: '0.06em' }}>Loading…</p>
      </div>
    )
  }

  if (transactions.length === 0) {
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
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: '#1A1714', marginBottom: '8px' }}>No transactions yet</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', lineHeight: 1.7 }}>Connect a bank account to import your transaction history.</p>
        </div>
        <Link href="/dashboard/accounts" style={{ padding: '10px 24px', backgroundColor: '#B8913A', border: 'none', borderRadius: '2px', color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const pageBtn = (active: boolean) => ({
    padding: '6px 14px',
    backgroundColor: active ? '#B8913A' : '#FFFFFF',
    border: '1px solid rgba(184,145,58,0.35)',
    borderRadius: '2px',
    color: active ? '#FFFFFF' : '#B8913A',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    cursor: active ? 'not-allowed' : 'pointer',
    opacity: active ? 0.5 : 1,
  } as const)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(184,145,58,0.15)',
        borderRadius: '2px',
        padding: '20px 24px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search merchant..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ ...controlStyle, minWidth: '200px' }}
        />
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} style={controlStyle}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1) }} style={controlStyle}>
          <option value="All">All Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.institutionName}{a.last4 ? ` .... ${a.last4}` : ''}</option>
          ))}
        </select>
        <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
          {filtered.length} transactions
        </span>
      </div>

      {/* List */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(184,145,58,0.15)',
        borderRadius: '2px',
        padding: '28px',
      }}>
        {paginated.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#A89880', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '40px 0' }}>
            No transactions match your filters
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${category}-${accountFilter}-${search}-${page}`}
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.025 } } }}
            >
              {paginated.map(tx => {
                const acct = accountMap[tx.accountId]
                return (
                  <TransactionRow
                    key={tx.id}
                    merchantName={tx.merchantName}
                    amount={tx.amount}
                    category={tx.category}
                    date={tx.date}
                    pending={tx.pending}
                    accountName={acct?.institutionName ?? null}
                    last4={acct?.last4 ?? null}
                    recurring={tx.merchantName ? recurringMerchants.has(tx.merchantName) : false}
                  />
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(184,145,58,0.1)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>
              Prev
            </button>
            <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', padding: '0 8px' }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

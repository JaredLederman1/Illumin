'use client'

import { useState, useMemo } from 'react'
import TransactionRow from '@/components/ui/TransactionRow'
import { mockTransactions, mockAccounts } from '@/lib/mockData'

const CATEGORIES = ['All', 'Income', 'Groceries', 'Dining', 'Entertainment', 'Transport', 'Utilities', 'Shopping', 'Health', 'Travel']
const PAGE_SIZE = 10

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return mockTransactions.filter(tx => {
      const matchSearch = !search || (tx.merchantName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || tx.category === category
      const matchAccount = accountFilter === 'All' || tx.accountId === accountFilter
      return matchSearch && matchCategory && matchAccount
    })
  }, [search, category, accountFilter])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const inputStyle = {
    padding: '8px 12px',
    backgroundColor: '#0d0800',
    border: '1px solid rgba(196,168,130,0.2)',
    borderRadius: '6px',
    color: '#e8d5b0',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Filters */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '20px',
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
          style={{ ...inputStyle, minWidth: '200px' }}
        />
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          style={inputStyle}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={accountFilter}
          onChange={e => { setAccountFilter(e.target.value); setPage(1) }}
          style={inputStyle}
        >
          <option value="All">All Accounts</option>
          {mockAccounts.map(a => (
            <option key={a.id} value={a.id}>{a.institutionName} ···· {a.last4}</option>
          ))}
        </select>
        <span style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
          {filtered.length} transactions
        </span>
      </div>

      {/* Transaction list */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        {paginated.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#7a6040', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '32px 0' }}>
            No transactions found
          </p>
        ) : (
          paginated.map(tx => (
            <TransactionRow
              key={tx.id}
              merchantName={tx.merchantName}
              amount={tx.amount}
              category={tx.category}
              date={tx.date}
              pending={tx.pending}
            />
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(196,168,130,0.08)' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(196,168,130,0.08)',
                border: '1px solid rgba(196,168,130,0.2)',
                borderRadius: '4px',
                color: page === 1 ? '#7a6040' : '#c4a882',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)', padding: '6px 12px' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(196,168,130,0.08)',
                border: '1px solid rgba(196,168,130,0.2)',
                borderRadius: '4px',
                color: page === totalPages ? '#7a6040' : '#c4a882',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

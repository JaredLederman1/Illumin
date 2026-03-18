'use client'

import { useState, useRef, Suspense, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlaidLink } from 'react-plaid-link'
import AccountCard from '@/components/ui/AccountCard'
import { useDashboard } from '@/lib/dashboardData'

interface Account {
  id: string
  institutionName: string
  accountType: string
  classification?: string
  balance: number
  last4: string | null
}

interface PlaidOnSuccessMetadata {
  institution: { name: string; institution_id: string } | null
  accounts: Array<{
    id: string
    name: string
    mask: string | null
    type: string
    subtype: string | null
  }>
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function InstitutionGroup({
  name,
  accounts,
  onRemove,
}: {
  name: string
  accounts: Account[]
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const initials = getInitials(name)

  return (
    <div style={{ border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', backgroundColor: '#FFFFFF', border: 'none', cursor: 'pointer',
          transition: 'background-color 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(184,145,58,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 500, color: '#B8913A', fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '14px', color: '#1A1714', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: '2px' }}>
              {name}
            </p>
            <p style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 400, color: total < 0 ? '#8B2635' : '#1A1714' }}>
            {fmt(total)}
          </p>
          <span style={{ fontSize: '10px', color: '#A89880', transition: 'transform 200ms ease', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {accounts.map(account => (
              <AccountCard
                key={account.id}
                id={account.id}
                accountType={account.accountType}
                classification={account.classification}
                balance={account.balance}
                last4={account.last4}
                onRemove={onRemove}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConnectButton({
  onSuccess,
}: {
  onSuccess: (accounts: Account[]) => void
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plaid/create-link-token')
      .then(r => r.json())
      .then(data => {
        if (data.linkToken) setLinkToken(data.linkToken)
        else setError('Could not initialize connection. Check Plaid credentials.')
      })
      .catch(() => setError('Could not initialize connection.'))
  }, [])

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidOnSuccessMetadata) => {
      setConnecting(true)
      setError(null)
      try {
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken,
            institutionName: metadata.institution?.name ?? 'Connected Institution',
            accounts: metadata.accounts,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Exchange failed')
        onSuccess(data.accounts ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
      } finally {
        setConnecting(false)
      }
    },
    [onSuccess]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handlePlaidSuccess,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
      <button
        onClick={() => open()}
        disabled={!ready || connecting}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px',
          backgroundColor: 'transparent', border: '1px solid rgba(184,145,58,0.35)', borderRadius: '2px',
          color: '#B8913A', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
          cursor: (!ready || connecting) ? 'not-allowed' : 'pointer',
          opacity: (!ready || connecting) ? 0.6 : 1,
        }}
      >
        {connecting ? 'Connecting...' : '+ Connect Account'}
      </button>
      {error && (
        <p style={{ fontSize: '11px', color: '#8B2635', fontFamily: 'var(--font-mono)' }}>{error}</p>
      )}
    </div>
  )
}

function AccountsContent() {
  const { loading, accounts, setAccounts, refresh } = useDashboard()
  const [resetting, setResetting] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleRemove = (id: string) => setAccounts(prev => prev.filter(a => a.id !== id))

  const handleConnectSuccess = async (newAccounts: Account[]) => {
    setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully. Refreshing data…` })
    await refresh()
    setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully.` })
  }

  const handleReset = async () => {
    if (!confirm('Delete all accounts and transactions so you can re-connect?')) return
    setResetting(true)
    try {
      const res = await fetch('/api/plaid/reset', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        await refresh()
        setBanner({ type: 'success', message: `Reset complete: removed ${data.deletedAccounts} account(s) and ${data.deletedTransactions} transaction(s).` })
      } else {
        setBanner({ type: 'error', message: 'Reset failed: ' + (data.error ?? 'unknown error') })
      }
    } catch {
      setBanner({ type: 'error', message: 'Reset request failed' })
    } finally {
      setResetting(false)
    }
  }

  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    if (!acc[a.institutionName]) acc[a.institutionName] = []
    acc[a.institutionName].push(a)
    return acc
  }, {})

  const totalAssets = accounts.filter(a => a.classification === 'asset').reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accounts.filter(a => a.classification === 'liability').reduce((s, a) => s + Math.abs(a.balance), 0)

  const card = { backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '28px' } as const
  const labelStyle = { fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', textTransform: 'uppercase' as const, letterSpacing: '0.16em' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {banner && (
        <div style={{
          padding: '13px 18px',
          backgroundColor: banner.type === 'success' ? 'rgba(45,106,79,0.06)' : 'rgba(139,38,53,0.06)',
          border: `1px solid ${banner.type === 'success' ? 'rgba(45,106,79,0.2)' : 'rgba(139,38,53,0.2)'}`,
          borderRadius: '2px',
          color: banner.type === 'success' ? '#2D6A4F' : '#8B2635',
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {banner.message}
          <button
            onClick={() => setBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px', lineHeight: 1, opacity: 0.6, padding: '0 0 0 12px' }}
          >
            x
          </button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Assets',      value: totalAssets,                   color: '#2D6A4F' },
          { label: 'Total Liabilities', value: totalLiabilities,              color: '#8B2635' },
          { label: 'Net Worth',         value: totalAssets - totalLiabilities, color: '#B8913A' },
        ].map(({ label: lbl, value, color }) => (
          <div key={lbl} style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>{lbl}</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Connected accounts */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <p style={labelStyle}>Connected Accounts</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleReset}
              disabled={resetting}
              title="Dev only: delete all accounts and transactions to re-connect"
              style={{
                padding: '8px 12px', backgroundColor: 'transparent',
                border: '1px solid rgba(139,38,53,0.3)', borderRadius: '2px',
                color: '#8B2635', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.5 : 1,
              }}
              onMouseEnter={e => !resetting && (e.currentTarget.style.backgroundColor = 'rgba(139,38,53,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {resetting ? 'Resetting...' : 'Reset [dev]'}
            </button>

            <ConnectButton onSuccess={handleConnectSuccess} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ color: '#A89880', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '20px 0' }}>Loading accounts...</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p style={{ color: '#A89880', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '20px 0' }}>No accounts connected yet.</p>
          ) : (
            Object.entries(grouped).map(([institution, accts]) => (
              <InstitutionGroup
                key={institution}
                name={institution}
                accounts={accts}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsContent />
    </Suspense>
  )
}

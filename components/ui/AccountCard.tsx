'use client'

import { useState } from 'react'

interface AccountCardProps {
  id?: string
  institutionName: string
  accountType: string
  balance: number
  last4?: string | null
  onRemove?: (id: string) => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

const accountTypeLabel: Record<string, string> = {
  checking:   'Checking',
  savings:    'Savings',
  credit:     'Credit Card',
  brokerage:  'Brokerage',
  investment: 'Investment',
}

export default function AccountCard({ id, institutionName, accountType, balance, last4, onRemove }: AccountCardProps) {
  const isNegative = balance < 0
  const initials = institutionName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    if (!id) return
    setRemoving(true)
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    onRemove?.(id)
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid rgba(184,145,58,0.15)',
      borderRadius: '2px',
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'border-color 150ms ease',
      opacity: removing ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: 'rgba(184,145,58,0.08)',
          border: '1px solid rgba(184,145,58,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 500,
          color: '#B8913A',
          fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <p style={{
            fontSize: '14px',
            color: '#1A1714',
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            marginBottom: '2px',
          }}>
            {institutionName}
          </p>
          <p style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {accountTypeLabel[accountType] ?? accountType}{last4 ? ` ···· ${last4}` : ''}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {id && !removing && (
          confirming ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#8B2635', fontFamily: 'var(--font-mono)' }}>Remove?</span>
              <button
                onClick={handleRemove}
                style={{ fontSize: '11px', color: '#8B2635', fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline' }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              style={{ fontSize: '10px', color: '#A89880', fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8B2635')}
              onMouseLeave={e => (e.currentTarget.style.color = '#A89880')}
            >
              Remove
            </button>
          )
        )}

        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            fontWeight: 400,
            color: isNegative ? '#8B2635' : '#1A1714',
          }}>
            {formatCurrency(balance)}
          </p>
          <p style={{ fontSize: '10px', color: '#A89880', fontFamily: 'var(--font-mono)', marginTop: '2px', letterSpacing: '0.04em' }}>
            Current balance
          </p>
        </div>
      </div>
    </div>
  )
}

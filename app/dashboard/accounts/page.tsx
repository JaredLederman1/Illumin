'use client'

import { useState } from 'react'
import AccountCard from '@/components/ui/AccountCard'
import { mockAccounts } from '@/lib/mockData'

export default function AccountsPage() {
  const [connecting, setConnecting] = useState(false)

  const totalAssets = mockAccounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = Math.abs(mockAccounts.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0))

  const handleConnect = async (connectorId: string) => {
    setConnecting(true)
    try {
      const res = await fetch(`/api/akoya/connect?connectorId=${connectorId}`)
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (err) {
      console.error(err)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Assets', value: totalAssets, color: '#8aad78' },
          { label: 'Total Liabilities', value: totalLiabilities, color: '#c4806a' },
          { label: 'Net Worth', value: totalAssets - totalLiabilities, color: '#c4a882' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: '#140c02',
            border: '1px solid rgba(196,168,130,0.12)',
            borderRadius: '10px',
            padding: '20px',
          }}>
            <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</p>
            <p style={{ fontSize: '22px', color, fontFamily: 'var(--font-mono)' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Account List */}
      <div style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Connected Accounts
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleConnect('schwab')}
              disabled={connecting}
              style={{
                padding: '8px 14px',
                backgroundColor: 'rgba(196,168,130,0.08)',
                border: '1px solid rgba(196,168,130,0.2)',
                borderRadius: '6px',
                color: '#c4a882',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              + Connect Schwab
            </button>
            <button
              onClick={() => handleConnect('capital-one')}
              disabled={connecting}
              style={{
                padding: '8px 14px',
                backgroundColor: 'rgba(196,168,130,0.08)',
                border: '1px solid rgba(196,168,130,0.2)',
                borderRadius: '6px',
                color: '#c4a882',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              + Connect Capital One
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mockAccounts.map((account) => (
            <AccountCard
              key={account.id}
              institutionName={account.institutionName}
              accountType={account.accountType}
              balance={account.balance}
              last4={account.last4}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

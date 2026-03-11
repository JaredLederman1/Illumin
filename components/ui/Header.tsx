'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/accounts': 'Accounts',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/cashflow': 'Cash Flow',
  '/dashboard/forecast': 'Forecast',
}

export default function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Sovereign'

  return (
    <header
      style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        borderBottom: '1px solid rgba(196,168,130,0.12)',
        backgroundColor: '#0d0800',
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '20px',
          color: '#e8d5b0',
          margin: 0,
          fontWeight: 400,
        }}
      >
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span
          style={{
            fontSize: '12px',
            color: '#7a6040',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </header>
  )
}

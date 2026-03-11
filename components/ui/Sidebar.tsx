'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/dashboard/accounts', label: 'Accounts', icon: '⬡' },
  { href: '/dashboard/transactions', label: 'Transactions', icon: '≡' },
  { href: '/dashboard/cashflow', label: 'Cash Flow', icon: '⟷' },
  { href: '/dashboard/forecast', label: 'Forecast', icon: '◎' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: '220px',
        minHeight: '100vh',
        backgroundColor: '#140c02',
        borderRight: '1px solid rgba(196,168,130,0.12)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '32px 24px 28px', borderBottom: '1px solid rgba(196,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#c4a882', letterSpacing: '0.04em' }}>
          Sovereign
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '4px',
                textDecoration: 'none',
                color: isActive ? '#c4a882' : '#7a6040',
                backgroundColor: isActive ? 'rgba(196,168,130,0.08)' : 'transparent',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(196,168,130,0.12)' }}>
        <Link
          href="/auth/login"
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#7a6040',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Sign out
        </Link>
      </div>
    </aside>
  )
}

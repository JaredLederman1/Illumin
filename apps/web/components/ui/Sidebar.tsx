'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAccountsQuery, type Account } from '@/lib/queries'

const sections = [
  {
    label: 'WEALTH',
    items: [
      { href: '/dashboard/accounts',     label: 'Accounts'         },
      { href: '/dashboard/portfolio',    label: 'Portfolio'        },
    ],
  },
  {
    label: 'ACTIVITY',
    items: [
      { href: '/dashboard/transactions', label: 'Transactions'     },
      { href: '/dashboard/cashflow',     label: 'Cash Flow'        },
      { href: '/dashboard/budget',       label: 'Budget'           },
      { href: '/dashboard/recurring',    label: 'Recurring'        },
    ],
  },
  {
    label: 'FORECAST',
    items: [
      { href: '/dashboard/forecast',               label: 'Projections'    },
      { href: '/dashboard/forecast/debt-paydown',  label: 'Debt Paydown'   },
      { href: '/dashboard/goals',                  label: 'Goals'          },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/dashboard/recovery',     label: 'Recovery'         },
      { href: '/dashboard/benefits',     label: 'Benefits'         },
      { href: '/dashboard/opportunity',  label: 'Opportunity Cost' },
    ],
  },
]

type AccountGroupKey = 'depository' | 'credit' | 'investment' | 'loan'

const ACCOUNT_GROUP_ORDER: AccountGroupKey[] = ['depository', 'credit', 'investment', 'loan']

const ACCOUNT_GROUP_LABEL: Record<AccountGroupKey, string> = {
  depository: 'Cash',
  credit: 'Credit',
  investment: 'Investments',
  loan: 'Loans',
}

function classifyAccount(accountType: string): AccountGroupKey {
  const t = (accountType ?? '').toLowerCase()
  if (t === 'credit' || t.includes('credit card')) return 'credit'
  if (['mortgage', 'student', 'auto', 'loan', 'line of credit', 'home equity'].some(k => t.includes(k))) return 'loan'
  if (['investment', 'brokerage', 'ira', '401', '403b', 'roth', 'pension', '529', 'esa'].some(k => t.includes(k))) return 'investment'
  return 'depository'
}

function fmtBalance(n: number) {
  const abs = Math.abs(n)
  const noCents = abs >= 1000
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: noCents ? 0 : 2,
    maximumFractionDigits: noCents ? 0 : 2,
  }).format(n)
}

function findActiveSectionLabel(pathname: string): string | null {
  const match = sections.find(section =>
    section.items.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  )
  return match?.label ?? null
}

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const base = Object.fromEntries(sections.map(s => [s.label, false]))
    const active = findActiveSectionLabel(pathname)
    if (active) base[active] = true
    return base
  })
  const [accountsOpen, setAccountsOpen] = useState(true)
  const accountsQuery = useAccountsQuery()

  useEffect(() => {
    const active = findActiveSectionLabel(pathname)
    if (!active) return
    setOpen(prev => {
      if (prev[active]) return prev
      const allClosed = Object.fromEntries(Object.keys(prev).map(k => [k, false]))
      return { ...allClosed, [active]: true }
    })
  }, [pathname])

  const toggle = (label: string) =>
    setOpen((prev) => {
      const isCurrentlyOpen = prev[label]
      const allClosed = Object.fromEntries(Object.keys(prev).map((k) => [k, false]))
      return { ...allClosed, [label]: !isCurrentlyOpen }
    })

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (pathname === href) return true
    const deeperChild = pathname.startsWith(`${href}/`)
    const sibling = sections.some(section =>
      section.items.some(item => item.href !== href && item.href.startsWith(`${href}/`) && pathname.startsWith(item.href)),
    )
    return deeperChild && !sibling
  }

  const linkStyle = (href: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '9px 28px 9px 44px',
    borderLeft: '2px solid transparent',
    marginBottom: '1px',
    textDecoration: 'none',
    color: isActive(href) ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontSize: '12px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    transition: 'color 150ms ease',
  })

  const standaloneStyle = (href: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '10px 28px',
    borderLeft: '2px solid transparent',
    marginBottom: '1px',
    textDecoration: 'none',
    color: isActive(href) ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontSize: '14px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    transition: 'color 150ms ease',
  })

  const groupedAccounts = (() => {
    const buckets: Record<AccountGroupKey, Account[]> = {
      depository: [],
      credit: [],
      investment: [],
      loan: [],
    }
    for (const a of accountsQuery.data ?? []) {
      buckets[classifyAccount(a.accountType)].push(a)
    }
    return buckets
  })()

  const hasAccounts = (accountsQuery.data?.length ?? 0) > 0

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      backgroundColor: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Wordmark */}
      <Link href="/dashboard" style={{
        padding: '40px 28px 32px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '22px',
          fontWeight: 500,
          color: 'var(--color-gold)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: '5px',
        }}>
          Illumin
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Wealth Management
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ paddingTop: '16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Overview */}
        <Link href="/dashboard" style={standaloneStyle('/dashboard')}>
          DASHBOARD
        </Link>

        {/* Sentinel: primary vigilance destination */}
        <Link href="/dashboard/sentinel" style={standaloneStyle('/dashboard/sentinel')}>
          SENTINEL
        </Link>

        {/* Divider */}
        <div style={{ margin: '12px 28px', borderTop: '1px solid var(--color-border)' }} />

        {/* Sections */}
        {sections.map((section, i) => {
          const isOpen = open[section.label]
          return (
            <div key={section.label} style={{ marginBottom: i < sections.length - 1 ? '4px' : '0' }}>
              {/* Section heading: clickable toggle */}
              <button
                onClick={() => toggle(section.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 28px',
                  background: 'none',
                  border: 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                  marginBottom: isOpen ? '2px' : '4px',
                  transition: 'color 150ms ease',
                }}
              >
                {section.label}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.span>
              </button>

              {/* Collapsible items */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    {section.items.map((item) => (
                      <Link key={item.href} href={item.href} style={linkStyle(item.href)}>
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ height: '12px' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Divider */}
        <div style={{ margin: '8px 28px 12px', borderTop: '1px solid var(--color-border)' }} />

        {/* Profile */}
        <Link href="/dashboard/profile" style={standaloneStyle('/dashboard/profile')}>
          PROFILE
        </Link>

        {/* Checklist */}
        <Link href="/dashboard/checklist" style={standaloneStyle('/dashboard/checklist')}>
          CHECKLIST
        </Link>

        {/* Divider */}
        <div style={{ margin: '12px 28px 8px', borderTop: '1px solid var(--color-border)' }} />

        {/* Accounts: live balances grouped by type */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <button
            onClick={() => setAccountsOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 28px',
              background: 'none',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              userSelect: 'none',
              marginBottom: accountsOpen ? '2px' : '4px',
              transition: 'color 150ms ease',
            }}
          >
            ACCOUNTS
            <motion.span
              animate={{ rotate: accountsOpen ? 180 : 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {accountsOpen && (
              <motion.div
                key="accounts"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ maxHeight: '40vh', overflowY: 'auto', paddingBottom: '12px' }}>
                  {accountsQuery.isPending ? (
                    <div style={{
                      padding: '8px 28px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                    }}>
                      Loading accounts...
                    </div>
                  ) : accountsQuery.isError ? (
                    <div style={{
                      padding: '8px 28px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                    }}>
                      Accounts unavailable
                    </div>
                  ) : !hasAccounts ? (
                    <div style={{
                      padding: '8px 28px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                    }}>
                      No accounts connected.{' '}
                      <Link href="/dashboard/accounts" style={{
                        color: 'var(--color-gold)',
                        textDecoration: 'none',
                      }}>
                        Connect
                      </Link>
                    </div>
                  ) : (
                    ACCOUNT_GROUP_ORDER.map(groupKey => {
                      const items = groupedAccounts[groupKey]
                      if (items.length === 0) return null
                      return (
                        <div key={groupKey} style={{ marginBottom: '8px' }}>
                          <div style={{
                            padding: '6px 28px 4px',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '10px',
                            fontWeight: 500,
                            color: 'var(--color-text-muted)',
                            letterSpacing: '0.04em',
                          }}>
                            {ACCOUNT_GROUP_LABEL[groupKey]}
                          </div>
                          {items.map(account => (
                            <Link
                              key={account.id}
                              href="/dashboard/accounts"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '6px 28px',
                                textDecoration: 'none',
                                color: 'var(--color-text-mid)',
                                transition: 'color 150ms ease, background-color 150ms ease',
                              }}
                            >
                              <span style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                                flex: 1,
                              }}>
                                <span style={{
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: 'var(--color-text)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {account.institutionName}
                                </span>
                                {account.last4 && (
                                  <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    color: 'var(--color-text-muted)',
                                    letterSpacing: '0.03em',
                                  }}>
                                    •••• {account.last4}
                                  </span>
                                )}
                              </span>
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                color: account.balance < 0 ? 'var(--color-negative)' : 'var(--color-text)',
                                whiteSpace: 'nowrap',
                              }}>
                                {fmtBalance(account.balance)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Footer */}
      <div style={{
        padding: '20px 28px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-gold-subtle)',
          border: '1px solid var(--color-border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--color-gold)',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          JL
        </div>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-mid)', fontFamily: 'var(--font-sans)', marginBottom: '2px' }}>
            Jared L.
          </div>
          <Link href="/auth/login" style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
            textDecoration: 'none',
          }}>
            Sign out
          </Link>
        </div>
      </div>
    </aside>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useOnboardingProfileQuery } from '@/lib/queries'

const STORAGE_KEY = 'illumin_onboarding_banner_dismissed_v1'

export default function OnboardingBanner() {
  const { data: profile } = useOnboardingProfileQuery()
  const [dismissed, setDismissed] = useState<boolean>(false)
  const [mounted, setMounted]     = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (!mounted) return null
  if (dismissed) return null

  const completedAt = profile?.completedAt ?? null
  if (completedAt) return null

  // Show the banner while the query is still loading (profile === undefined)
  // only after a real fetch has returned null. Otherwise we would flash the
  // banner for completed users on every page load.
  if (profile === undefined) return null

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setDismissed(true)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '14px 20px',
      margin: '20px 36px 0',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border-strong)',
      borderRadius: 'var(--radius-sm, 4px)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-gold)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          Finish setup
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--color-text-mid, var(--color-text-muted))',
          lineHeight: 1.55,
        }}>
          You&apos;re seeing a limited view. Complete your profile so Illumin can monitor opportunity cost, goals, and forecast.
        </span>
      </div>
      <Link
        href="/onboarding"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Resume onboarding &rarr;
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '16px',
          lineHeight: 1,
          padding: '4px 6px',
        }}
      >
        ×
      </button>
    </div>
  )
}

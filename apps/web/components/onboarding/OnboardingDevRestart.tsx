'use client'

import { useState } from 'react'
import { useResetOnboardingMutation } from '@/lib/queries'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Dev-only floating "Restart onboarding" button. Rendered at a very high
 * z-index so it sits above the WelcomeIntro overlay (z-index 9999) and every
 * subsequent phase. On click it:
 *   1. Calls DELETE /api/user/onboarding to drop OnboardingProfile and
 *      EmploymentBenefits server-side.
 *   2. Clears the client-side flags (welcome-intro-seen and accounts-animated).
 *   3. Reloads the page so the OnboardingPage re-initializes from scratch and
 *      the cinematic intro plays again.
 * Accounts and transactions are preserved. Hidden entirely in production.
 */
export function OnboardingDevRestart() {
  const reset = useResetOnboardingMutation()
  const [error, setError] = useState<string | null>(null)

  if (!IS_DEV) return null

  const handleClick = () => {
    if (reset.isPending) return
    if (!window.confirm('Dev: reset onboarding state and replay from the intro?')) return
    setError(null)
    reset.mutate(undefined, {
      onSuccess: () => {
        try {
          window.localStorage.removeItem('illumin_onboarding_intro_seen')
          window.localStorage.removeItem('illumin_accounts_animated')
        } catch {
          // ignore
        }
        window.location.href = '/onboarding'
      },
      onError: err => setError(err instanceof Error ? err.message : 'Reset failed'),
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={reset.isPending}
        style={{
          pointerEvents: 'auto',
          padding: '7px 14px',
          backgroundColor: 'rgba(20, 20, 18, 0.72)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px dashed var(--color-negative-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-negative)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: reset.isPending ? 'not-allowed' : 'pointer',
          opacity: reset.isPending ? 0.6 : 1,
          transition: 'border-color 150ms ease, color 150ms ease',
        }}
      >
        {reset.isPending ? 'Resetting…' : 'Dev: Restart'}
      </button>
      {error && (
        <span
          style={{
            pointerEvents: 'auto',
            maxWidth: '260px',
            padding: '6px 10px',
            backgroundColor: 'rgba(20, 20, 18, 0.88)',
            border: '1px solid var(--color-negative-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-negative)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

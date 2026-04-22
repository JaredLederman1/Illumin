'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthLayout from '@/components/AuthLayout'

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  fontSize: '14px',
}

const primaryBtn = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '13px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-surface)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 500,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.65 : 1,
  marginTop: '8px',
})

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      // We always show the same confirmation, regardless of whether the email
      // is registered, to prevent user enumeration via timing or error copy.
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 400,
          color: 'var(--color-gold)',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          Illumin
        </div>
        <p style={{
          fontSize: '16px',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
        }}>
          Reset your password
        </p>
      </div>

      {sent ? (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.6,
          textAlign: 'center',
        }}>
          <p style={{ marginBottom: '20px' }}>
            If an account exists for that email, we sent a reset link.
          </p>
          <Link href="/auth/login" style={{
            color: 'var(--color-gold)',
            textDecoration: 'none',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontSize: '11px',
          }}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={fieldLabel}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{
                fontSize: '12px',
                color: 'var(--color-negative)',
                fontFamily: 'var(--font-mono)',
                margin: 0,
                lineHeight: 1.5,
              }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: '28px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            Remembered it?{' '}
            <Link href="/auth/login" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}

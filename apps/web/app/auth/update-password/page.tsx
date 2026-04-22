'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

function getStrength(pwd: string): number {
  let score = 0
  if (pwd.length >= 8)           score++
  if (/[A-Z]/.test(pwd))         score++
  if (/[0-9]/.test(pwd))         score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  return score
}

function strengthColor(score: number): string {
  if (score <= 1) return 'var(--color-negative)'
  if (score <= 3) return 'var(--color-gold)'
  return 'var(--color-positive)'
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [sessionOk, setSessionOk]     = useState<boolean | null>(null)
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)

  const strength = getStrength(password)

  useEffect(() => {
    // The user should land here only with a valid recovery session (Supabase
    // exchanged the code in /auth/callback). If there is no session the link
    // was expired or reused; surface that instead of silently failing later.
    supabase.auth.getSession().then(({ data }) => {
      setSessionOk(!!data.session)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (strength < 2) {
      setError('Password is too weak.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) {
        setError(updateErr.message)
        return
      }
      router.push('/auth/login?reset=1')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sessionOk === null) {
    return (
      <AuthLayout>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}>
          Loading...
        </p>
      </AuthLayout>
    )
  }

  if (!sessionOk) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-negative)',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}>
            This password reset link is invalid or has expired.
          </p>
          <Link href="/auth/forgot-password" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-gold)',
            textDecoration: 'none',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    )
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
          Set a new password
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={fieldLabel}>New password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: '52px' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                padding: '2px 4px',
              }}
            >
              {showPwd ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          {password.length > 0 && (
            <div style={{ display: 'flex', gap: '3px', marginTop: '8px' }}>
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '2px',
                    borderRadius: '1px',
                    backgroundColor: i < strength ? strengthColor(strength) : 'var(--color-border-strong)',
                    transition: 'background-color 200ms ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={fieldLabel}>Confirm password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: '52px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(s => !s)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                padding: '2px 4px',
              }}
            >
              {showConfirm ? 'HIDE' : 'SHOW'}
            </button>
          </div>
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
          {loading ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthLayout>
  )
}

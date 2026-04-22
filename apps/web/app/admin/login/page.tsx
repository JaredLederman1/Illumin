'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'

// Admin allowlist enforcement happens server-side in the (gated) admin layout
// and in POST /api/auth/post-login-destination. This page only needs to know
// whether the email matches a public hint (NEXT_PUBLIC_ADMIN_EMAIL) so we can
// give a clean error to non-admins without waiting for a server round-trip.
const PUBLIC_ADMIN_HINT = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '')
  .toLowerCase()
  .trim()

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

export default function AdminLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        setError('Invalid email or password.')
        return
      }
      const userEmail = data.user?.email?.toLowerCase()
      // Client-side hint check gives a fast error for the obvious non-admin
      // case. The authoritative gate is the server admin layout, which reads
      // ADMIN_EMAILS. Any user who sneaks past this hint still cannot render
      // a gated page.
      if (PUBLIC_ADMIN_HINT && userEmail !== PUBLIC_ADMIN_HINT) {
        await supabase.auth.signOut()
        setError('This account does not have admin access.')
        return
      }

      const { data: levelData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (levelData?.nextLevel === 'aal2' && levelData.currentLevel !== 'aal2') {
        router.push('/auth/mfa/verify?redirect=/admin')
        return
      }
      router.push('/admin')
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
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Admin portal
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

        <div>
          <label style={fieldLabel}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}

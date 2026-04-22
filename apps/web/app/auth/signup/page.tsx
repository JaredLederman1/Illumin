'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  if (pwd.length >= 8)             score++
  if (/[A-Z]/.test(pwd))           score++
  if (/[0-9]/.test(pwd))           score++
  if (/[^a-zA-Z0-9]/.test(pwd))   score++
  return score
}

function strengthColor(score: number): string {
  if (score <= 1) return 'var(--color-negative)'
  if (score <= 2) return 'var(--color-gold)'
  if (score <= 3) return 'var(--color-gold)'
  return 'var(--color-positive)'
}

type InvalidReason = 'not_found' | 'expired' | 'exhausted' | 'disabled'

function inviteReasonCopy(reason: InvalidReason | 'unknown'): string {
  switch (reason) {
    case 'not_found':  return 'We do not recognize that invite code.'
    case 'expired':    return 'That invite code has expired.'
    case 'exhausted':  return 'That invite code has already been used.'
    case 'disabled':   return 'That invite code is no longer active.'
    default:           return 'Something went wrong. Please try again.'
  }
}

export default function SignupPage() {
  // Step A: invite code
  const [inviteCode, setInviteCode]         = useState('')
  const [validatedCode, setValidatedCode]   = useState<string | null>(null)
  const [inviteError, setInviteError]       = useState<string | null>(null)
  const [inviteLoading, setInviteLoading]   = useState(false)

  // Step B: signup fields
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [consent, setConsent]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const router = useRouter()

  const strength = getStrength(password)

  const handleValidateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteLoading(true)
    try {
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() }),
      })
      if (!res.ok) {
        setInviteError(inviteReasonCopy('unknown'))
        return
      }
      const data: { valid: boolean; reason?: InvalidReason } = await res.json()
      if (!data.valid) {
        setInviteError(inviteReasonCopy(data.reason ?? 'unknown'))
        return
      }
      setValidatedCode(inviteCode.trim().toUpperCase())
    } catch {
      setInviteError(inviteReasonCopy('unknown'))
    } finally {
      setInviteLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (strength < 2) {
      setError('Password is too weak.')
      return
    }
    if (!validatedCode) {
      setError('Invite code missing. Please start over.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      })
      if (authError) {
        setError(authError.message)
        return
      }

      // Session is present immediately when "confirm email" is OFF in Supabase.
      // When ON, data.session is null and the user goes through /auth/callback
      // after clicking the confirmation email. In that case we cannot call a
      // Bearer-protected endpoint here because there is no session yet, so we
      // skip redemption and let /auth/callback route to onboarding. Jared
      // needs to wire the redemption there too if email confirm is turned on.
      if (data.session) {
        const res = await fetch('/api/invite/redeem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ code: validatedCode }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            reason?: InvalidReason | 'already_redeemed'
          }
          const reason = body.reason ?? 'unknown'
          if (reason === 'already_redeemed') {
            setError('That invite code has already been redeemed by your account.')
          } else {
            setError(inviteReasonCopy(reason as InvalidReason | 'unknown'))
          }
          await supabase.auth.signOut()
          return
        }
        router.push(`/auth/mfa/enroll?email=${encodeURIComponent(email)}`)
      } else {
        // Email confirmation path. The /auth/callback route will pick up after
        // the user clicks the link and finish onboarding redirect from there.
        setError(
          'Check your email for a confirmation link to finish creating your account.',
        )
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!validatedCode) {
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
            Enter your invite code
          </p>
        </div>

        <form
          onSubmit={handleValidateInvite}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div>
            <label style={fieldLabel}>Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={e => { setInviteCode(e.target.value); setInviteError(null) }}
              required
              autoComplete="off"
              spellCheck={false}
              style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.18em' }}
              placeholder="XXXXXXXX"
            />
          </div>

          {inviteError && (
            <p style={{
              fontSize: '12px',
              color: 'var(--color-negative)',
              fontFamily: 'var(--font-mono)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              {inviteError}
            </p>
          )}

          <button type="submit" disabled={inviteLoading} style={primaryBtn(inviteLoading)}>
            {inviteLoading ? 'Checking…' : 'Continue'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '28px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
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
          Create your account
        </p>
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={fieldLabel}>Name <span style={{ opacity: 0.5 }}>(optional)</span></label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
            style={inputStyle}
          />
        </div>

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
          <label style={fieldLabel}>Confirm Password</label>
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

        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            required
            style={{
              marginTop: '2px',
              flexShrink: 0,
              accentColor: 'var(--color-gold)',
              width: '14px',
              height: '14px',
              cursor: 'pointer',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
          }}>
            I agree to Illumin&apos;s{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-gold)', textDecoration: 'none' }}
            >
              Privacy Policy
            </Link>
            {' '}and consent to the collection and processing of my data.
          </span>
        </label>

        <button type="submit" disabled={loading || !consent} style={primaryBtn(loading || !consent)}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{
        textAlign: 'center',
        marginTop: '28px',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

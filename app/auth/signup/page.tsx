'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: '#140c02',
    border: '1px solid rgba(196,168,130,0.2)',
    borderRadius: '8px',
    color: '#e8d5b0',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d0800',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '16px',
        padding: '40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#c4a882', marginBottom: '8px' }}>
            Sovereign
          </h1>
          <p style={{ fontSize: '13px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#c4806a', fontFamily: 'var(--font-mono)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#c4a882',
              border: 'none',
              borderRadius: '8px',
              color: '#0d0800',
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '8px',
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: '#c4a882', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

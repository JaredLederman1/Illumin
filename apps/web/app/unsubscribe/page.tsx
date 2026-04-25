/**
 * Unsubscribe page. Public (no auth required) because it is reached from
 * email links. The token in the URL identifies the user. On match we flip
 * notificationEmailMode to "off" and clear the token so the same link cannot
 * be reused to re-unsubscribe or probe accounts.
 */

import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ token?: string | string[] }>
}

async function processUnsubscribe(token: string): Promise<
  | { kind: 'ok'; email: string }
  | { kind: 'invalid' }
> {
  const user = await prisma.user.findUnique({
    where: { notificationUnsubscribeToken: token },
    select: { id: true, email: true },
  })
  if (!user) return { kind: 'invalid' }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      notificationEmailMode: 'off',
      notificationUnsubscribeToken: null,
    },
  })
  return { kind: 'ok', email: user.email }
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams
  const raw = params.token
  const token = Array.isArray(raw) ? raw[0] : raw
  const result = token ? await processUnsubscribe(token) : { kind: 'invalid' as const }

  const wrapStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    backgroundColor: 'var(--color-bg)',
    fontFamily: 'var(--font-serif)',
  }

  const cardStyle = {
    maxWidth: 480,
    width: '100%',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    padding: '40px 36px',
  }

  const eyebrowStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    marginBottom: 14,
  }

  const titleStyle = {
    fontFamily: 'var(--font-serif)',
    fontSize: 22,
    fontWeight: 400,
    color: 'var(--color-text)',
    lineHeight: 1.35,
    marginBottom: 14,
  }

  const bodyStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--color-text-mid)',
    lineHeight: 1.6,
  }

  if (result.kind === 'ok') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={eyebrowStyle}>Illumin</div>
          <h1 style={titleStyle}>You are unsubscribed.</h1>
          <p style={bodyStyle}>
            {result.email} will no longer receive notification emails from Illumin. You can re-enable them any time in
            {' '}
            <a
              href="/dashboard/profile"
              style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}
            >
              profile settings
            </a>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={eyebrowStyle}>Illumin</div>
        <h1 style={titleStyle}>This unsubscribe link is no longer valid.</h1>
        <p style={bodyStyle}>
          The token was not recognized. If you are already unsubscribed, no further action is needed. To manage your preferences, sign in and visit
          {' '}
          <a
            href="/dashboard/profile"
            style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}
          >
            profile settings
          </a>
          .
        </p>
      </div>
    </div>
  )
}

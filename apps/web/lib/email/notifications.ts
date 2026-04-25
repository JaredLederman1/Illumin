/**
 * Notification email sender. Renders a digest email for one user covering a
 * set of Notification rows and dispatches via Resend.
 *
 * Two trust-and-deliverability invariants this file enforces:
 *   1. The sender address comes from RESEND_FROM_EMAIL. We refuse to send if
 *      that env var is missing — no hardcoded fallback, because a wrong sender
 *      on a transactional email permanently burns domain reputation.
 *   2. Every email carries a one-click unsubscribe link tied to an opaque,
 *      unique-per-user token. The token is generated lazily on first send and
 *      persisted on User.notificationUnsubscribeToken.
 *
 * Callers are responsible for choosing which notifications to include and for
 * ensuring this is not called inside a DB transaction — the Resend network
 * call can be slow and must never hold a pg connection.
 */

import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const APP_BASE_URL = 'https://illuminwealth.com'
const SENTINEL_PATH = '/dashboard/sentinel'
const UNSUBSCRIBE_PATH = '/unsubscribe'

export type NotificationEmailKind = 'new' | 'reopened' | 'worsened'

export interface NotificationEmailInput {
  id: string
  kind: NotificationEmailKind
  domain: string
  title: string
  dollarImpact: number | null
  createdAt: Date
}

export interface SendResult {
  sent: boolean
  reason?: string
}

export interface SendArgs {
  userId: string
  notifications: NotificationEmailInput[]
}

const KIND_LABEL: Record<NotificationEmailKind, string> = {
  new: 'New',
  reopened: 'Reopened',
  worsened: 'Worsened',
}

const DOMAIN_LABEL: Record<string, string> = {
  idle_cash: 'Idle cash',
  hysa: 'HYSA',
  debt: 'Debt',
  match: 'Employer match',
  benefits: 'Benefits',
  tax_advantaged: 'Tax-advantaged',
  subscription: 'Subscription',
}

function domainLabel(domain: string): string {
  return DOMAIN_LABEL[domain] ?? domain.replace(/_/g, ' ')
}

function formatDollar(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null
  const abs = Math.abs(value)
  if (abs < 1) return null
  if (abs >= 1000) {
    return `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k/yr`
  }
  return `$${Math.round(value)}/yr`
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderSubject(notifications: NotificationEmailInput[]): string {
  if (notifications.length === 1) {
    return `Illumin: ${notifications[0].title}`
  }
  return `Illumin: ${notifications.length} new findings`
}

function renderHtml(args: {
  notifications: NotificationEmailInput[]
  unsubscribeUrl: string
  accountEmail: string
  sentAt: Date
}): string {
  const { notifications, unsubscribeUrl, accountEmail, sentAt } = args
  const count = notifications.length
  const word = count === 1 ? 'finding' : 'findings'
  const reviewUrl = `${APP_BASE_URL}${SENTINEL_PATH}`
  const timestamp = sentAt.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  const items = notifications
    .map(n => {
      const dollar = formatDollar(n.dollarImpact)
      const kind = escapeHtml(KIND_LABEL[n.kind] ?? n.kind)
      const domain = escapeHtml(domainLabel(n.domain))
      const title = escapeHtml(n.title)
      const dollarLine = dollar
        ? `<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#6B5D4A;letter-spacing:0.04em;">${escapeHtml(dollar)}</div>`
        : ''
      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #E6DFD2;">
            <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#B8913A;margin-bottom:6px;">${kind} · ${domain}</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.35;color:#1A1714;margin-bottom:6px;">${title}</div>
            ${dollarLine}
          </td>
        </tr>
      `
    })
    .join('\n')

  const intro = `Illumin found ${count} ${word} in your last scan.`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(renderSubject(notifications))}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:Georgia,'Times New Roman',serif;color:#1A1714;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E6DFD2;border-radius:2px;">
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.02em;color:#1A1714;">Illumin</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.55;color:#1A1714;margin:0 0 20px 0;">${escapeHtml(intro)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${items}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;">
              <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;padding:11px 22px;background-color:#B8913A;color:#FFFFFF;text-decoration:none;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;border-radius:2px;">Review in Illumin</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #E6DFD2;">
              <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#6B5D4A;line-height:1.6;">
                <div>${escapeHtml(timestamp)}</div>
                <div>Sent to ${escapeHtml(accountEmail)}.</div>
                <div style="margin-top:8px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#6B5D4A;text-decoration:underline;">Unsubscribe from notification emails</a></div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function renderText(args: {
  notifications: NotificationEmailInput[]
  unsubscribeUrl: string
  accountEmail: string
  sentAt: Date
}): string {
  const { notifications, unsubscribeUrl, accountEmail, sentAt } = args
  const count = notifications.length
  const word = count === 1 ? 'finding' : 'findings'
  const reviewUrl = `${APP_BASE_URL}${SENTINEL_PATH}`
  const timestamp = sentAt.toISOString()

  const lines: string[] = []
  lines.push('Illumin')
  lines.push('')
  lines.push(`Illumin found ${count} ${word} in your last scan.`)
  lines.push('')
  for (const n of notifications) {
    const dollar = formatDollar(n.dollarImpact)
    lines.push(`${KIND_LABEL[n.kind] ?? n.kind} / ${domainLabel(n.domain)}`)
    lines.push(`  ${n.title}`)
    if (dollar) lines.push(`  ${dollar}`)
    lines.push('')
  }
  lines.push(`Review in Illumin: ${reviewUrl}`)
  lines.push('')
  lines.push(timestamp)
  lines.push(`Sent to ${accountEmail}.`)
  lines.push(`Unsubscribe: ${unsubscribeUrl}`)
  return lines.join('\n')
}

function generateUnsubscribeToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Ensure the user has a notificationUnsubscribeToken, creating and persisting
 * one if absent. Returns the token.
 */
async function ensureUnsubscribeToken(
  userId: string,
  existing: string | null,
): Promise<string> {
  if (existing) return existing
  const token = generateUnsubscribeToken()
  await prisma.user.update({
    where: { id: userId },
    data: { notificationUnsubscribeToken: token },
  })
  return token
}

/**
 * Send a notification email for `userId` covering `notifications`. Skips
 * silently and returns reason when: mode='off', user has no email, or the
 * notifications list is empty. On successful send, updates
 * notificationEmailLastSentAt.
 *
 * Must not be called inside a DB transaction.
 */
export async function sendNotificationEmail(
  args: SendArgs,
): Promise<SendResult> {
  if (args.notifications.length === 0) {
    return { sent: false, reason: 'empty' }
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL
  if (!fromAddress) {
    // Fail loudly: this is the first outbound transactional email. A silent
    // fallback sender would contaminate domain reputation and make deliverability
    // issues hard to trace. Caller surfaces this error in cron logs / Sentry.
    throw new Error(
      'RESEND_FROM_EMAIL is not configured. Set it in the environment before sending notification emails.',
    )
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }

  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: {
      email: true,
      notificationEmailMode: true,
      notificationUnsubscribeToken: true,
    },
  })

  if (!user) return { sent: false, reason: 'user_not_found' }
  if (user.notificationEmailMode === 'off') return { sent: false, reason: 'mode_off' }
  if (!user.email) return { sent: false, reason: 'no_email' }

  const token = await ensureUnsubscribeToken(
    args.userId,
    user.notificationUnsubscribeToken,
  )
  const unsubscribeUrl = `${APP_BASE_URL}${UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`

  const sentAt = new Date()
  const subject = renderSubject(args.notifications)
  const html = renderHtml({
    notifications: args.notifications,
    unsubscribeUrl,
    accountEmail: user.email,
    sentAt,
  })
  const text = renderText({
    notifications: args.notifications,
    unsubscribeUrl,
    accountEmail: user.email,
    sentAt,
  })

  const resend = new Resend(apiKey)

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: user.email,
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    if (result.error) {
      return { sent: false, reason: `resend_error: ${result.error.message}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { sent: false, reason: `resend_threw: ${message}` }
  }

  await prisma.user.update({
    where: { id: args.userId },
    data: { notificationEmailLastSentAt: sentAt },
  })

  return { sent: true }
}

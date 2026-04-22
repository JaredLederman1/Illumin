import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { createInviteCode, disableInviteCode } from './actions'

const label: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const cellMono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text)',
  padding: '10px 12px',
}

const cellMuted: React.CSSProperties = {
  ...cellMono,
  color: 'var(--color-text-muted)',
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  padding: '8px 10px',
  border: '1px solid var(--color-border-strong)',
  borderRadius: '2px',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
}

const primaryBtn: React.CSSProperties = {
  padding: '9px 18px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-surface)',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 500,
  cursor: 'pointer',
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusCopy(row: {
  disabledAt: Date | null
  expiresAt: Date | null
  usedCount: number
  maxUses: number
}): string {
  if (row.disabledAt) return 'Disabled'
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return 'Expired'
  if (row.usedCount >= row.maxUses) return 'Exhausted'
  return 'Active'
}

export default async function AdminInvitesPage() {
  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  })

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      padding: '60px 48px',
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <Link href="/admin" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}>
            &larr; Admin
          </Link>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '36px',
          fontWeight: 300,
          color: 'var(--color-text)',
          marginBottom: '40px',
          lineHeight: 1.2,
        }}>
          Invite codes
        </h1>

        <section style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          padding: '24px 28px',
          marginBottom: '32px',
        }}>
          <p style={{ ...label, marginBottom: '16px' }}>Create new code</p>
          <form action={createInviteCode} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr auto',
            gap: '12px',
            alignItems: 'end',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={label}>Note</label>
              <input name="note" type="text" placeholder="Optional note" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={label}>Max uses</label>
              <input
                name="maxUses"
                type="number"
                min={1}
                defaultValue={1}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={label}>Expires at</label>
              <input name="expiresAt" type="datetime-local" style={inputStyle} />
            </div>
            <button type="submit" style={primaryBtn}>Create</button>
          </form>
        </section>

        <section style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          overflowX: 'auto',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ ...label, textAlign: 'left', padding: '12px' }}>Code</th>
                <th style={{ ...label, textAlign: 'left', padding: '12px' }}>Note</th>
                <th style={{ ...label, textAlign: 'left', padding: '12px' }}>Used</th>
                <th style={{ ...label, textAlign: 'left', padding: '12px' }}>Redemptions</th>
                <th style={{ ...label, textAlign: 'left', padding: '12px' }}>Expires</th>
                <th style={{ ...label, textAlign: 'left', padding: '12px' }}>Created</th>
                <th style={{ ...label, textAlign: 'left', padding: '12px' }}>Status</th>
                <th style={{ ...label, textAlign: 'right', padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...cellMuted, textAlign: 'center', padding: '28px' }}>
                    No invite codes yet.
                  </td>
                </tr>
              )}
              {codes.map(c => {
                const status = statusCopy(c)
                const canDisable = !c.disabledAt
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ ...cellMono, letterSpacing: '0.12em' }}>{c.code}</td>
                    <td style={cellMuted}>{c.note ?? '—'}</td>
                    <td style={cellMono}>{c.usedCount} / {c.maxUses}</td>
                    <td style={cellMono}>{c._count.redemptions}</td>
                    <td style={cellMuted}>{fmtDate(c.expiresAt)}</td>
                    <td style={cellMuted}>{fmtDate(c.createdAt)}</td>
                    <td style={{
                      ...cellMono,
                      color: status === 'Active' ? 'var(--color-positive)'
                        : status === 'Disabled' ? 'var(--color-negative)'
                        : 'var(--color-text-muted)',
                    }}>
                      {status}
                    </td>
                    <td style={{ ...cellMono, textAlign: 'right' }}>
                      {canDisable ? (
                        <form action={disableInviteCode} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            background: 'none',
                            border: '1px solid var(--color-border-strong)',
                            borderRadius: '2px',
                            padding: '4px 10px',
                            color: 'var(--color-text-muted)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}>
                            Disable
                          </button>
                        </form>
                      ) : (
                        <span style={cellMuted}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

'use client'

interface NetWorthCardProps {
  current: number
  lastMonth: number
  totalAssets: number
  totalLiabilities: number
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function NetWorthCard({ current, lastMonth, totalAssets, totalLiabilities }: NetWorthCardProps) {
  const change = current - lastMonth
  const changePct = ((change / lastMonth) * 100).toFixed(1)
  const isPositive = change >= 0

  return (
    <div
      style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '12px',
        padding: '32px',
      }}
    >
      <p style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Net Worth
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '42px', color: '#e8d5b0', lineHeight: 1 }}>
          {formatCurrency(current)}
        </span>
        <span
          style={{
            fontSize: '14px',
            fontFamily: 'var(--font-mono)',
            color: isPositive ? '#8aad78' : '#c4806a',
            backgroundColor: isPositive ? 'rgba(138,173,120,0.1)' : 'rgba(196,128,106,0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          {isPositive ? '+' : ''}{formatCurrency(change)} ({isPositive ? '+' : ''}{changePct}%)
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
        vs last month
      </p>
      <div style={{ display: 'flex', gap: '32px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(196,168,130,0.08)' }}>
        <div>
          <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Assets</p>
          <p style={{ fontSize: '18px', color: '#8aad78', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalAssets)}</p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Liabilities</p>
          <p style={{ fontSize: '18px', color: '#c4806a', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>
    </div>
  )
}

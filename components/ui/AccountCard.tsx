interface AccountCardProps {
  institutionName: string
  accountType: string
  balance: number
  last4?: string | null
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

const accountTypeLabel: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit Card',
  brokerage: 'Brokerage',
  investment: 'Investment',
}

const institutionColors: Record<string, string> = {
  'charles schwab': '#5b9cf6',
  'capital one': '#cc3333',
}

export default function AccountCard({ institutionName, accountType, balance, last4 }: AccountCardProps) {
  const isNegative = balance < 0
  const initials = institutionName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = institutionColors[institutionName.toLowerCase()] ?? '#c4a882'

  return (
    <div
      style={{
        backgroundColor: '#140c02',
        border: '1px solid rgba(196,168,130,0.12)',
        borderRadius: '10px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: `${color}20`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '600',
            color: color,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {initials}
        </div>
        <div>
          <p style={{ fontSize: '14px', color: '#e8d5b0', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
            {institutionName}
          </p>
          <p style={{ fontSize: '12px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>
            {accountTypeLabel[accountType] ?? accountType}{last4 ? ` ···· ${last4}` : ''}
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p
          style={{
            fontSize: '16px',
            fontFamily: 'var(--font-mono)',
            color: isNegative ? '#c4806a' : '#e8d5b0',
            fontWeight: '500',
          }}
        >
          {formatCurrency(balance)}
        </p>
        <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
          Current balance
        </p>
      </div>
    </div>
  )
}

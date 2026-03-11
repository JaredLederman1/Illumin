interface TransactionRowProps {
  merchantName: string | null
  amount: number
  category: string | null
  date: Date | string
  pending?: boolean
}

function formatCurrency(n: number) {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(abs)
  return n < 0 ? `−${formatted}` : `+${formatted}`
}

function formatDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const categoryColors: Record<string, string> = {
  Income: '#8aad78',
  Groceries: '#c4a882',
  Dining: '#d4905a',
  Entertainment: '#9b8fcc',
  Transport: '#6aadcc',
  Utilities: '#a09060',
  Shopping: '#cc9060',
  Health: '#8090b0',
  Travel: '#b08050',
}

export default function TransactionRow({ merchantName, amount, category, date, pending }: TransactionRowProps) {
  const isIncome = amount > 0
  const color = isIncome ? '#8aad78' : '#c4806a'
  const catColor = category ? (categoryColors[category] ?? '#7a6040') : '#7a6040'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid rgba(196,168,130,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: catColor,
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ fontSize: '13px', color: '#e8d5b0', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
            {merchantName ?? 'Unknown Merchant'}
            {pending && <span style={{ fontSize: '10px', color: '#7a6040', marginLeft: '8px' }}>PENDING</span>}
          </p>
          <p style={{ fontSize: '11px', color: '#7a6040', fontFamily: 'var(--font-mono)' }}>
            {category ?? 'Uncategorized'} · {formatDate(date)}
          </p>
        </div>
      </div>
      <span
        style={{
          fontSize: '14px',
          fontFamily: 'var(--font-mono)',
          color: color,
          fontWeight: '500',
          flexShrink: 0,
        }}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  )
}

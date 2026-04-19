'use client'

import Link from 'next/link'
import WidgetCard from '../widgets/WidgetCard'

const cta: React.CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: '4px',
  padding: '9px 22px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textDecoration: 'none',
  display: 'inline-block',
}

export default function LinkAssetAccountCard() {
  return (
    <WidgetCard
      label="Unlock savings view"
      title="Link an asset account."
      subtitle="Add a checking, savings, or investment account to see your full balance sheet and savings-rate trends."
    >
      <Link href="/dashboard/accounts" style={cta}>
        Link account
      </Link>
    </WidgetCard>
  )
}

'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import WidgetCard from '../widgets/WidgetCard'

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const copy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
}

export default function LinkAssetAccountCard() {
  return (
    <WidgetCard
      variant="metric"
      eyebrow="Unlock savings view"
      columns={[{ caption: 'Link an asset account', hero: '—' }]}
      secondary={
        <p style={copy}>
          Add a checking, savings, or investment account so Illumin can monitor your full balance sheet and savings-rate trends.
        </p>
      }
      cta={
        <Link href="/dashboard/accounts" style={ctaLink}>
          Link account &rarr;
        </Link>
      }
    />
  )
}

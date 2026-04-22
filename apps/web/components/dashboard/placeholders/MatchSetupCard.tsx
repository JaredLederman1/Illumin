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

export default function MatchSetupCard() {
  return (
    <WidgetCard
      variant="metric"
      eyebrow="401k match"
      columns={[{ caption: 'Set up required', hero: '—' }]}
      secondary={
        <p style={copy}>
          Set up your employer match so Illumin can watch your biggest opportunity. A contract upload takes thirty seconds.
        </p>
      }
      cta={
        <Link href="/onboarding" style={ctaLink}>
          Upload contract &rarr;
        </Link>
      }
    />
  )
}

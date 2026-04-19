'use client'

import Link from 'next/link'
import WidgetCard from './WidgetCard'

const link: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
  alignSelf: 'flex-start',
}

export default function OpportunityCostWidget() {
  return (
    <WidgetCard
      label="Opportunity cost"
      title="Every dollar, projected"
      subtitle="See what a choice today compounds into by retirement. Interactive calculator on the full page."
    >
      <Link href="/dashboard/opportunity" style={link}>
        Open calculator →
      </Link>
    </WidgetCard>
  )
}

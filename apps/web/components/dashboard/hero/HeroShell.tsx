'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CSSProperties, ReactNode } from 'react'

interface HeroShellProps {
  eyebrow?: string
  headline: string
  subtitle: string
  bigNumber?: string
  bigNumberLabel?: string
  ctaLabel: string
  ctaHref: string
  tone?: 'neutral' | 'alert' | 'positive'
  extra?: ReactNode
}

const shellBase: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  position: 'relative',
}

const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  margin: 0,
}

const headlineStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '32px',
  fontWeight: 400,
  color: 'var(--color-text)',
  margin: 0,
  lineHeight: 1.15,
  maxWidth: '720px',
}

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.7,
  margin: 0,
  maxWidth: '620px',
}

const bigNumberStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '40px',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.1,
  margin: 0,
}

const bigNumberLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  margin: 0,
  marginBottom: '6px',
}

const ctaStyle: CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: '8px',
  padding: '11px 26px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  letterSpacing: '0.08em',
  textDecoration: 'none',
  display: 'inline-block',
}

const toneAccent: Record<NonNullable<HeroShellProps['tone']>, CSSProperties> = {
  neutral: {},
  alert: {
    borderColor: 'var(--color-negative-border)',
  },
  positive: {
    borderColor: 'var(--color-positive-border)',
  },
}

export default function HeroShell({
  eyebrow,
  headline,
  subtitle,
  bigNumber,
  bigNumberLabel,
  ctaLabel,
  ctaHref,
  tone = 'neutral',
  extra,
}: HeroShellProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ ...shellBase, ...toneAccent[tone] }}
    >
      {eyebrow && <p style={eyebrowStyle}>{eyebrow}</p>}
      <h1 style={headlineStyle}>{headline}</h1>
      {bigNumber && (
        <div>
          {bigNumberLabel && <p style={bigNumberLabelStyle}>{bigNumberLabel}</p>}
          <p style={bigNumberStyle}>{bigNumber}</p>
        </div>
      )}
      <p style={subtitleStyle}>{subtitle}</p>
      {extra}
      <Link href={ctaHref} style={ctaStyle}>
        {ctaLabel}
      </Link>
    </motion.section>
  )
}

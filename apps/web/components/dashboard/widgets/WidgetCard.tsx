'use client'

import { CSSProperties, ReactNode } from 'react'

interface Props {
  label?: string
  title?: string
  subtitle?: string
  comingSoon?: boolean
  accent?: 'neutral' | 'alert' | 'positive'
  children?: ReactNode
  style?: CSSProperties
}

const card: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  minHeight: '180px',
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  margin: 0,
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '20px',
  fontWeight: 400,
  color: 'var(--color-text)',
  margin: 0,
  lineHeight: 1.25,
}

const subStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.6,
  margin: 0,
}

const comingSoonPill: CSSProperties = {
  alignSelf: 'flex-start',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
  padding: '3px 8px',
  borderRadius: '2px',
}

const accentBorder: Record<NonNullable<Props['accent']>, CSSProperties> = {
  neutral: {},
  alert: { borderColor: 'var(--color-negative-border)' },
  positive: { borderColor: 'var(--color-positive-border)' },
}

export default function WidgetCard({
  label,
  title,
  subtitle,
  comingSoon,
  accent = 'neutral',
  children,
  style,
}: Props) {
  return (
    <div style={{ ...card, ...accentBorder[accent], ...style }}>
      {label && <p style={labelStyle}>{label}</p>}
      {title && <p style={titleStyle}>{title}</p>}
      {subtitle && <p style={subStyle}>{subtitle}</p>}
      {children}
      {comingSoon && <span style={comingSoonPill}>Coming soon</span>}
    </div>
  )
}

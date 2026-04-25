'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import WidgetCard from './widgets/WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './widgets/WidgetSkeleton'
import { useDashboardStateQuery } from '@/lib/queries'

interface MissingField {
  key:
    | 'careerLevel'
    | 'careerTargetLevel'
    | 'industry'
    | 'filingStatus'
    | 'dependents'
    | 'employer401kMatchPct'
    | 'vestingStatus'
  label: string
  benefit: string
  anchor: '#career' | '#household' | '#compensation'
}

const FIELD_META: readonly MissingField[] = [
  { key: 'careerLevel',          label: 'Current career level',  benefit: 'Sharpens trajectory modeling',          anchor: '#career' },
  { key: 'careerTargetLevel',    label: 'Target career level',   benefit: 'Sharpens trajectory modeling',          anchor: '#career' },
  { key: 'industry',             label: 'Industry',              benefit: 'Improves benchmarking',                 anchor: '#career' },
  { key: 'filingStatus',         label: 'Tax filing status',     benefit: 'Enables tax-aware opportunity cost',    anchor: '#household' },
  { key: 'dependents',           label: 'Dependents',            benefit: 'Enables tax-aware opportunity cost',    anchor: '#household' },
  { key: 'employer401kMatchPct', label: '401(k) employer match', benefit: 'Captures the full cost of inaction',    anchor: '#compensation' },
  { key: 'vestingStatus',        label: 'Vesting status',        benefit: 'Captures the full cost of inaction',    anchor: '#compensation' },
] as const

const subheadStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  lineHeight: 1.55,
  margin: 0,
  marginBottom: '12px',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 0',
  borderTop: '1px solid var(--color-border)',
  textDecoration: 'none',
  color: 'inherit',
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '14px',
  color: 'var(--color-text)',
  margin: 0,
}

const benefitStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.02em',
  margin: 0,
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

export default function SharpenForecastWidget() {
  const { data, isPending } = useDashboardStateQuery()

  if (isPending) {
    return <WidgetSkeleton variant="list" />
  }

  const profile = data?.onboardingProfile ?? null
  if (!profile) {
    // No profile yet means onboarding has not been completed; the dashboard
    // shows other prompts for that case so this widget stays out of the way.
    return null
  }

  const missing = FIELD_META.filter(f => isMissing(profile[f.key]))
  if (missing.length === 0) return null

  return (
    <motion.div {...WIDGET_REVEAL}>
      <WidgetCard
        variant="list"
        eyebrow="Sharpen your forecast"
        cta={
          <Link href="/dashboard/profile" style={ctaLink}>
            Edit profile &rarr;
          </Link>
        }
      >
        <p style={subheadStyle}>
          Add a few details to your profile so Illumin&apos;s Engine can be more precise.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {missing.map(field => (
            <Link
              key={field.key}
              href={`/dashboard/profile${field.anchor}`}
              style={rowStyle}
              className="card-hoverable"
            >
              <p style={labelStyle}>{field.label}</p>
              <p style={benefitStyle}>{field.benefit}</p>
            </Link>
          ))}
        </div>
      </WidgetCard>
    </motion.div>
  )
}

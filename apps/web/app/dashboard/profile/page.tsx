'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/lib/dashboardData'
import {
  useResetOnboardingMutation,
  useSaveOnboardingMutation,
  type OnboardingProfile,
} from '@/lib/queries'
import { calcTotals } from '@/lib/benefitsAnalysis'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import { colors, fonts, spacing } from '@/lib/theme'

const SAVE_CONFIRMATION_TEXT = 'Updated. Dependent figures recalculated.'
const SAVE_CONFIRMATION_TTL_MS = 4000

const RISK_LABELS: Record<number, string> = {
  1: 'Very conservative',
  2: 'Conservative',
  3: 'Balanced',
  4: 'Aggressive',
  5: 'Very aggressive',
}

const IS_DEV = process.env.NODE_ENV !== 'production'

type Section = 'financial' | 'location' | 'employment' | 'goals'

interface ProfileValues {
  age: number
  annualIncome: number
  savingsRate: number
  retirementAge: number
  locationCity: string
  locationState: string
  jobTitle: string
  employer: string
  employerStartDate: string
  targetRetirementIncome: number
  emergencyFundMonthsTarget: number
  riskTolerance: number
}

function toValues(p: OnboardingProfile | null): ProfileValues {
  return {
    age:                       p?.age ?? 0,
    annualIncome:              p?.annualIncome ?? 0,
    savingsRate:               p?.savingsRate ?? 0,
    retirementAge:             p?.retirementAge ?? 65,
    locationCity:              p?.locationCity ?? '',
    locationState:             p?.locationState ?? '',
    jobTitle:                  p?.jobTitle ?? '',
    employer:                  p?.employer ?? '',
    employerStartDate:         p?.employerStartDate ? String(p.employerStartDate).slice(0, 10) : '',
    targetRetirementIncome:    p?.targetRetirementIncome ?? 0,
    emergencyFundMonthsTarget: p?.emergencyFundMonthsTarget ?? 6,
    riskTolerance:             p?.riskTolerance ?? 3,
  }
}

function payloadFor(section: Section, v: ProfileValues): Record<string, unknown> {
  switch (section) {
    case 'financial':
      return {
        age:           Number(v.age),
        annualIncome:  Number(v.annualIncome),
        savingsRate:   Number(v.savingsRate),
        retirementAge: Number(v.retirementAge),
      }
    case 'location':
      return {
        locationCity:  v.locationCity.trim(),
        locationState: v.locationState.trim().toUpperCase(),
      }
    case 'employment':
      return {
        jobTitle:          v.jobTitle.trim(),
        employer:          v.employer.trim(),
        employerStartDate: v.employerStartDate,
      }
    case 'goals':
      return {
        targetRetirementIncome:
          v.targetRetirementIncome > 0 ? Number(v.targetRetirementIncome) : null,
        emergencyFundMonthsTarget: Number(v.emergencyFundMonthsTarget),
        riskTolerance:             Number(v.riskTolerance),
      }
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtIncome(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function formatStartDate(iso: string | null): string {
  if (!iso) return 'Not set'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Not set'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Dev panel: wipes the OnboardingProfile + EmploymentBenefits rows and the
 * client-side onboarding flags, then sends the user back to /onboarding. Hidden
 * in production. The server DELETE endpoint also refuses to run in prod.
 */
function RestartOnboardingPanel({ variant }: { variant: 'desktop' | 'mobile' }) {
  const router = useRouter()
  const reset = useResetOnboardingMutation()
  const [error, setError] = useState<string | null>(null)

  const handleRestart = () => {
    if (!window.confirm('Reset onboarding? This wipes your profile, benefits, and onboarding flags. Accounts and transactions are kept.')) {
      return
    }
    setError(null)
    reset.mutate(undefined, {
      onSuccess: () => {
        try {
          window.localStorage.removeItem('illumin_onboarding_intro_seen')
          window.localStorage.removeItem('illumin_accounts_animated')
        } catch {}
        router.push('/onboarding')
      },
      onError: err => setError(err instanceof Error ? err.message : 'Reset failed'),
    })
  }

  const isMobile = variant === 'mobile'
  const container: CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    border: '1px dashed var(--color-negative-border)',
    borderRadius: '2px',
    padding: isMobile ? '20px' : '28px',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: '16px',
  }

  return (
    <div style={container}>
      <div>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-negative)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: '6px',
        }}>
          Dev tools
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text)', marginBottom: '2px' }}>
          Restart onboarding
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Wipes profile, benefits, and onboarding flags. Accounts and transactions are preserved.
        </p>
        {error && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-negative)', marginTop: '8px' }}>
            {error}
          </p>
        )}
      </div>
      <button
        onClick={handleRestart}
        disabled={reset.isPending}
        style={{
          padding: '10px 18px',
          backgroundColor: 'transparent',
          border: '1px solid var(--color-negative-border)',
          borderRadius: '2px',
          color: 'var(--color-negative)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: reset.isPending ? 'not-allowed' : 'pointer',
          opacity: reset.isPending ? 0.65 : 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {reset.isPending ? 'Resetting...' : 'Restart'}
      </button>
    </div>
  )
}

// ── Variant-aware style bundles ────────────────────────────────────────────
// Desktop and mobile share layout structure but differ in card padding,
// fieldset columns, field font sizes, and button row direction. Centralizing
// these via a single `styles(isMobile)` helper lets every section share the
// same render tree below.
function styles(isMobile: boolean) {
  const card: CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    padding: isMobile ? spacing.cardPad : '28px',
  }
  const sectionLabel: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: isMobile ? 10 : 12,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    margin: 0,
  }
  const fieldLabel: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: isMobile ? 10 : 12,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    marginBottom: isMobile ? 6 : 6,
    display: 'block',
  }
  const fieldValue: CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: isMobile ? 22 : 26,
    fontWeight: 400,
    color: 'var(--color-text)',
  }
  const input: CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 16,
    boxSizing: 'border-box',
  }
  const primaryBtn: CSSProperties = {
    padding: isMobile ? '12px 24px' : '10px 24px',
    backgroundColor: 'var(--color-gold)',
    border: 'none',
    borderRadius: '2px',
    color: 'var(--color-surface)',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    minHeight: isMobile ? spacing.tapTarget : undefined,
    width: isMobile ? '100%' : undefined,
  }
  const secondaryBtn: CSSProperties = {
    padding: isMobile ? '12px 18px' : '10px 18px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    minHeight: isMobile ? spacing.tapTarget : undefined,
    width: isMobile ? '100%' : undefined,
  }
  const editBtn: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: isMobile ? 11 : 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--color-gold)',
    background: 'none',
    border: '1px solid var(--color-gold-border)',
    borderRadius: '2px',
    padding: '5px 12px',
    cursor: 'pointer',
    minHeight: isMobile ? spacing.tapTarget : undefined,
  }
  const readGrid: CSSProperties = {
    display: isMobile ? 'flex' : 'grid',
    gridTemplateColumns: isMobile ? undefined : 'repeat(2, 1fr)',
    flexWrap: isMobile ? 'wrap' : undefined,
    gap: isMobile ? 16 : 20,
  }
  const editGrid: CSSProperties = {
    display: isMobile ? 'flex' : 'grid',
    flexDirection: isMobile ? 'column' : undefined,
    gridTemplateColumns: isMobile ? undefined : 'repeat(2, 1fr)',
    gap: isMobile ? 14 : 16,
    marginBottom: 20,
  }
  const buttonRow: CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: 10,
  }
  return { card, sectionLabel, fieldLabel, fieldValue, input, primaryBtn, secondaryBtn, editBtn, readGrid, editGrid, buttonRow }
}

function ProfileContent({ isMobile }: { isMobile: boolean }) {
  const { loading, email, profile, setProfile, benefits } = useDashboard()
  const saveOnboarding = useSaveOnboardingMutation()

  const [editing,    setEditing]    = useState<Section | null>(null)
  const [editValues, setEditValues] = useState<ProfileValues | null>(null)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [savedAt,    setSavedAt]    = useState<number | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }
  }, [])

  const s = styles(isMobile)
  const saving = saveOnboarding.isPending
  const initials = email ? email.slice(0, 2).toUpperCase() : ''
  const totals = benefits?.extracted ? calcTotals(benefits.extracted) : null

  const startEdit = (section: Section) => {
    if (editing && editing !== section) return
    setEditValues(toValues(profile))
    setEditing(section)
    setSaveError(null)
  }
  const cancelEdit = () => { setEditing(null); setSaveError(null) }
  const save = () => {
    if (!editing || !editValues) return
    setSaveError(null)
    const payload = payloadFor(editing, editValues)
    saveOnboarding.mutate(payload, {
      onSuccess: (data: { profile?: OnboardingProfile }) => {
        if (data?.profile) setProfile(data.profile)
        setEditing(null)
        setSavedAt(Date.now())
        if (confirmTimer.current) clearTimeout(confirmTimer.current)
        confirmTimer.current = setTimeout(() => setSavedAt(null), SAVE_CONFIRMATION_TTL_MS)
      },
      onError: err => setSaveError(err instanceof Error ? err.message : 'Save failed'),
    })
  }

  // ── Section wrapper: header row + body. `canEdit` toggles the Edit button
  //    visibility for sections that haven't been activated yet. `anotherOpen`
  //    hides the Edit button while a different section is being edited, so
  //    users can't silently discard unsaved input by switching sections.
  const renderSection = (
    section: Section,
    title: string,
    body: ReactNode,
    editBody: ReactNode,
  ) => {
    const isEditing = editing === section
    const anotherOpen = editing !== null && !isEditing
    const wrapperStyle: CSSProperties = isMobile ? {} : s.card
    const Wrapper = isMobile
      ? ({ children }: { children: ReactNode }) => <MobileCard>{children}</MobileCard>
      : ({ children }: { children: ReactNode }) => <div style={wrapperStyle}>{children}</div>

    return (
      <Wrapper>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, gap: 12,
        }}>
          <p style={s.sectionLabel}>{title}</p>
          {!isEditing && !anotherOpen && (
            <button
              onClick={() => startEdit(section)}
              style={s.editBtn}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-gold)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-gold-border)')}
            >
              Edit
            </button>
          )}
        </div>
        {!isEditing ? body : (
          <div>
            {editBody}
            {saveError && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-negative)', marginBottom: 14 }}>
                {saveError}
              </p>
            )}
            <div style={s.buttonRow}>
              <button onClick={save} disabled={saving} style={{
                ...s.primaryBtn,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.65 : 1,
              }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={cancelEdit} disabled={saving} style={s.secondaryBtn}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Wrapper>
    )
  }

  // ── Read-only field cell (label + value) used across every section. ────
  const cell = (label: string, value: string) => (
    <div key={label} style={{ width: isMobile ? 'calc(50% - 8px)' : undefined }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: isMobile ? 10 : 12,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        marginBottom: 4,
      }}>
        {label}
      </p>
      <p style={s.fieldValue}>{value}</p>
    </div>
  )

  const ev = editValues // alias for concise edit field readers

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.sectionGap : 20 }}
    >
      {/* Profile header */}
      {isMobile ? (
        <MobileCard>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              backgroundColor: colors.goldSubtle,
              border: `1px solid ${colors.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: fonts.mono, fontSize: 16, color: colors.gold,
              letterSpacing: '0.05em', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 400, color: colors.text, marginBottom: 4 }}>
                {email ?? 'Your Profile'}
              </p>
              {totals && (
                <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMid }}>
                  Contract value {fmt(totals.totalContractValue)}/yr, {fmt(totals.totalBenefitsValue)}/yr in benefits
                </p>
              )}
            </div>
          </div>
        </MobileCard>
      ) : (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            backgroundColor: 'var(--color-gold-subtle)',
            border: '1px solid var(--color-gold-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '17px', color: 'var(--color-gold)',
            letterSpacing: '0.05em', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400,
              color: 'var(--color-text)', marginBottom: '4px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email ?? 'Your Profile'}
            </p>
            {totals && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-mid)' }}>
                Contract value {fmt(totals.totalContractValue)}/yr &middot; {fmt(totals.totalBenefitsValue)}/yr in benefits
              </p>
            )}
          </div>
        </div>
      )}

      {savedAt && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.02em',
          margin: 0,
        }}>
          {SAVE_CONFIRMATION_TEXT}
        </p>
      )}

      {loading ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text-muted)' }}>Loading...</p>
      ) : !profile ? (
        isMobile ? (
          <MobileCard>
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
                No profile data yet. Complete the onboarding flow to set your financial baseline.
              </p>
              <Link href="/onboarding" style={{
                display: 'block', textAlign: 'center', padding: '12px 20px',
                backgroundColor: colors.gold, color: 'var(--color-surface)',
                borderRadius: 2, textDecoration: 'none',
                fontFamily: fonts.mono, fontSize: 13, letterSpacing: '0.06em',
                minHeight: spacing.tapTarget, boxSizing: 'border-box',
              }}>
                Complete onboarding
              </Link>
            </div>
          </MobileCard>
        ) : (
          <div style={s.card}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              No profile data yet. Complete the onboarding flow to set your financial baseline.
            </p>
            <Link href="/onboarding" style={{
              display: 'inline-block', padding: '10px 20px',
              backgroundColor: 'var(--color-gold)', color: 'var(--color-surface)',
              borderRadius: '2px', textDecoration: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.06em',
            }}>
              Complete onboarding
            </Link>
          </div>
        )
      ) : (
        <>
          {/* ── Financial profile ───────────────────────────────────────── */}
          {renderSection(
            'financial',
            'Financial profile',
            <div style={s.readGrid}>
              {cell('Age',            `${profile.age} years old`)}
              {cell('Annual income',  `$${fmtIncome(profile.annualIncome)}`)}
              {cell('Savings rate',   `${profile.savingsRate}%`)}
              {cell('Retirement age', `${profile.retirementAge} years old`)}
            </div>,
            ev && (
              <div style={s.editGrid}>
                <div>
                  <label style={s.fieldLabel}>Age</label>
                  <input type="number" value={ev.age} min={16} max={80}
                    onChange={e => setEditValues(v => v ? { ...v, age: Number(e.target.value) } : v)}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.fieldLabel}>Annual income ($)</label>
                  <input type="number" value={ev.annualIncome} min={0}
                    onChange={e => setEditValues(v => v ? { ...v, annualIncome: Number(e.target.value) } : v)}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.fieldLabel}>Savings rate (%)</label>
                  <input type="number" value={ev.savingsRate} min={0} max={100}
                    onChange={e => setEditValues(v => v ? { ...v, savingsRate: Number(e.target.value) } : v)}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.fieldLabel}>Target retirement age</label>
                  <input type="number" value={ev.retirementAge} min={45} max={80}
                    onChange={e => setEditValues(v => v ? { ...v, retirementAge: Number(e.target.value) } : v)}
                    style={s.input} />
                </div>
              </div>
            ),
          )}

          {/* ── Personal / location ─────────────────────────────────────── */}
          {renderSection(
            'location',
            'Personal',
            <div style={s.readGrid}>
              {cell('City',  profile.locationCity  || 'Not set')}
              {cell('State', profile.locationState || 'Not set')}
            </div>,
            ev && (
              <div style={s.editGrid}>
                <div>
                  <label style={s.fieldLabel}>City</label>
                  <input type="text" value={ev.locationCity}
                    onChange={e => setEditValues(v => v ? { ...v, locationCity: e.target.value } : v)}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.fieldLabel}>State</label>
                  <input type="text" value={ev.locationState} maxLength={2}
                    onChange={e => setEditValues(v => v ? { ...v, locationState: e.target.value.toUpperCase().slice(0, 2) } : v)}
                    style={{ ...s.input, textTransform: 'uppercase' }} />
                </div>
              </div>
            ),
          )}

          {/* ── Employment ──────────────────────────────────────────────── */}
          {renderSection(
            'employment',
            'Employment',
            <div style={s.readGrid}>
              {cell('Job title',  profile.jobTitle || 'Not set')}
              {cell('Employer',   profile.employer || 'Not set')}
              {cell('Start date', formatStartDate(profile.employerStartDate))}
            </div>,
            ev && (
              <div style={s.editGrid}>
                <div>
                  <label style={s.fieldLabel}>Job title</label>
                  <input type="text" value={ev.jobTitle}
                    onChange={e => setEditValues(v => v ? { ...v, jobTitle: e.target.value } : v)}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.fieldLabel}>Employer</label>
                  <input type="text" value={ev.employer}
                    onChange={e => setEditValues(v => v ? { ...v, employer: e.target.value } : v)}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.fieldLabel}>Start date</label>
                  <input type="date" value={ev.employerStartDate}
                    onChange={e => setEditValues(v => v ? { ...v, employerStartDate: e.target.value } : v)}
                    style={s.input} />
                </div>
              </div>
            ),
          )}

          {/* ── Goals & risk ────────────────────────────────────────────── */}
          {renderSection(
            'goals',
            'Goals & risk',
            <div style={s.readGrid}>
              {cell(
                'Target retirement income',
                profile.targetRetirementIncome && profile.targetRetirementIncome > 0
                  ? `$${fmtIncome(profile.targetRetirementIncome)}`
                  : 'Not set',
              )}
              {cell(
                'Emergency fund target',
                profile.emergencyFundMonthsTarget
                  ? `${profile.emergencyFundMonthsTarget} months`
                  : 'Not set',
              )}
              {cell(
                'Risk tolerance',
                profile.riskTolerance ? RISK_LABELS[profile.riskTolerance] ?? 'Not set' : 'Not set',
              )}
            </div>,
            ev && (
              <div style={s.editGrid}>
                <div>
                  <label style={s.fieldLabel}>Target retirement income ($/yr)</label>
                  <input type="number" value={ev.targetRetirementIncome} min={0}
                    onChange={e => setEditValues(v => v ? { ...v, targetRetirementIncome: Number(e.target.value) } : v)}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.fieldLabel}>Emergency fund target (months)</label>
                  <input type="number" value={ev.emergencyFundMonthsTarget} min={0} max={24}
                    onChange={e => setEditValues(v => v ? { ...v, emergencyFundMonthsTarget: Number(e.target.value) } : v)}
                    style={s.input} />
                </div>
                <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <label style={s.fieldLabel}>
                    Risk tolerance: {RISK_LABELS[ev.riskTolerance] ?? 'Balanced'}
                  </label>
                  <input type="range" min={1} max={5} step={1} value={ev.riskTolerance}
                    onChange={e => setEditValues(v => v ? { ...v, riskTolerance: Number(e.target.value) } : v)}
                    style={{ width: '100%' }} />
                </div>
              </div>
            ),
          )}
        </>
      )}

      {/* Link to checklist */}
      {isMobile ? (
        <MobileCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.text, marginBottom: 4 }}>
                Financial checklist
              </p>
              <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>
                Personalized action plan and benefits to-do items.
              </p>
            </div>
            <Link href="/dashboard/checklist" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 18px', minHeight: spacing.tapTarget,
              border: `1px solid ${colors.goldBorder}`,
              borderRadius: 2, textDecoration: 'none',
              fontFamily: fonts.mono, fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: colors.gold,
              whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12,
            }}>
              View
            </Link>
          </div>
        </MobileCard>
      ) : (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text)', marginBottom: '4px' }}>
              Financial checklist
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Personalized action plan and benefits to-do items.
            </p>
          </div>
          <Link href="/dashboard/checklist" style={{
            padding: '8px 18px',
            border: '1px solid var(--color-gold-border)',
            borderRadius: '2px', textDecoration: 'none',
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--color-gold)',
          }}>
            View
          </Link>
        </div>
      )}

      {IS_DEV && <RestartOnboardingPanel variant={isMobile ? 'mobile' : 'desktop'} />}
    </motion.div>
  )
}

export default function ProfilePage() {
  const isMobile = useIsMobile()
  return <ProfileContent isMobile={isMobile} />
}

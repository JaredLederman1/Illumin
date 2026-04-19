'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import { DEFAULTS, secondaryBtn } from '@/components/onboarding/shared'
import type { OnboardingData } from '@/components/onboarding/shared'
import { useIsMobile } from '@/components/onboarding/useIsMobile'
import { ProgressBar } from '@/components/onboarding/ProgressBar'
import { Step1Basics } from '@/components/onboarding/Step1Basics'
import { Step2Employment } from '@/components/onboarding/Step2Employment'
import { Step3Contract } from '@/components/onboarding/Step3Contract'
import { Step4Goals } from '@/components/onboarding/Step4Goals'
import { Step5Plaid, type LinkedAccount } from '@/components/onboarding/Step5Plaid'
import { Step6Reveal } from '@/components/onboarding/Step6Reveal'
import { DashboardPreview } from '@/components/onboarding/DashboardPreview'

type Phase = 'welcome' | 'steps' | 'preview' | 'reveal'

// Step-index to field-payload mapping. Each step only sends its own fields so
// a partial save does not clobber later steps on refresh/resume.
function payloadForStep(step: number, data: OnboardingData): Record<string, unknown> {
  if (step === 0) {
    return {
      age: data.age === '' ? null : data.age,
      annualIncome: data.annualIncome,
      savingsRate: data.savingsRate,
      retirementAge: data.retirementAge,
      locationCity: data.locationCity,
      locationState: data.locationState,
    }
  }
  if (step === 1) {
    return {
      jobTitle: data.jobTitle,
      employer: data.employer,
      employerStartDate: data.employerStartDate || null,
    }
  }
  if (step === 2) {
    return {
      contractParsedData: data.contractParsedData,
    }
  }
  if (step === 3) {
    return {
      targetRetirementIncome: data.targetRetirementIncome,
      emergencyFundMonthsTarget: data.emergencyFundMonthsTarget,
      riskTolerance: data.riskTolerance,
    }
  }
  return {}
}

export default function OnboardingPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [phase, setPhase] = useState<Phase>('welcome')
  const [step, setStep]   = useState<number>(0)
  const [data, setData]   = useState<OnboardingData>(DEFAULTS)

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [skippedPlaid, setSkippedPlaid]     = useState(false)

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [justCompleted, setJustCompleted]   = useState<number | null>(null)
  const [busy, setBusy]                     = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [animPhase, setAnimPhase]           = useState(0)

  // Welcome reveal sequence — same timing as the original page
  useEffect(() => {
    const t1 = setTimeout(() => setAnimPhase(1), 300)
    const t2 = setTimeout(() => setAnimPhase(2), 2000)
    const t3 = setTimeout(() => setAnimPhase(3), 3400)
    const t4 = setTimeout(() => setAnimPhase(4), 4800)
    const advance = setTimeout(() => setPhase('steps'), 6000)
    return () => { [t1, t2, t3, t4, advance].forEach(clearTimeout) }
  }, [])

  // Resume — load any existing profile and jump to the first step that still
  // has missing data. If all core fields are filled we still land on Step 1
  // so the user can review their info before seeing the reveal.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/user/onboarding', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const { profile } = await res.json()
        if (cancelled || !profile) return

        setData(prev => ({
          ...prev,
          age:                        typeof profile.age === 'number' ? profile.age : '',
          annualIncome:               profile.annualIncome ?? 0,
          savingsRate:                profile.savingsRate ?? prev.savingsRate,
          retirementAge:              profile.retirementAge ?? prev.retirementAge,
          locationCity:               profile.locationCity ?? '',
          locationState:              profile.locationState ?? '',
          jobTitle:                   profile.jobTitle ?? '',
          employer:                   profile.employer ?? '',
          employerStartDate:          profile.employerStartDate
            ? String(profile.employerStartDate).slice(0, 10)
            : '',
          contractParsedData:         profile.contractParsedData ?? null,
          contractUploadedAt:         profile.contractUploadedAt ?? null,
          targetRetirementIncome:     profile.targetRetirementIncome ?? null,
          emergencyFundMonthsTarget:  profile.emergencyFundMonthsTarget ?? prev.emergencyFundMonthsTarget,
          majorGoals:                 Array.isArray(profile.majorGoals) ? profile.majorGoals : [],
          riskTolerance:              profile.riskTolerance ?? prev.riskTolerance,
        }))

        const resume: number =
          profile.contractParsedData ? 3
          : profile.jobTitle || profile.employer ? 2
          : profile.age ? 1
          : 0
        setStep(resume)
        setCompletedSteps(new Set(Array.from({ length: resume }, (_, i) => i)))
      } catch {
        // ignore — start fresh
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handlePatch = useCallback((patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }))
  }, [])

  const persistStep = useCallback(async (stepIdx: number, extra: Record<string, unknown> = {}) => {
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      }
      const body = { step: stepIdx, ...payloadForStep(stepIdx, data), ...extra }
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.message ?? j?.error ?? 'Could not save progress.')
        return false
      }
      return true
    } catch {
      setError('Network error. Please try again.')
      return false
    }
  }, [data])

  const step1Complete = useMemo(
    () => typeof data.age === 'number' && data.age > 0 && data.annualIncome > 0,
    [data.age, data.annualIncome]
  )

  const advanceTo = useCallback((next: number) => {
    setJustCompleted(step)
    setCompletedSteps(prev => new Set(prev).add(step))
    window.setTimeout(() => setJustCompleted(null), 650)
    setStep(next)
  }, [step])

  const handleBack = useCallback(() => {
    if (step <= 0) return
    setError(null)
    setStep(step - 1)
  }, [step])

  // Advance handler for steps 0–3 (pure "Continue"). Step 4 uses the Plaid-
  // specific handlers; step 5 triggers the preview then reveal.
  const handleContinue = useCallback(async () => {
    if (step === 0 && !step1Complete) {
      setError('Fill in age and annual salary to continue.')
      return
    }
    setBusy(true)
    const ok = await persistStep(step)
    setBusy(false)
    if (!ok) return
    advanceTo(step + 1)
  }, [step, step1Complete, persistStep, advanceTo])

  const finalize = useCallback(async (opts: { skipped: boolean }): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      }
      const body = {
        finalize: true,
        skipped:  opts.skipped,
        age:              data.age === '' ? null : data.age,
        annualIncome:     data.annualIncome,
        savingsRate:      data.savingsRate,
        retirementAge:    data.retirementAge,
      }
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j?.error === 'asset_account_required') {
          setError(j.message ?? 'An asset account is required to continue.')
        } else {
          setError(j?.message ?? j?.error ?? 'Could not complete onboarding.')
        }
        return false
      }
      const j = await res.json()
      setSkippedPlaid(Boolean(j?.skippedAssetLink))
      return true
    } catch {
      setError('Network error. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }, [data])

  const showPreview = useCallback(() => {
    setPhase('preview')
  }, [])

  const handlePreviewContinue = useCallback(() => {
    setJustCompleted(5)
    setCompletedSteps(prev => new Set(prev).add(5))
    window.setTimeout(() => setJustCompleted(null), 650)
    setPhase('reveal')
    setStep(5)
  }, [])

  const handlePlaidAssetLinked = useCallback(async () => {
    setJustCompleted(4)
    setCompletedSteps(prev => new Set(prev).add(4))
    window.setTimeout(() => setJustCompleted(null), 650)
    const ok = await finalize({ skipped: false })
    if (ok) showPreview()
  }, [finalize, showPreview])

  const handleSkipPlaid = useCallback(async () => {
    setJustCompleted(4)
    setCompletedSteps(prev => new Set(prev).add(4))
    window.setTimeout(() => setJustCompleted(null), 650)
    setSkippedPlaid(true)
    const ok = await finalize({ skipped: true })
    if (ok) showPreview()
  }, [finalize, showPreview])

  // "Skip to account overview" — available on Steps 2, 3, 4, 5. Enabled only
  // once Step 1 required fields exist. Clicking it finalizes onboarding with
  // whatever data has been entered and redirects straight to the dashboard.
  const skipToOverview = useCallback(async () => {
    if (!step1Complete) return
    // Persist whatever the user has typed on the current step first.
    await persistStep(step)
    const ok = await finalize({ skipped: true })
    if (ok) router.push('/dashboard')
  }, [step, step1Complete, persistStep, finalize, router])

  const showSkipButton = step >= 1 && step <= 4

  const stepVariants = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return <WelcomeSplash animPhase={animPhase} onSkip={() => setPhase('steps')} />
  }

  if (phase === 'preview') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <DashboardPreview
          age={data.age}
          annualIncome={data.annualIncome}
          savingsRate={data.savingsRate}
          retirementAge={data.retirementAge}
          skippedPlaid={skippedPlaid}
          onContinue={handlePreviewContinue}
        />
      </div>
    )
  }

  if (phase === 'reveal') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ paddingTop: '20px' }}>
          <ProgressBar
            currentStep={5}
            completedSteps={new Set([0, 1, 2, 3, 4, 5])}
            justCompleted={justCompleted}
            isMobile={isMobile}
          />
        </div>
        <div
          className="onboarding-step-padding"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Step6Reveal data={data} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ paddingTop: '20px' }}>
        <ProgressBar
          currentStep={step}
          completedSteps={completedSteps}
          justCompleted={justCompleted}
          isMobile={isMobile}
        />
      </div>

      <div
        className="onboarding-top-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          disabled={step <= 0 || busy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: step <= 0 || busy ? 'default' : 'pointer',
            opacity: step <= 0 ? 0 : 1,
            visibility: step <= 0 ? 'hidden' : 'visible',
            color: 'var(--color-text-muted)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 400,
            color: 'var(--color-gold)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          Illumin
        </div>
        <div style={{ width: '32px' }} />
      </div>

      <div
        className="onboarding-step-padding"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: step === 0 && !isMobile ? '860px' : '520px' }}
          >
            {step === 0 && (
              <Step1Basics
                data={data}
                onChange={handlePatch}
                isMobile={isMobile}
                onAdvance={handleContinue}
              />
            )}
            {step === 1 && <Step2Employment data={data} onChange={handlePatch} />}
            {step === 2 && (
              <Step3Contract
                data={data}
                onChange={handlePatch}
                onAdvance={handleContinue}
              />
            )}
            {step === 3 && <Step4Goals data={data} onChange={handlePatch} />}
            {step === 4 && (
              <Step5Plaid
                linkedAccounts={linkedAccounts}
                onLinked={accts => setLinkedAccounts(prev => [...prev, ...accts])}
                onCompleteAssetLinked={handlePlaidAssetLinked}
                onSkipForNow={handleSkipPlaid}
                busy={busy}
              />
            )}

            {error && (
              <p
                style={{
                  marginTop: '16px',
                  fontSize: '12px',
                  color: 'var(--color-negative)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {error}
              </p>
            )}

            {/* Desktop Step 1 + Steps 1 and 3 use their own advance. Step 2 (employment)
                and Step 4 (goals) need a shared Continue button. */}
            {(step === 1 || step === 3) && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '44px' }}>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={busy}
                  style={{
                    padding: '13px 36px',
                    backgroundColor: 'var(--color-gold)',
                    border: 'none',
                    borderRadius: '2px',
                    color: 'var(--color-surface)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.65 : 1,
                  }}
                >
                  {busy ? 'Saving…' : 'Continue'}
                </button>
              </div>
            )}

            {/* Desktop Step 1: explicit Continue button since Step1Basics only auto-advances on mobile */}
            {step === 0 && !isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '44px' }}>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={busy || !step1Complete}
                  style={{
                    padding: '13px 36px',
                    backgroundColor: 'var(--color-gold)',
                    border: 'none',
                    borderRadius: '2px',
                    color: 'var(--color-surface)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    cursor: busy || !step1Complete ? 'not-allowed' : 'pointer',
                    opacity: busy || !step1Complete ? 0.55 : 1,
                  }}
                >
                  {busy ? 'Saving…' : 'Continue'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Persistent "Skip to account overview" — steps 2, 3, 4, 5 */}
      {showSkipButton && (
        <div
          style={{
            padding: isMobile ? '16px 20px 24px' : '16px 40px 24px',
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          <button
            type="button"
            onClick={skipToOverview}
            disabled={!step1Complete || busy}
            style={{
              ...secondaryBtn,
              opacity: !step1Complete || busy ? 0.45 : 1,
              cursor: !step1Complete || busy ? 'not-allowed' : 'pointer',
            }}
          >
            Skip to account overview
          </button>
        </div>
      )}
    </div>
  )
}

function WelcomeSplash({ animPhase, onSkip }: { animPhase: number; onSkip: () => void }) {
  const showWelcome = animPhase >= 1
  const showDivider = animPhase >= 2
  const showLine3   = animPhase >= 3
  const showScroll  = animPhase >= 4

  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--color-gold)',
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Illumin
      </div>

      <div style={{ width: '100%', maxWidth: '560px', textAlign: 'center' }}>
        <h1
          className="onboarding-headline"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            color: 'var(--color-text)',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            margin: 0,
            opacity: showWelcome ? 1 : 0,
            transform: showWelcome ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          Welcome to <span style={{ color: 'var(--color-gold)' }}>Illumin</span>
        </h1>

        <div
          style={{
            height: '1px',
            backgroundColor: 'var(--color-gold)',
            marginTop: '32px',
            transformOrigin: 'center',
            transform: showDivider ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 0.7s ease',
          }}
        />

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.75,
            letterSpacing: '0.02em',
            marginTop: '28px',
            marginBottom: 0,
            opacity: showLine3 ? 1 : 0,
            transform: showLine3 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.65s ease, transform 0.65s ease',
          }}
        >
          Six steps. Calibrated for your numbers. Skip anything you are not ready to share.
        </p>
      </div>

      <button
        type="button"
        onClick={onSkip}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: showScroll ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          Begin
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )
}

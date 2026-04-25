'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { OnboardingData } from './shared'
import { continueBtn } from './shared'
import { SubStepShell } from './SubStepShell'
import { useSaveOnboardingMutation, useUploadBenefitsMutation } from '@/lib/queries'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onAdvance: () => void
  onSkip?: () => void
  busy?: boolean
  isMobile: boolean | null
}

// Wires into /api/user/benefits/extract. Kept at its current position in the
// flow because the resume logic in /api/user/onboarding depends on
// contractParsedData being populated before Step 4, and the file-upload state
// is not straightforward to defer until after the reveal.
export function Step3Contract({ data, onChange, onAdvance, onSkip, busy, isMobile }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const upload = useUploadBenefitsMutation()
  const saveOnboarding = useSaveOnboardingMutation()
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>(
    data.contractParsedData ? 'done' : 'idle'
  )
  const [error, setError] = useState<string | null>(null)

  // Records the explicit skip of Step 3 so the resume logic can tell
  // "skipped for now" apart from "completed upload". Both end with an
  // advance past this step in the current flow, but the timestamps let
  // future nudges re-engage users who deferred. Errors are swallowed so a
  // transient network failure does not block advancement; the parent's
  // onSkip below also triggers a save that will retry on reload.
  const handleSkip = async () => {
    try {
      await saveOnboarding.mutateAsync({ contractStepSkipped: true })
    } catch {
      // non-blocking
    }
    onSkip?.()
  }

  const handleFile = async (file: File) => {
    setState('uploading')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('contract', file)
      const result = await upload.mutateAsync(fd)
      onChange({
        contractParsedData: (result?.extracted ?? result?.benefits ?? {}) as Record<string, unknown>,
        contractUploadedAt: new Date().toISOString(),
      })
      setState('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not parse the document.'
      setError(msg)
      setState('error')
    }
  }

  return (
    <SubStepShell
      question="Do you have an offer letter or benefits summary?"
      context="Upload it and Illumin screens your 401k match, equity grants, and every benefit line you would otherwise miss. Everything stays private."
      canAdvance={state === 'done'}
      busy={busy}
      onAdvance={onAdvance}
      onSkip={onSkip ? handleSkip : undefined}
      isMobile={isMobile}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      <div
        style={{
          padding: '32px 28px',
          border: '1px dashed var(--color-border-strong)',
          borderRadius: '2px',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        {state === 'done' ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: 'var(--color-positive)',
                letterSpacing: '0.04em',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Document analyzed. Benefits profile pre-filled.
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Replace document
            </button>
          </motion.div>
        ) : (
          <>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                margin: 0,
                fontWeight: 500,
              }}
            >
              PDF, up to 10 MB
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={state === 'uploading'}
              style={{
                ...continueBtn(),
                opacity: state === 'uploading' ? 0.65 : 1,
                cursor: state === 'uploading' ? 'not-allowed' : 'pointer',
              }}
            >
              {state === 'uploading' ? 'Analyzing...' : 'Choose a file'}
            </button>
            {error && (
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '12px',
                  color: 'var(--color-negative)',
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </SubStepShell>
  )
}

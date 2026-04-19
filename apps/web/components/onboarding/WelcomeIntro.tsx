'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TickingCounter } from './TickingCounter'

interface Props {
  onStart: () => void
}

const TARGET        = 14247.82
const CONTINUE_RATE = 0.5   // dollars per second, resumes at BUTTON_READY

// Cinematic intro timings (seconds, from mount).
const LOGO_DELAY      = 0.2
const COUNTER_START   = 0.8
const COUNTER_END     = 3.0
const CAPTION_START   = 1.2
const HEADLINE_START  = 3.2
const BUTTON_START    = 5.0
const BUTTON_READY    = 6.5   // button becomes interactive
const EXIT_DURATION   = 0.5   // seconds, fade-out on Start click

const REDUCED_FADE = 1.2      // collapsed cross-fade duration

// Phases 1 through 4 are intentionally uninterruptible. No click, scroll,
// keyboard, or touch input advances or skips the sequence. The Start button
// itself is rendered with pointer-events: none and aria-disabled until
// BUTTON_READY. This is the intended UX, not a bug.
export function WelcomeIntro({ onStart }: Props) {
  const [reducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })

  const [buttonReady, setButtonReady] = useState(false)
  const [exiting, setExiting]         = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const readyAt = reducedMotion ? REDUCED_FADE * 1000 : BUTTON_READY * 1000
    const t = window.setTimeout(() => setButtonReady(true), readyAt)
    return () => window.clearTimeout(t)
  }, [reducedMotion])

  // Focus the Start button as soon as it becomes interactive so keyboard
  // users do not need to tab into an otherwise empty viewport.
  useEffect(() => {
    if (buttonReady) buttonRef.current?.focus()
  }, [buttonReady])

  const handleStart = () => {
    if (!buttonReady || exiting) return
    try {
      window.localStorage.setItem('illumin_onboarding_intro_seen', 'true')
    } catch {
      // localStorage may be unavailable (private mode, etc); user still
      // advances, they just see the intro again next load.
    }
    setExiting(true)
    window.setTimeout(onStart, EXIT_DURATION * 1000)
  }

  const fadeTransition = reducedMotion
    ? { duration: REDUCED_FADE, ease: 'easeOut' as const }
    : { duration: 0.6, ease: 'easeOut' as const }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="welcome-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: EXIT_DURATION, ease: 'easeOut' }}
          role="dialog"
          aria-label="Welcome to Illumin"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#0A0A0C',
            color: '#F5F0E8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(24px, 5vw, 64px)',
            overflow: 'hidden',
          }}
        >
          {/* Radial vignette, fades in during phase 1. */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: reducedMotion ? 0.3 : 0.3 }}
            transition={{
              duration: reducedMotion ? REDUCED_FADE : 0.8,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 80% 60% at 50% 38%, rgba(184,145,58,0.55) 0%, rgba(10,10,12,0) 62%)',
              pointerEvents: 'none',
            }}
          />

          {/* Illumin wordmark, top-left. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: reducedMotion ? REDUCED_FADE : 0.6,
              delay: reducedMotion ? 0 : LOGO_DELAY,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              top: 'clamp(20px, 4vh, 40px)',
              left: 'clamp(20px, 5vw, 48px)',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 400,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: '#B8913A',
            }}
          >
            Illumin
          </motion.div>

          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: '960px',
              gap: 'clamp(14px, 2.4vh, 24px)',
            }}
          >
            {/* Counter. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: reducedMotion ? REDUCED_FADE : 0.4,
                delay: reducedMotion ? 0 : COUNTER_START,
                ease: 'easeOut',
              }}
            >
              <TickingCounter
                target={TARGET}
                mainStartSec={reducedMotion ? 0 : COUNTER_START}
                mainDurationSec={COUNTER_END - COUNTER_START}
                continueStartSec={reducedMotion ? REDUCED_FADE : BUTTON_READY}
                continueRatePerSec={CONTINUE_RATE}
                reducedMotion={reducedMotion}
                ariaLabel="Estimated annual opportunity cost"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(48px, 14vw, 80px)',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  color: '#F5F0E8',
                }}
              />
            </motion.div>

            {/* Caption. */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: reducedMotion ? REDUCED_FADE : 0.6,
                delay: reducedMotion ? 0 : CAPTION_START,
                ease: 'easeOut',
              }}
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(13px, 1.2vw, 14px)',
                color: 'rgba(245,240,232,0.55)',
                letterSpacing: '0.04em',
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: '540px',
              }}
            >
              The average American leaves this much on the table every year.
            </motion.p>

            {/* Headline. */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? REDUCED_FADE : 0.8,
                delay: reducedMotion ? 0 : HEADLINE_START,
                ease: 'easeOut',
              }}
              style={{
                margin: 0,
                marginTop: 'clamp(16px, 3vh, 32px)',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(32px, 9vw, 64px)',
                fontWeight: 300,
                color: '#F5F0E8',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                textAlign: 'center',
                maxWidth: '760px',
              }}
            >
              Clarity changes everything.
            </motion.h1>

            {/* Start button. Wrapped so entrance (outer) and ambient pulse
                (inner) do not fight over the same transform channel. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: reducedMotion ? REDUCED_FADE : 1.0,
                delay: reducedMotion ? 0 : BUTTON_START,
                ease: 'easeOut',
              }}
              style={{ marginTop: 'clamp(28px, 4.5vh, 56px)' }}
            >
              <motion.button
                ref={buttonRef}
                type="button"
                onClick={handleStart}
                aria-label="Start onboarding"
                aria-disabled={!buttonReady}
                animate={
                  buttonReady && !reducedMotion
                    ? { scale: [1, 1.02, 1] }
                    : { scale: 1 }
                }
                transition={
                  buttonReady && !reducedMotion
                    ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0 }
                }
                style={{
                  padding: '16px 32px',
                  background: 'transparent',
                  border: '1px solid rgba(245,240,232,0.75)',
                  borderRadius: '2px',
                  color: '#F5F0E8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  cursor: buttonReady ? 'pointer' : 'default',
                  pointerEvents: buttonReady ? 'auto' : 'none',
                  transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
                }}
                onMouseEnter={e => {
                  if (!buttonReady) return
                  e.currentTarget.style.backgroundColor = '#F5F0E8'
                  e.currentTarget.style.color = '#0A0A0C'
                  e.currentTarget.style.borderColor = '#F5F0E8'
                }}
                onMouseLeave={e => {
                  if (!buttonReady) return
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#F5F0E8'
                  e.currentTarget.style.borderColor = 'rgba(245,240,232,0.75)'
                }}
              >
                Start
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

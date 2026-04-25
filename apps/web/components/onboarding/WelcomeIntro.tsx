'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  onStart: () => void
}

// Cinematic intro timings (seconds, from mount). The sequence:
//   0.6s   counter + subtitle fade in, centered, full size
//   4.0s   counter + subtitle start translating up and shrinking
//   4.7s   headline "Illumin stands watch over everything." fades into center
//   6.0s   outlined "Begin" button fades in
//   7.0s   Begin button becomes interactive
const LOGO_DELAY            = 0.2
const COUNTER_START         = 0.6
const CAPTION_START         = 1.0
const COUNTER_COLLAPSE_AT   = 4.0
const COUNTER_MOVE_DUR      = 0.9
const HEADLINE_START        = 4.7
const BUTTON_START          = 6.0
const BUTTON_READY          = 7.0
const EXIT_DURATION         = 0.5

const REDUCED_FADE = 1.2

const HEADLINE_TEXT = 'stands watch over everything.'

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

  // Counter layout: starts centered at full size, slides up and shrinks once
  // the headline begins to appear so the screen re-balances. Reduced-motion
  // users get the collapsed state on mount.
  const [counterCollapsed, setCounterCollapsed] = useState<boolean>(reducedMotion)

  useEffect(() => {
    const readyAt = reducedMotion ? REDUCED_FADE * 1000 : BUTTON_READY * 1000
    const t = window.setTimeout(() => setButtonReady(true), readyAt)
    return () => window.clearTimeout(t)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const t = window.setTimeout(
      () => setCounterCollapsed(true),
      COUNTER_COLLAPSE_AT * 1000,
    )
    return () => window.clearTimeout(t)
  }, [reducedMotion])

  // Focus the Begin button as soon as it becomes interactive so keyboard
  // users do not need to tab into an otherwise empty viewport.
  useEffect(() => {
    if (buttonReady) buttonRef.current?.focus()
  }, [buttonReady])

  const handleStart = () => {
    if (!buttonReady || exiting) return
    setExiting(true)
    window.setTimeout(onStart, EXIT_DURATION * 1000)
  }

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
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(24px, 5vw, 64px)',
            overflow: 'hidden',
            minHeight: '100dvh',
          }}
        >
          {/* Radial vignette, fades in during phase 1. */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{
              duration: reducedMotion ? REDUCED_FADE : 0.8,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 80% 60% at 50% 38%, color-mix(in srgb, var(--color-gold) 55%, transparent) 0%, transparent 62%)',
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
              color: 'var(--color-gold)',
            }}
          >
            Illumin
          </motion.div>

          {/* Counter + subtitle. Absolutely positioned so they can start
              centered and then glide up to the top as the headline arrives. */}
          <motion.div
            initial={{
              opacity: 0,
              top: '50%',
              translateX: '-50%',
              translateY: '-50%',
              scale: 1,
            }}
            animate={{
              opacity: 1,
              top: counterCollapsed ? '16vh' : '50%',
              translateX: '-50%',
              translateY: counterCollapsed ? '0%' : '-50%',
              scale: counterCollapsed ? 0.62 : 1,
            }}
            transition={{
              opacity: {
                duration: reducedMotion ? REDUCED_FADE : 0.4,
                delay: reducedMotion ? 0 : COUNTER_START,
                ease: 'easeOut',
              },
              top:         { duration: reducedMotion ? 0 : COUNTER_MOVE_DUR, ease: 'easeOut' },
              translateY:  { duration: reducedMotion ? 0 : COUNTER_MOVE_DUR, ease: 'easeOut' },
              scale:       { duration: reducedMotion ? 0 : COUNTER_MOVE_DUR, ease: 'easeOut' },
            }}
            style={{
              position: 'absolute',
              left: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(14px, 2.4vh, 24px)',
              width: '100%',
              maxWidth: '960px',
              transformOrigin: 'center top',
              willChange: 'transform, top',
            }}
          >
            <span
              aria-label="Estimated annual opportunity cost"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(48px, 14vw, 88px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: 'var(--color-negative)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              $14,247.82
            </span>
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
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(19px, 1.65vw, 21px)',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.02em',
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: '540px',
              }}
            >
              The average American forfeits this much every year. Illumin won't let you.
            </motion.p>
          </motion.div>

          {/* Headline, vertically centered. */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '0 clamp(20px, 5vw, 48px)',
            }}
          >
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
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(32px, 9vw, 64px)',
                fontWeight: 300,
                color: 'var(--color-text)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                textAlign: 'center',
                maxWidth: '860px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-gold)',
                  fontWeight: 400,
                }}
              >
                Illumin
              </span>
              {' '}
              {HEADLINE_TEXT}
            </motion.h1>
          </div>

          {/* Begin button. Outlined gold, understated, pulses gently once
              interactive. Anchored to the headline center with a fixed
              calc offset so the button always sits the same distance below
              the headline regardless of viewport height.

              A static wrapper handles the `translate(-50%, -50%)` centering
              via CSS. The child motion.div only animates opacity and scale.
              If centering were placed on the same element as the scale
              animation, framer-motion would overwrite the style transform
              each frame and the button would drift off center. */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(50% + clamp(170px, 24vh, 260px))',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: reducedMotion ? REDUCED_FADE : 1.0,
              delay: reducedMotion ? 0 : BUTTON_START,
              ease: 'easeOut',
            }}
          >
            <motion.button
              ref={buttonRef}
              type="button"
              onClick={handleStart}
              aria-label="Begin onboarding"
              aria-disabled={!buttonReady}
              animate={
                buttonReady && !reducedMotion
                  ? { scale: [1, 1.015, 1] }
                  : { scale: 1 }
              }
              transition={
                buttonReady && !reducedMotion
                  ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0 }
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '48px',
                padding: '14px 40px',
                background: 'transparent',
                border: '1px solid var(--color-gold)',
                borderRadius: '2px',
                color: 'var(--color-gold)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontWeight: 500,
                cursor: buttonReady ? 'pointer' : 'default',
                pointerEvents: buttonReady ? 'auto' : 'none',
                transition: 'background-color 200ms ease, color 200ms ease',
              }}
              onMouseEnter={e => {
                if (!buttonReady) return
                e.currentTarget.style.backgroundColor = 'var(--color-gold)'
                e.currentTarget.style.color = 'var(--color-bg)'
              }}
              onMouseLeave={e => {
                if (!buttonReady) return
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--color-gold)'
              }}
            >
              Begin
            </motion.button>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

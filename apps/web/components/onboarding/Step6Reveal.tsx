'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useScroll,
  useTransform,
} from 'framer-motion'
import Link from 'next/link'
import type { OnboardingData } from './shared'
import { fmt, oneYearDelayCost, projectWealth } from './shared'
import { useAuthEmail, useAuthToken } from '@/lib/queries'

interface Props {
  data: OnboardingData
}

/**
 * The payoff moment. Slow-scrolled Illumin wordmark parallax, user's first
 * name in big serif, word-by-word sentence build, gold dollar counter, three
 * sentence personalized narrative streamed from /api/onboarding/reveal-
 * narrative (template fallback on failure), and the frosted "connect your
 * accounts to unlock" tiles. Designed to take 8 to 12 seconds to read.
 */
export function Step6Reveal({ data }: Props) {
  const ageNum = typeof data.age === 'number' ? data.age : 0
  // The headline figure is the cost of one year of delay at the recommended
  // savings rate (20% floor), not at the user's current rate. Framed this
  // way so the number reflects what the user permanently forfeits each year
  // they postpone investing at the recommended level, rather than locking
  // in their under-investment as the baseline.
  const recommendedSavingsRate = Math.max(20, data.savingsRate)
  const oppCost = oneYearDelayCost(ageNum, data.annualIncome, recommendedSavingsRate, data.retirementAge)
  const projectionNow = projectWealth(ageNum, data.annualIncome, data.savingsRate, data.retirementAge)
  const projection20 = projectWealth(ageNum, data.annualIncome, recommendedSavingsRate, data.retirementAge)
  const savingsRateGain = Math.max(0, projection20 - projectionNow)

  const email = useAuthEmail()
  const authToken = useAuthToken()
  const firstName = useMemo(() => deriveFirstName(email), [email])

  // Scroll parallax for the Illumin wordmark that recedes as the user reads.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })
  const wordmarkScale = useTransform(scrollYProgress, [0, 1], [1, 0.6])
  // Reads as a watermark presence rather than legible wordmark. Settles to
  // 0.04 by the time the hero copy is in view, so the name and dollar
  // figure land with all the visual weight.
  const wordmarkOpacity = useTransform(scrollYProgress, [0, 1], [0.08, 0.04])
  const wordmarkY = useTransform(scrollYProgress, [0, 1], [0, -120])

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <WordmarkBackdrop
        scale={wordmarkScale}
        opacity={wordmarkOpacity}
        y={wordmarkY}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(32px, 5vh, 56px)',
          padding: 'clamp(40px, 6vh, 80px) clamp(20px, 5vw, 48px)',
          position: 'relative',
        }}
      >
        <HeroSection firstName={firstName} oppCost={oppCost} />
        <CtaRow />
        <NarrativeSection
          authToken={authToken}
          data={data}
          oppCost={oppCost}
          projectionNow={projectionNow}
          savingsRateGain={savingsRateGain}
        />
      </div>
    </div>
  )
}

function WordmarkBackdrop({
  scale,
  opacity,
  y,
}: {
  scale: ReturnType<typeof useTransform<number, number>>
  opacity: ReturnType<typeof useTransform<number, number>>
  y: ReturnType<typeof useTransform<number, number>>
}) {
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute',
        top: 'clamp(40px, 8vh, 120px)',
        left: '50%',
        translateX: '-50%',
        scale,
        opacity,
        y,
        pointerEvents: 'none',
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(140px, 26vw, 320px)',
        fontWeight: 300,
        color: 'var(--color-gold)',
        letterSpacing: '-0.02em',
        whiteSpace: 'nowrap',
        mixBlendMode: 'normal',
      }}
    >
      Illumin
    </motion.div>
  )
}

function HeroSection({ firstName, oppCost }: { firstName: string; oppCost: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(40px, 7vw, 72px)',
          fontWeight: 300,
          color: 'var(--color-text)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}
      >
        {firstName}.
      </motion.p>

      <HeadlineSentence oppCost={oppCost} />
    </div>
  )
}

const SENTENCE_PREFIX = 'By not investing at the recommended rate, each year that goes by you permanently forfeit'
const SENTENCE_SUFFIX = 'in future wealth.'

function HeadlineSentence({ oppCost }: { oppCost: number }) {
  const prefixWords = SENTENCE_PREFIX.split(' ')
  const suffixWords = SENTENCE_SUFFIX.split(' ')
  const baseDelay = 1.1
  const wordStep = 0.12

  return (
    <motion.p
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      style={{
        margin: 0,
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(28px, 4.8vw, 48px)',
        fontWeight: 300,
        color: 'var(--color-text)',
        lineHeight: 1.25,
        letterSpacing: '-0.005em',
      }}
    >
      {prefixWords.map((w, i) => (
        <FadeWord key={`p-${i}`} delay={baseDelay + i * wordStep}>
          {w}
        </FadeWord>
      ))}
      <GoldNumber
        value={oppCost}
        delaySec={baseDelay + prefixWords.length * wordStep + 0.2}
      />
      {suffixWords.map((w, i) => (
        <FadeWord
          key={`s-${i}`}
          delay={baseDelay + (prefixWords.length + 1) * wordStep + 1.4 + i * wordStep}
        >
          {w}
        </FadeWord>
      ))}
    </motion.p>
  )
}

function FadeWord({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'inline-block', marginRight: '0.3em' }}
    >
      {children}
    </motion.span>
  )
}

function GoldNumber({ value, delaySec }: { value: number; delaySec: number }) {
  const motionValue = useMotionValue(0)
  const [display, setDisplay] = useState('$0')

  useEffect(() => {
    const unsubscribe = motionValue.on('change', v => {
      setDisplay(fmt(Math.round(v)))
    })
    const controls = animate(motionValue, value, {
      duration: 1.2,
      delay: delaySec,
      ease: [0.22, 1, 0.36, 1],
    })
    return () => {
      unsubscribe()
      controls.stop()
    }
  }, [value, delaySec, motionValue])

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: delaySec, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'inline-block',
        marginRight: '0.3em',
        fontFamily: 'var(--font-mono)',
        fontSize: '1.18em',
        color: 'var(--color-gold)',
        letterSpacing: '-0.01em',
      }}
    >
      {display}
    </motion.span>
  )
}

function NarrativeSection({
  authToken,
  data,
  oppCost,
  projectionNow,
  savingsRateGain,
}: {
  authToken: string | null
  data: OnboardingData
  oppCost: number
  projectionNow: number
  savingsRateGain: number
}) {
  const [text, setText] = useState<string>('')
  const [loaded, setLoaded] = useState(false)
  const fallback = useMemo(
    () => buildFallbackNarrative(data, oppCost, projectionNow, savingsRateGain),
    [data, oppCost, projectionNow, savingsRateGain],
  )

  useEffect(() => {
    if (!authToken) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/onboarding/reveal-narrative', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok || !res.body) {
          if (!cancelled) {
            setText(fallback)
            setLoaded(true)
          }
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          if (!cancelled) setText(buffer)
        }
        if (!cancelled) setLoaded(true)
      } catch {
        if (!cancelled) {
          setText(fallback)
          setLoaded(true)
        }
      }
    })()
    return () => { cancelled = true }
  }, [authToken, fallback])

  const displayText = text.trim().length > 0 ? text : fallback

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 4.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '3px',
        padding: 'clamp(24px, 3.5vh, 36px) clamp(22px, 3vw, 32px)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '16px',
          fontWeight: 500,
        }}
      >
        From the Illumin Engine
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          fontWeight: 300,
          color: 'var(--color-text)',
          lineHeight: 1.55,
          letterSpacing: '0.005em',
          minHeight: loaded ? undefined : '4em',
        }}
      >
        {displayText}
      </p>
    </motion.div>
  )
}

function CtaRow() {
  const buttonBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '52px',
    padding: '14px 32px',
    borderRadius: '2px',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 3.8, ease: [0.22, 1, 0.36, 1] }}
      className="reveal-cta-row"
      style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '4px',
        width: '100%',
      }}
    >
      <Link
        href="/dashboard/accounts"
        style={{
          ...buttonBase,
          backgroundColor: 'var(--color-gold)',
          border: '1.5px solid var(--color-gold)',
          color: 'var(--color-bg)',
        }}
      >
        Connect your accounts
      </Link>
      <Link
        href="/dashboard"
        style={{
          ...buttonBase,
          backgroundColor: 'transparent',
          border: '1.5px solid var(--color-gold)',
          color: 'var(--color-gold)',
        }}
      >
        Connect later
      </Link>
    </motion.div>
  )
}

function deriveFirstName(email: string | null): string {
  if (!email) return 'You'
  const local = email.split('@')[0] ?? ''
  const firstSegment = local.split(/[._+-]/)[0] ?? ''
  const cleaned = firstSegment.replace(/[^a-zA-Z]/g, '')
  if (cleaned.length === 0) return 'You'
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

function buildFallbackNarrative(
  data: OnboardingData,
  oppCost: number,
  projectionNow: number,
  savingsRateGain: number,
): string {
  const savingsRate = data.savingsRate
  const retirementAge = data.retirementAge
  const ageNum = typeof data.age === 'number' ? data.age : 0
  const years = Math.max(0, retirementAge - ageNum)

  const s1 = `Your current trajectory has you retiring at ${retirementAge} with ${fmt(projectionNow)} after ${years} years of compounding, and every year you stay below the recommended rate permanently forfeits ${fmt(oppCost)} in future wealth.`
  const s2 = savingsRateGain > 0
    ? `Moving your savings rate from ${savingsRate}% to 20% would add ${fmt(savingsRateGain)} to your retirement number, the single biggest lever on this page.`
    : `Your savings rate is already pulling hard, so the next lever is tax-advantaged capacity and employer match capture rather than raw contribution volume.`
  const s3 = `Connect your accounts next so Illumin can price every idle dollar, uncovered match, and mispriced risk against these numbers instead of estimates.`
  return `${s1} ${s2} ${s3}`
}

'use client'

import { useEffect, type CSSProperties } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'

interface Props {
  target: number
  mainStartSec: number
  mainDurationSec: number
  continueStartSec?: number
  continueRatePerSec?: number
  reducedMotion: boolean
  style?: CSSProperties
  ariaLabel?: string
}

function formatUSD(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Drives a large currency readout via framer-motion's useMotionValue, so the
// numeric update path does not trigger React re-renders 60 times per second.
// Phase 1: animate from 0 to `target` over `mainDurationSec` starting at
// `mainStartSec`, using a decelerating easing. Phase 2 (optional): at
// `continueStartSec`, begin a linear climb at `continueRatePerSec` so the
// readout keeps pulling the eye after the main sequence settles.
export function TickingCounter({
  target,
  mainStartSec,
  mainDurationSec,
  continueStartSec,
  continueRatePerSec,
  reducedMotion,
  style,
  ariaLabel,
}: Props) {
  const value = useMotionValue(reducedMotion ? target : 0)
  const formatted = useTransform(value, formatUSD)

  useEffect(() => {
    if (reducedMotion) {
      value.set(target)
      return
    }

    const mainControls = animate(value, target, {
      duration: mainDurationSec,
      delay: mainStartSec,
      ease: [0.22, 1, 0.36, 1],
    })

    let continueControls: ReturnType<typeof animate> | null = null
    let continueTimer: number | null = null

    if (
      typeof continueStartSec === 'number' &&
      typeof continueRatePerSec === 'number' &&
      continueRatePerSec > 0
    ) {
      const ceilingDelta = continueRatePerSec * 60 * 60 * 24
      continueTimer = window.setTimeout(() => {
        continueControls = animate(value, target + ceilingDelta, {
          duration: 60 * 60 * 24,
          ease: 'linear',
        })
      }, continueStartSec * 1000)
    }

    return () => {
      mainControls.stop()
      continueControls?.stop()
      if (continueTimer !== null) window.clearTimeout(continueTimer)
    }
  }, [value, target, mainStartSec, mainDurationSec, continueStartSec, continueRatePerSec, reducedMotion])

  return (
    <motion.span
      aria-live="polite"
      aria-label={ariaLabel}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
    >
      {formatted}
    </motion.span>
  )
}

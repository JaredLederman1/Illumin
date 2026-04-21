'use client'

import { motion } from 'framer-motion'

interface Props {
  value: number  // 0..1
  isMobile: boolean
}

/**
 * Thin hairline progress bar in gold, advancing with each sub-step. No
 * numbers, no segments, no "step X of Y" language per the intentional
 * restraint of the onboarding flow.
 */
export function ProgressBar({ value, isMobile }: Props) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div
      style={{
        width: '100%',
        padding: isMobile ? '0 20px' : '0 40px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '1px',
          backgroundColor: 'var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={false}
          animate={{ width: `${clamped * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            backgroundColor: 'var(--color-gold)',
          }}
        />
      </div>
    </div>
  )
}

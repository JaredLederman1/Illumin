'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { TOTAL_STEPS } from './shared'

interface Props {
  currentStep: number
  completedSteps: Set<number>
  justCompleted: number | null
  isMobile: boolean
}

export function ProgressBar({ currentStep, completedSteps, justCompleted, isMobile }: Props) {
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: isMobile ? '0 20px' : '0 40px',
        }}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const filled = completedSteps.has(i) || i === currentStep
          const isActive = i === currentStep
          const isCelebrating = justCompleted === i
          return (
            <div
              key={i}
              style={{
                flex: 1,
                position: 'relative',
                height: '3px',
                backgroundColor: filled ? 'var(--color-gold)' : 'var(--color-border)',
                borderRadius: '2px',
                transition: 'background-color 350ms ease',
                opacity: isActive && !completedSteps.has(i) ? 0.55 : 1,
              }}
            >
              <AnimatePresence>
                {isCelebrating && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'backOut' }}
                    style={{
                      position: 'absolute',
                      right: '-2px',
                      top: '-10px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-surface)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

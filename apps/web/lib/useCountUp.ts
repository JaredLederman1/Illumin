'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animated count-up that eases from the currently displayed value toward a
 * new target whenever `target` changes. Starting from the current value (not
 * zero) means rapid target updates produce continuous motion instead of a
 * jarring reset.
 *
 * When `debounceMs > 0`, a change to `target` is deferred by that many
 * milliseconds of inactivity before the animation starts. During the
 * debounce window the displayed value stays static. Useful for inputs that
 * the user is actively editing where each keystroke would otherwise trigger
 * a new animation.
 */
export function useCountUp(
  target: number,
  duration = 900,
  skip = false,
  debounceMs = 0,
): number {
  const [value, setValue] = useState(skip ? target : 0)
  const rafRef     = useRef<number | null>(null)
  const startRef   = useRef<number | null>(null)
  const currentRef = useRef<number>(skip ? target : 0)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    const cancelRaf = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    const clearDebounce = () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }

    if (skip) {
      clearDebounce()
      cancelRaf()
      if (currentRef.current !== target) {
        currentRef.current = target
        // Defer the state commit so the linter's no-setState-in-effect rule
        // is satisfied; the single rAF tick is imperceptible.
        rafRef.current = requestAnimationFrame(() => setValue(target))
      }
      return () => cancelRaf()
    }

    const run = () => {
      cancelRaf()
      const from = currentRef.current
      const to   = target
      if (from === to) return
      startRef.current = null
      const step = (timestamp: number) => {
        if (startRef.current === null) startRef.current = timestamp
        const elapsed  = timestamp - startRef.current
        const progress = Math.min(elapsed / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        const next = from + (to - from) * eased
        currentRef.current = next
        setValue(next)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          currentRef.current = to
          setValue(to)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }

    clearDebounce()
    if (debounceMs > 0) {
      debounceRef.current = window.setTimeout(run, debounceMs)
    } else {
      run()
    }

    return () => {
      cancelRaf()
      clearDebounce()
    }
  }, [target, duration, skip, debounceMs])

  return value
}

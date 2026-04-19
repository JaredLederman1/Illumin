'use client'

import { useEffect, useState } from 'react'

// Returns true when viewport width is under 768px, matching the breakpoint in
// globals.css. Listens to resize so the layout reacts if the user rotates or
// resizes. Default is false (desktop) so SSR renders the multi-input layout.
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = () => setIsMobile(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}

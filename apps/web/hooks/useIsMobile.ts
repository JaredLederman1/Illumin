'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true if the viewport is phone-width, false if desktop, or null
 * before the first client-side measurement. Returning null on SSR and the
 * very first client paint prevents the desktop-default flash on mobile
 * devices that the previous useState(false) baseline produced.
 *
 * Mobile breakpoint: viewport width <= 768px (matches @media max-width: 768px in globals.css)
 *
 * In React Native this hook is replaced by: return true
 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return isMobile
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './FloatingNav.module.css'

export default function FloatingNav() {
  const [atFeatures, setAtFeatures] = useState(false)

  useEffect(() => {
    const target = document.getElementById('features-headline')
    if (!target) return
    const update = () => {
      setAtFeatures(target.getBoundingClientRect().top <= 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <>
      <Link
        href="/"
        className={`${styles.logo} ${atFeatures ? styles.logoHidden : ''}`}
        aria-label="Illumin home"
        aria-hidden={atFeatures}
        tabIndex={atFeatures ? -1 : 0}
      >
        Illumin
      </Link>

      <nav
        className={`${styles.authGroup} ${atFeatures ? styles.authGroupCentered : ''}`}
        aria-label="Account"
      >
        <Link href="/auth/login" className={styles.link}>
          Log in
        </Link>
        <Link href="/auth/signup" className={styles.cta}>
          Get started
        </Link>
      </nav>
    </>
  )
}

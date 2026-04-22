'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './FloatingNav.module.css'

const SPLIT_THRESHOLD = 80

export default function FloatingNav() {
  const [docked, setDocked] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setDocked(window.scrollY > SPLIT_THRESHOLD)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [menuOpen])

  const scrollToFeatures = () => {
    setMenuOpen(false)
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* Desktop: left pill (wordmark + Features) */}
      <nav
        className={`${styles.leftPill} ${docked ? styles.docked : ''}`}
        aria-label="Primary"
      >
        <span className={styles.wordmark}>Illumin</span>
        <a
          href="#features"
          className={styles.link}
          onClick={e => {
            e.preventDefault()
            scrollToFeatures()
          }}
        >
          Features
        </a>
      </nav>

      {/* Desktop: right pill (Log in + Get started) */}
      <nav
        className={`${styles.rightPill} ${docked ? styles.docked : ''}`}
        aria-label="Account"
      >
        <Link href="/auth/login" className={styles.link}>
          Log in
        </Link>
        <Link href="/auth/signup" className={styles.cta}>
          Get started
        </Link>
      </nav>

      {/* Mobile hamburger */}
      <button
        className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        <a
          href="#features"
          className={styles.mobileLink}
          onClick={e => {
            e.preventDefault()
            scrollToFeatures()
          }}
        >
          Features
        </a>
        <Link href="/auth/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
          Log in
        </Link>
        <Link href="/auth/signup" className={styles.mobileCta} onClick={() => setMenuOpen(false)}>
          Get started
        </Link>
      </div>
    </>
  )
}

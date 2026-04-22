'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function HeroCTAs() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className={styles.ctas} data-hero-ctas>
      <Link href="/auth/signup" className={styles.btnPrimary}>
        GET STARTED
      </Link>
      <button className={styles.btnGhost} onClick={() => scrollTo('features')}>
        SEE THE PLATFORM
      </button>
    </div>
  )
}

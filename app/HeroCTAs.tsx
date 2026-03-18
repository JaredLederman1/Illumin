'use client'

import styles from './page.module.css'

export default function HeroCTAs() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className={styles.ctas}>
      <button className={styles.btnPrimary} onClick={() => scrollTo('calculator')}>
        See your opportunity cost
      </button>
      <button className={styles.btnGhost} onClick={() => scrollTo('features')}>
        How it works
      </button>
    </div>
  )
}

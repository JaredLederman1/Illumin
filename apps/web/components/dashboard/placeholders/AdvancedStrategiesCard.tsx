'use client'

import WidgetCard from '../widgets/WidgetCard'

const strategies = [
  'Tax-loss harvesting',
  'Roth conversion ladder',
  'Estate and beneficiary review',
  'Direct indexing',
]

export default function AdvancedStrategiesCard() {
  return (
    <WidgetCard variant="list" eyebrow="Advanced strategies">
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {strategies.map(s => (
          <li
            key={s}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-text-mid)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold)',
              }}
            />
            {s}
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

'use client'

import { useState, CSSProperties } from 'react'
import { textInput } from './shared'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  hasDefault?: boolean
  onInteract?: () => void
  type?: 'text' | 'number' | 'date'
  style?: CSSProperties
  ariaLabel?: string
  prefix?: string
}

// Input that renders its value in muted color until the user focuses or edits.
// Use hasDefault=true when the displayed value is a pre-fill the user can
// accept without changing. The muted state is local to each mount. Interact
// once and the active state persists through the remainder of the session.
export function DefaultedInput({
  value,
  onChange,
  placeholder,
  inputMode = 'text',
  hasDefault = false,
  onInteract,
  type = 'text',
  style,
  ariaLabel,
  prefix,
}: Props) {
  const [touched, setTouched] = useState(!hasDefault)
  // If the parent flips hasDefault to false, we treat the field as active
  // directly (no effect needed). The touched flag only matters while the
  // parent is still claiming the value is a default.
  const muted = hasDefault && !touched
  const color = muted ? 'var(--color-text-muted)' : 'var(--color-text)'

  const inner = (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={() => {
        if (!touched) {
          setTouched(true)
          onInteract?.()
        }
      }}
      onChange={e => {
        if (!touched) {
          setTouched(true)
          onInteract?.()
        }
        onChange(e.target.value)
      }}
      style={{
        ...textInput,
        color,
        ...(prefix ? { paddingLeft: '32px' } : {}),
        ...style,
      }}
    />
  )

  if (!prefix) return inner

  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'var(--color-text-muted)',
          pointerEvents: 'none',
        }}
      >
        {prefix}
      </span>
      {inner}
    </div>
  )
}

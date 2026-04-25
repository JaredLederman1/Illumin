import type { CSSProperties } from 'react'

/**
 * App-wide button style factories.
 *
 * These three factories replace the static onboarding tokens that previously
 * lived in components/onboarding/shared.ts and the duplicated locals that
 * grew up in app/dashboard/profile/page.tsx and components/OppCostCalculator.tsx.
 * Calling each factory with no arguments reproduces the original onboarding
 * tokens exactly, property-for-property. Variant axes adjust from that
 * baseline.
 */

const TAP_TARGET_PX = 44

export type ButtonOptions = {
  /**
   * Layout family.
   *
   *   inline: 44px tap-height, inline-flex, centered with gap. Default.
   *   block:  block-display button with vertical auto margin and a slightly
   *           looser padding. Used inside narrow content cards where the
   *           button should sit on its own row, like OppCostCalculator's
   *           summary row.
   */
  layout?: 'inline' | 'block'
  /**
   * Type system.
   *
   *   sans: Geist sans, the default UI font.
   *   mono: DM Mono, used by dashboard rows that already lean monospace
   *         (profile cancel buttons, OppCost CTA).
   */
  font?: 'sans' | 'mono'
  /**
   * Visual weight.
   *
   *   primary: uppercase, bolder. Default.
   *   subtle:  sentence case, no enforced weight. Used by cancel-style
   *            actions on /dashboard/profile so they read as quieter than
   *            the gold Save CTA next to them.
   */
  emphasis?: 'primary' | 'subtle'
  /**
   * When provided as a real boolean, the factory swaps in the responsive
   * padding / min-height / width pattern the dashboard profile page uses
   * (12px 18px and 100% width on mobile, 10px 18px and auto on desktop).
   * Pass null or omit to fall back to the static layout sizing.
   */
  isMobile?: boolean | null
  /**
   * Whether to render a 1px border. Default depends on the factory:
   *   continueBtn:  false (gold fill, no border)
   *   secondaryBtn: false (transparent, no border)
   *   outlineBtn:   true  (transparent, 1px gold border)
   */
  bordered?: boolean
}

/** Returns true when the responsive variant should kick in. */
function responsiveProvided(opts: ButtonOptions): boolean {
  return opts.isMobile === true || opts.isMobile === false
}

function responsiveOverrides(opts: ButtonOptions): CSSProperties {
  if (!responsiveProvided(opts)) return {}
  const mobile = opts.isMobile === true
  return {
    padding: mobile ? '12px 18px' : '10px 18px',
    minHeight: mobile ? `${TAP_TARGET_PX}px` : undefined,
    width: mobile ? '100%' : undefined,
  }
}

function layoutStyles(layout: NonNullable<ButtonOptions['layout']>, paddingInline: string): CSSProperties {
  if (layout === 'block') {
    return {
      display: 'block',
      margin: '48px auto 0',
      padding: paddingInline,
    }
  }
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: `${TAP_TARGET_PX}px`,
    padding: paddingInline,
  }
}

/**
 * Primary gold-fill Continue button.
 *
 * Defaults reproduce the onboarding shared continueBtn exactly. Most common
 * non-default usage: `continueBtn({ layout: 'block', font: 'mono' })` for
 * the calculator widget summary row.
 */
export function continueBtn(opts: ButtonOptions = {}): CSSProperties {
  const layout = opts.layout ?? 'inline'
  const font = opts.font ?? 'sans'
  const emphasis = opts.emphasis ?? 'primary'
  const bordered = opts.bordered ?? false

  const fill: CSSProperties = {
    backgroundColor: 'var(--color-gold)',
    border: bordered ? '1px solid var(--color-gold)' : 'none',
    borderRadius: '2px',
    color: 'var(--color-surface)',
    cursor: 'pointer',
  }

  const layoutPadding = layout === 'block' ? '13px 36px' : '12px 34px'
  const layoutS = layoutStyles(layout, layoutPadding)

  const fontS: CSSProperties = font === 'mono'
    ? {
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        letterSpacing: '0.12em',
        fontWeight: 500,
      }
    : {
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        letterSpacing: '0.14em',
        fontWeight: 600,
      }

  const emphasisS: CSSProperties = emphasis === 'subtle'
    ? { textTransform: 'none' }
    : { textTransform: 'uppercase' }

  return {
    ...fill,
    ...layoutS,
    ...fontS,
    ...emphasisS,
    ...responsiveOverrides(opts),
  }
}

/**
 * Quieter button used for "Skip for now" and cancel-style actions.
 *
 * Defaults reproduce the onboarding shared secondaryBtn exactly. Most common
 * non-default usage on /dashboard/profile:
 * `secondaryBtn({ font: 'mono', emphasis: 'subtle', isMobile, bordered: true })`
 * to render a sentence-case mono Cancel that scales 10/12px padding by
 * viewport.
 */
export function secondaryBtn(opts: ButtonOptions = {}): CSSProperties {
  const layout = opts.layout ?? 'inline'
  const font = opts.font ?? 'sans'
  const emphasis = opts.emphasis ?? 'primary'
  const bordered = opts.bordered ?? false

  const baseColors: CSSProperties = {
    background: 'transparent',
    border: bordered ? '1px solid var(--color-border)' : 'none',
    borderRadius: '2px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
  }

  // secondaryBtn does not have a "looser" padding under layout: block; its
  // base padding stays 10px 20px since this button never sits as a hero
  // CTA. The block variant only flips display + margin.
  const layoutS: CSSProperties = layout === 'block'
    ? {
        display: 'block',
        margin: 0,
        padding: '10px 20px',
      }
    : {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: `${TAP_TARGET_PX}px`,
        padding: '10px 20px',
      }

  const fontS: CSSProperties = font === 'mono'
    ? {
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        letterSpacing: '0.08em',
      }
    : {
        fontFamily: 'var(--font-sans)',
        fontSize: '12px',
        letterSpacing: '0.12em',
        fontWeight: 500,
      }

  const emphasisS: CSSProperties = emphasis === 'subtle'
    ? { textTransform: 'none' }
    : { textTransform: 'uppercase' }

  return {
    ...baseColors,
    ...layoutS,
    ...fontS,
    ...emphasisS,
    ...responsiveOverrides(opts),
  }
}

/**
 * Outlined gold variant. Used by the WelcomeIntro Begin button and any spot
 * that needs a quiet primary action. Defaults reproduce the previously
 * deleted onboarding outlineBtn exactly.
 */
export function outlineBtn(opts: ButtonOptions = {}): CSSProperties {
  const layout = opts.layout ?? 'inline'
  const font = opts.font ?? 'sans'
  const emphasis = opts.emphasis ?? 'primary'
  const bordered = opts.bordered ?? true

  const baseColors: CSSProperties = {
    backgroundColor: 'transparent',
    border: bordered ? '1px solid var(--color-gold)' : 'none',
    borderRadius: '2px',
    color: 'var(--color-gold)',
    cursor: 'pointer',
  }

  const layoutPadding = layout === 'block' ? '13px 36px' : '12px 34px'
  const layoutS = layoutStyles(layout, layoutPadding)

  const fontS: CSSProperties = font === 'mono'
    ? {
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        letterSpacing: '0.12em',
        fontWeight: 500,
      }
    : {
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        letterSpacing: '0.14em',
        fontWeight: 600,
      }

  const emphasisS: CSSProperties = emphasis === 'subtle'
    ? { textTransform: 'none' }
    : { textTransform: 'uppercase' }

  return {
    ...baseColors,
    ...layoutS,
    ...fontS,
    ...emphasisS,
    ...responsiveOverrides(opts),
  }
}

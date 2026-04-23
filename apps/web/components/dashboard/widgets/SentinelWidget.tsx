'use client'

import { CSSProperties, ReactElement } from 'react'
import Link from 'next/link'
import PerimeterSVG from '@/components/watch/PerimeterSVG'
import { useMockWatchStatus } from '@/lib/vigilance/mockWatchStatus'
import { useMockPerimeterData } from '@/lib/vigilance/mockPerimeterData'

const PERIMETER_SIZE_DESKTOP = 160
const PERIMETER_SIZE_MOBILE = 120
// The bottom ~18px of PerimeterSVG contains the baked-in "PERIMETER" caption.
// Clipping height here hides that caption without editing the shared component.
const PERIMETER_CAPTION_PAD = 18

function integrityColor(score: number): string {
  if (score >= 90) return 'var(--color-positive)'
  if (score < 70) return 'var(--color-negative)'
  return 'var(--color-text)'
}

function buildContextLine(
  signalsMonitored: number,
  signalsActive: number,
  signalsNew: number,
): string {
  const segments: string[] = [`${signalsMonitored} signals monitored`]
  if (signalsActive === 0) {
    segments.push('all quiet')
  } else {
    segments.push(`${signalsActive} active`)
    if (signalsNew > 0) {
      segments.push(`${signalsNew} new since last visit`)
    }
  }
  return segments.join(' · ')
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  margin: 0,
}

const heroStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 48,
  fontWeight: 400,
  lineHeight: 1,
  letterSpacing: '-0.01em',
  margin: 0,
}

const subtextStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--color-text-muted)',
  margin: 0,
}

const contextStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  color: 'var(--color-text-mid)',
  lineHeight: 1.5,
  margin: 0,
}

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  alignSelf: 'flex-start',
  padding: '8px 14px',
  backgroundColor: 'var(--color-surface-2)',
  border: '0.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  letterSpacing: '0.04em',
  color: 'var(--color-text)',
  textDecoration: 'none',
  transition: 'background-color 150ms ease, border-color 150ms ease',
}

const skeletonBlock: CSSProperties = {
  backgroundColor: 'var(--color-surface-2)',
  borderRadius: 2,
  opacity: 0.55,
}

function ClippedPerimeter({
  size,
  cashAmount,
  signals,
}: {
  size: number
  cashAmount: number
  signals: ReturnType<typeof useMockPerimeterData>['signals']
}): ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size - PERIMETER_CAPTION_PAD,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <PerimeterSVG cashAmount={cashAmount} signals={signals} size={size} />
    </div>
  )
}

export default function SentinelWidget(): ReactElement {
  const { data, isLoading } = useMockWatchStatus('active')
  const perimeter = useMockPerimeterData('realistic')

  const isFresh = data !== null && data.signalsMonitored === 0

  const integrity = data?.perimeterIntegrity ?? 0
  const signalsMonitored = data?.signalsMonitored ?? 0
  const signalsActive = data?.signalsActive ?? 0
  const signalsNew = data?.signalsNew ?? 0

  const contextLine = data
    ? buildContextLine(signalsMonitored, signalsActive, signalsNew)
    : ''

  const ctaLabel = isFresh ? 'Complete setup' : 'Open sentinel'

  const ariaLabel = isFresh
    ? 'Sentinel overview. Setting up your watch. Click to complete setup.'
    : data
      ? `Sentinel overview. Perimeter integrity ${integrity} out of 100. ${signalsActive} active signals. Click to open sentinel.`
      : 'Sentinel overview. Loading. Click to open sentinel.'

  return (
    <>
      <style>{`
        .illumin-sentinel-widget {
          display: block;
          text-decoration: none;
          color: inherit;
          background-color: var(--color-surface);
          border: 0.5px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          max-width: 600px;
          min-height: 220px;
          transition: border-color 150ms ease, background-color 150ms ease;
        }
        .illumin-sentinel-widget:hover {
          border-color: var(--color-border-strong);
        }
        .illumin-sentinel-widget:hover .illumin-sentinel-cta {
          background-color: var(--color-surface-hover);
          border-color: var(--color-border-strong);
        }
        .illumin-sentinel-widget-inner {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 24px;
          min-height: 172px;
        }
        .illumin-sentinel-left {
          display: flex;
          flex-direction: column;
          flex: 1 1 55%;
          min-width: 0;
        }
        .illumin-sentinel-right {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          .illumin-sentinel-widget {
            max-width: 100%;
          }
          .illumin-sentinel-widget-inner {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }
          .illumin-sentinel-right {
            justify-content: center;
          }
        }
      `}</style>
      <Link
        href="/dashboard/sentinel"
        role="link"
        aria-label={ariaLabel}
        className="illumin-sentinel-widget"
      >
        <div className="illumin-sentinel-widget-inner">
          <div className="illumin-sentinel-left">
            <p style={labelStyle}>SENTINEL</p>
            <div style={{ height: 8 }} />

            {isLoading || !data ? (
              <>
                <div style={{ ...skeletonBlock, width: 96, height: 44 }} />
                <div style={{ height: 4 }} />
                <div style={{ ...skeletonBlock, width: 56, height: 11 }} />
                <div style={{ height: 16 }} />
                <div style={{ ...skeletonBlock, width: '85%', height: 13 }} />
                <div style={{ height: 20 }} />
              </>
            ) : isFresh ? (
              <>
                <p
                  style={{
                    ...contextStyle,
                    color: 'var(--color-text-mid)',
                  }}
                >
                  Setting up your watch...
                </p>
                <div style={{ height: 20 }} />
              </>
            ) : (
              <>
                <p style={{ ...heroStyle, color: integrityColor(integrity) }}>
                  {integrity}
                </p>
                <div style={{ height: 4 }} />
                <p style={subtextStyle}>out of 100</p>
                <div style={{ height: 16 }} />
                <p style={contextStyle}>{contextLine}</p>
                <div style={{ height: 20 }} />
              </>
            )}

            <span className="illumin-sentinel-cta" style={ctaStyle}>
              {ctaLabel} &rarr;
            </span>
          </div>

          {!isFresh && data && (
            <div className="illumin-sentinel-right">
              <div className="illumin-sentinel-perimeter-desktop">
                <ClippedPerimeter
                  size={PERIMETER_SIZE_DESKTOP}
                  cashAmount={perimeter.cashAmount}
                  signals={perimeter.signals}
                />
              </div>
              <div
                className="illumin-sentinel-perimeter-mobile"
                style={{ display: 'none' }}
              >
                <ClippedPerimeter
                  size={PERIMETER_SIZE_MOBILE}
                  cashAmount={perimeter.cashAmount}
                  signals={perimeter.signals}
                />
              </div>
              <style>{`
                @media (max-width: 768px) {
                  .illumin-sentinel-perimeter-desktop { display: none; }
                  .illumin-sentinel-perimeter-mobile { display: block !important; }
                }
              `}</style>
            </div>
          )}
        </div>
      </Link>
    </>
  )
}

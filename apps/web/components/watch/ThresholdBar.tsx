"use client";

import { useId, useState, type CSSProperties, type ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";

export interface ThresholdBarProps {
  threshold: SignalThreshold;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
  /**
   * Display-side override for the impact readout (e.g., "−$1,240/yr
   * opportunity"). Not part of the wire type. When omitted, the bar falls
   * back to a generic "out of bounds" / "within bounds" readout.
   */
  impactCopy?: string;
}

const SR_ONLY_STYLE: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
};

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  // v1: clamp silently to [0, 100]. If a value exceeds the axis the marker
  // pins to the edge. Off-axis indicator is a future polish pass.
  const pct = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export default function ThresholdBar({
  threshold: t,
  compact = false,
  onClick,
  className,
  impactCopy,
}: ThresholdBarProps): ReactElement {
  const [barHovered, setBarHovered] = useState(false);
  const [markerHovered, setMarkerHovered] = useState<
    "current" | "threshold" | null
  >(null);
  const descId = useId();

  const barHeight = compact ? 10 : 14;
  const labelSize = 12;
  const impactSize = 11;
  const axisSize = compact ? 8.5 : 9.5;
  const spaceLabelToBar = compact ? 3 : 4;
  const spaceBarToAxis = compact ? 2 : 3;
  const markerVerticalExt = 2;

  const currentPos = normalize(t.currentValue, t.axisMin, t.axisMax);
  const thresholdPos = normalize(t.thresholdValue, t.axisMin, t.axisMax);
  const benchmarkPos =
    t.benchmarkValue != null
      ? normalize(t.benchmarkValue, t.axisMin, t.axisMax)
      : null;

  const fillColor = t.inBreach
    ? "var(--color-negative-bg)"
    : "var(--color-positive-bg)";

  const trackColor = barHovered
    ? "var(--color-surface-hover)"
    : "var(--color-surface-2)";

  const impactText = impactCopy ?? (t.inBreach ? "out of bounds" : "within bounds");
  const impactColor = t.inBreach
    ? "var(--color-negative)"
    : "var(--color-text-muted)";

  const description = [
    `${t.metricLabel}.`,
    `Current value ${t.currentValueFormatted}.`,
    `${t.thresholdLabel}.`,
    t.benchmarkLabel ? `${t.benchmarkLabel}.` : null,
    t.inBreach ? "In breach." : "Within bounds.",
  ]
    .filter(Boolean)
    .join(" ");

  const wrapperStyle: CSSProperties = {
    width: "100%",
    cursor: onClick ? "pointer" : "default",
  };

  const topRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: spaceLabelToBar,
  };

  const labelStyle: CSSProperties = {
    fontSize: labelSize,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
    flex: "1 1 auto",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const impactStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: impactSize,
    color: impactColor,
    flex: "0 0 auto",
    whiteSpace: "nowrap",
  };

  const barContainerStyle: CSSProperties = {
    position: "relative",
    height: barHeight,
    backgroundColor: trackColor,
    borderRadius: 2,
    overflow: "visible",
    transition: "background-color 150ms ease",
  };

  const fillStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: `${currentPos}%`,
    backgroundColor: fillColor,
    borderRadius: "2px 0 0 2px",
    pointerEvents: "none",
  };

  const tickStyle = (pos: number): CSSProperties => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    left: `${pos}%`,
    width: 1,
    marginLeft: -0.5,
    backgroundColor: "var(--color-text-muted)",
    opacity: 0.45,
    pointerEvents: "none",
  });

  const markerStyle = (pos: number, color: string): CSSProperties => ({
    position: "absolute",
    top: -markerVerticalExt,
    bottom: -markerVerticalExt,
    left: `${pos}%`,
    width: 2,
    marginLeft: -1,
    backgroundColor: color,
    cursor: "pointer",
    borderRadius: 0,
  });

  const axisRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginTop: spaceBarToAxis,
    fontFamily: "var(--font-mono)",
    fontSize: axisSize,
    color: "var(--color-text-muted)",
    lineHeight: 1.2,
  };

  return (
    <div
      role="meter"
      aria-valuenow={t.currentValue}
      aria-valuemin={t.axisMin}
      aria-valuemax={t.axisMax}
      aria-label={t.metricLabel}
      aria-describedby={descId}
      className={className}
      onClick={onClick}
      style={wrapperStyle}
    >
      <span id={descId} style={SR_ONLY_STYLE}>
        {description}
      </span>
      <div style={topRowStyle}>
        <p style={labelStyle}>{t.metricLabel}</p>
        <span style={impactStyle}>{impactText}</span>
      </div>
      <div
        style={barContainerStyle}
        onMouseEnter={() => setBarHovered(true)}
        onMouseLeave={() => setBarHovered(false)}
      >
        <div style={fillStyle} aria-hidden="true" />
        <div style={tickStyle(thresholdPos)} aria-hidden="true" />
        {benchmarkPos != null && (
          <div style={tickStyle(benchmarkPos)} aria-hidden="true" />
        )}
        {/* Threshold marker (positive/green) behind current marker so the
         * current value always wins visually when they stack. */}
        <div
          style={markerStyle(thresholdPos, "var(--color-positive)")}
          onMouseEnter={() => setMarkerHovered("threshold")}
          onMouseLeave={() =>
            setMarkerHovered(prev => (prev === "threshold" ? null : prev))
          }
          aria-hidden="true"
        />
        <div
          style={markerStyle(currentPos, "var(--color-negative)")}
          onMouseEnter={() => setMarkerHovered("current")}
          onMouseLeave={() =>
            setMarkerHovered(prev => (prev === "current" ? null : prev))
          }
          aria-hidden="true"
        />
        {markerHovered && (
          <MarkerTooltip
            kind={markerHovered}
            threshold={t}
            position={markerHovered === "current" ? currentPos : thresholdPos}
          />
        )}
      </div>
      <div style={axisRowStyle}>
        <span>yours {t.currentValueFormatted}</span>
        <span style={{ textAlign: "center" }}>{t.thresholdLabel}</span>
        <span style={{ textAlign: "right" }}>{t.benchmarkLabel ?? ""}</span>
      </div>
    </div>
  );
}

interface MarkerTooltipProps {
  kind: "current" | "threshold";
  threshold: SignalThreshold;
  position: number;
}

function MarkerTooltip({
  kind,
  threshold: t,
  position,
}: MarkerTooltipProps): ReactElement {
  const text =
    kind === "current"
      ? `Your ${t.metricLabel.toLowerCase()}: ${t.currentValueFormatted}`
      : `Flag at ${t.thresholdLabel.replace(/^threshold\s+/i, "")}`;

  // If the marker sits past the midpoint, right-anchor the tooltip so it
  // doesn't clip off the right edge of the bar container.
  const anchorRight = position > 55;
  const tooltipStyle: CSSProperties = {
    position: "absolute",
    // 12px above the top of the marker (marker extends 2px above the bar).
    top: -12 - 18,
    left: `${position}%`,
    transform: anchorRight ? "translateX(calc(-100% + 1px))" : "translateX(-1px)",
    padding: "4px 8px",
    borderRadius: 4,
    backgroundColor: "var(--color-surface-elevated)",
    border: "0.5px solid var(--color-border-strong)",
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 1,
  };

  return (
    <div style={tooltipStyle} role="tooltip">
      {text}
    </div>
  );
}

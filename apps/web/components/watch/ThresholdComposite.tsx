"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import type { SignalThreshold, SignalDomain } from "@/lib/types/vigilance";

export interface ThresholdCompositeProps {
  threshold: SignalThreshold;
  onClick?: () => void;
  className?: string;
}

// Gauge geometry. Tuned so the arc sits above a short label column without
// exceeding the composite's collapsed height budget.
const GW = 120;
const GH = 70;
const GCX = GW / 2;
const GCY = GH - 8;
const GR = 50;
const GSTROKE = 6;

// Trajectory geometry. Sparkline is rendered with preserveAspectRatio="none"
// so it scales to fill the composite width while keeping its own height.
const TW = 200;
const TH = 40;
const DAYS = 14;

// v1: domain-based direction lookup. A future iteration should add a
// `direction` field to SignalThreshold so the wire type carries this
// explicitly instead of relying on a client-side list.
const HIGHER_IS_BETTER_DOMAINS: SignalDomain[] = ["hysa"];

function isLowerBetter(t: SignalThreshold): boolean {
  return !HIGHER_IS_BETTER_DOMAINS.includes(t.domain);
}

function clampUnit(pos: number): number {
  return Math.max(0, Math.min(1, pos));
}

function norm(v: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clampUnit((v - min) / (max - min));
}

function angleFor(pos: number): number {
  return Math.PI * (1 - pos);
}

function gaugePt(angle: number) {
  return {
    x: GCX + GR * Math.cos(angle),
    y: GCY - GR * Math.sin(angle),
  };
}

function arcPath(from: number, to: number): string {
  const a = gaugePt(from);
  const b = gaugePt(to);
  const large = Math.abs(from - to) > Math.PI ? 1 : 0;
  // Sweep=1 traces the upper semicircle when `from > to` in math radians.
  return `M ${a.x} ${a.y} A ${GR} ${GR} 0 ${large} 1 ${b.x} ${b.y}`;
}

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededUnit(seed: number, salt: number): number {
  const mixed = Math.imul(seed ^ salt, 0x85ebca6b) >>> 0;
  return (mixed % 10000) / 10000;
}

// Copy of the trajectory builder from the ThresholdTrajectory variant, kept
// inline so the composite has no cross-variant dependency.
function buildTrajectory(t: SignalThreshold): {
  values: number[];
  pastValue: number;
} {
  const h = hashString(t.gapId);
  const amplitude = (t.axisMax - t.axisMin) * 0.15;
  const dir = seededUnit(h, 1) > 0.5 ? 1 : -1;
  const pastValue = Math.max(
    t.axisMin,
    Math.min(t.axisMax, t.currentValue + dir * amplitude),
  );
  const values: number[] = [];
  for (let i = 0; i < DAYS; i++) {
    const ratio = i / (DAYS - 1);
    const base = pastValue + (t.currentValue - pastValue) * ratio;
    const noise = (seededUnit(h, i + 10) - 0.5) * amplitude * 0.4;
    values.push(base + noise);
  }
  values[DAYS - 1] = t.currentValue;
  return { values, pastValue };
}

function formatInferredUnit(value: number, hint: string): string {
  const hasPercent = hint.includes("%");
  const trimmed = hint.trim();
  const hasDollar = trimmed.startsWith("$") || trimmed.startsWith("-$");
  const hasPerMo = /\/mo\b/.test(hint);
  const absVal = Math.abs(value);
  let numStr: string;
  if (absVal >= 1000) {
    numStr = Math.round(value).toLocaleString("en-US");
  } else if (absVal >= 100) {
    numStr = Math.round(value).toString();
  } else {
    numStr = value.toFixed(1).replace(/\.0$/, "");
  }
  if (hasDollar && hasPerMo) return `$${numStr}/mo`;
  if (hasDollar) return `$${numStr}`;
  if (hasPercent) return `${numStr}%`;
  return numStr;
}

type Tone = "negative" | "positive" | "neutral";

function formatDeltaReadout(t: SignalThreshold): { text: string; tone: Tone } {
  const lowerBetter = isLowerBetter(t);
  const delta = t.thresholdValue - t.currentValue;
  const absDelta = Math.abs(delta);
  const tolerance = (t.axisMax - t.axisMin) * 0.01;
  const deltaStr = formatInferredUnit(absDelta, t.currentValueFormatted);

  if (absDelta < tolerance) {
    return { text: "at threshold", tone: "neutral" };
  }

  const currentOverThreshold = t.currentValue > t.thresholdValue;
  // Copy reflects the literal geometric relationship (direction-aware words
  // for yield vs cost metrics). Tone comes from the inBreach flag, so a
  // subscription_load that is numerically below threshold but flagged by a
  // separate audit-delta signal still reads as concerning.
  const positionWord = lowerBetter
    ? currentOverThreshold
      ? "over"
      : "under"
    : currentOverThreshold
      ? "above"
      : "below";
  const geometricallySafe = lowerBetter
    ? !currentOverThreshold
    : currentOverThreshold;
  const tone: Tone = t.inBreach
    ? "negative"
    : geometricallySafe
      ? "positive"
      : "negative";

  return { text: `${deltaStr} ${positionWord} threshold`, tone };
}

function toneColor(tone: Tone): string {
  switch (tone) {
    case "negative":
      return "var(--color-negative)";
    case "positive":
      return "var(--color-positive)";
    case "neutral":
      return "var(--color-text-muted)";
  }
}

export default function ThresholdComposite({
  threshold: t,
  onClick,
  className,
}: ThresholdCompositeProps): ReactElement {
  const lowerBetter = isLowerBetter(t);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // v1 touch behavior: if the device has no hover, expose the trajectory
  // permanently. Tap-to-expand is a later iteration.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none)");
    const apply = () => setIsTouch(mq.matches);
    apply();
    if ("addEventListener" in mq) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    return undefined;
  }, []);

  const expanded = hovered || focused || isTouch;

  const currentPos = norm(t.currentValue, t.axisMin, t.axisMax);
  const thresholdPos = norm(t.thresholdValue, t.axisMin, t.axisMax);

  // Width of the warning band in value units, mirrored by direction so both
  // yield-style and cost-style metrics get a consistent amber cushion around
  // the threshold. (threshold * 0.5 matches the `threshold * 1.5` breachLine
  // convention used in the standalone ThresholdGauge variant.)
  const warningBandValue = t.thresholdValue * 0.5;

  let safeArc: string;
  let warnArc: string;
  let breachArc: string;
  if (lowerBetter) {
    const breachLineNorm = norm(
      Math.min(t.axisMax, t.thresholdValue + warningBandValue),
      t.axisMin,
      t.axisMax,
    );
    safeArc = arcPath(angleFor(0), angleFor(thresholdPos));
    warnArc = arcPath(angleFor(thresholdPos), angleFor(breachLineNorm));
    breachArc = arcPath(angleFor(breachLineNorm), angleFor(1));
  } else {
    const breachLineNorm = norm(
      Math.max(t.axisMin, t.thresholdValue - warningBandValue),
      t.axisMin,
      t.axisMax,
    );
    breachArc = arcPath(angleFor(0), angleFor(breachLineNorm));
    warnArc = arcPath(angleFor(breachLineNorm), angleFor(thresholdPos));
    safeArc = arcPath(angleFor(thresholdPos), angleFor(1));
  }

  const needleTip = gaugePt(angleFor(currentPos));
  const delta = formatDeltaReadout(t);

  const { values, pastValue } = useMemo(() => buildTrajectory(t), [t]);

  const points = values.map((v, i) => ({
    x: (i / (DAYS - 1)) * TW,
    y: TH - norm(v, t.axisMin, t.axisMax) * TH,
  }));
  const thresholdY = TH - norm(t.thresholdValue, t.axisMin, t.axisMax) * TH;

  // Breach side on screen: for yield metrics (lowerBetter=false) the breach
  // side is below threshold (y > thresholdY). For cost metrics, breach side
  // is above threshold on screen (y < thresholdY).
  const shouldFill = t.inBreach;
  const clippedY = points.map(p => {
    if (!shouldFill) return thresholdY;
    if (!lowerBetter && p.y > thresholdY) return p.y;
    if (lowerBetter && p.y < thresholdY) return p.y;
    return thresholdY;
  });
  const fillPath =
    `M 0 ${thresholdY} ` +
    points.map((p, i) => `L ${p.x} ${clippedY[i]}`).join(" ") +
    ` L ${TW} ${thresholdY} Z`;
  const linePath =
    `M ${points[0].x} ${points[0].y} ` +
    points
      .slice(1)
      .map(p => `L ${p.x} ${p.y}`)
      .join(" ");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: 320,
    minWidth: 0,
    padding: 16,
    boxSizing: "border-box",
    backgroundColor: "var(--color-surface)",
    border: "0.5px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    cursor: onClick ? "pointer" : "default",
  };

  const gaugeSectionStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  };

  const gaugeLabelLine1Style: CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
    textAlign: "center",
    lineHeight: 1.2,
  };

  const gaugeLabelLine2Style: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: toneColor(delta.tone),
    margin: 0,
    textAlign: "center",
    lineHeight: 1.2,
  };

  // Trajectory section collapses via max-height + opacity + margin-top
  // together. Using max-height (not height) means the composite has natural
  // flow height when collapsed and grows smoothly when expanded, with no
  // layout shift of the gauge itself.
  const trajectorySectionStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
    maxHeight: expanded ? 120 : 0,
    opacity: expanded ? 1 : 0,
    marginTop: expanded ? 12 : 0,
    transition:
      "max-height 200ms ease-out, opacity 200ms ease-out, margin-top 200ms ease-out",
  };

  const driftLabelStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 9,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-muted)",
  };

  const sparkStyle: CSSProperties = {
    width: "100%",
    maxWidth: 200,
    height: TH,
    display: "block",
  };

  const driftFootStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: "var(--color-text-muted)",
  };

  const needleColor = t.inBreach ? "var(--color-negative)" : "var(--color-text)";
  const trajectoryStrokeColor = t.inBreach
    ? "var(--color-negative)"
    : "var(--color-positive)";

  const ariaLabel = [
    `${t.metricLabel} metric.`,
    `Current value ${t.currentValueFormatted}.`,
    `${delta.text}.`,
    t.inBreach ? "In breach." : "Within bounds.",
    "Hover or focus to see 14-day trajectory.",
  ].join(" ");

  const trajectoryAria = `14-day trajectory for ${t.metricLabel}. Current value ${t.currentValueFormatted}.`;

  return (
    <div
      className={className}
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={containerStyle}
    >
      <div style={gaugeSectionStyle}>
        <svg
          width={GW}
          height={GH}
          viewBox={`0 0 ${GW} ${GH}`}
          aria-hidden="true"
        >
          <path
            d={safeArc}
            fill="none"
            stroke="var(--color-positive-bg)"
            strokeWidth={GSTROKE}
            strokeLinecap="butt"
          />
          <path
            d={warnArc}
            fill="none"
            stroke="var(--color-gold-subtle)"
            strokeWidth={GSTROKE}
            strokeLinecap="butt"
          />
          <path
            d={breachArc}
            fill="none"
            stroke="var(--color-negative-bg)"
            strokeWidth={GSTROKE}
            strokeLinecap="butt"
          />
          {t.inBreach && (
            <line
              x1={GCX}
              y1={GCY}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="var(--color-negative)"
              strokeOpacity={0.25}
              strokeWidth={6}
              strokeLinecap="round"
            />
          )}
          <line
            x1={GCX}
            y1={GCY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={needleColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={GCX} cy={GCY} r={3} fill="var(--color-text)" />
          <circle cx={needleTip.x} cy={needleTip.y} r={2} fill={needleColor} />
        </svg>
        <p style={gaugeLabelLine1Style}>
          {t.metricLabel} · {t.currentValueFormatted}
        </p>
        <p style={gaugeLabelLine2Style}>{delta.text}</p>
      </div>
      <div style={trajectorySectionStyle} aria-hidden={!expanded}>
        <span style={driftLabelStyle}>14d drift</span>
        <svg
          viewBox={`0 0 ${TW} ${TH}`}
          preserveAspectRatio="none"
          style={sparkStyle}
          role="img"
          aria-label={trajectoryAria}
        >
          {shouldFill && (
            <path d={fillPath} fill="var(--color-negative)" fillOpacity={0.2} />
          )}
          <line
            x1={0}
            x2={TW}
            y1={thresholdY}
            y2={thresholdY}
            stroke="var(--color-text-muted)"
            strokeWidth={0.75}
            strokeDasharray="2 3"
            opacity={0.6}
          />
          <path
            d={linePath}
            fill="none"
            stroke={trajectoryStrokeColor}
            strokeWidth={1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={points[DAYS - 1].x}
            cy={points[DAYS - 1].y}
            r={2}
            fill={trajectoryStrokeColor}
          />
        </svg>
        <span style={driftFootStyle}>
          was {formatInferredUnit(pastValue, t.currentValueFormatted)} · now{" "}
          {t.currentValueFormatted}
        </span>
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties, ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";
import ThresholdBar from "./ThresholdBar";

export interface ThresholdBarListProps {
  thresholds: SignalThreshold[];
  compact?: boolean;
  onThresholdClick?: (threshold: SignalThreshold) => void;
  /**
   * Display-side resolver for per-bar impact copy. Kept as a callback (rather
   * than baked into the data) so the wire contract for SignalThreshold stays
   * unchanged and host pages can plug in their own copy strategy.
   */
  impactCopyFor?: (threshold: SignalThreshold) => string | undefined;
  className?: string;
}

export default function ThresholdBarList({
  thresholds,
  compact = false,
  onThresholdClick,
  impactCopyFor,
  className,
}: ThresholdBarListProps): ReactElement {
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: compact ? 8 : 10,
    width: "100%",
  };

  return (
    <div style={containerStyle} className={className}>
      {thresholds.map(t => (
        <ThresholdBar
          key={t.gapId}
          threshold={t}
          compact={compact}
          onClick={onThresholdClick ? () => onThresholdClick(t) : undefined}
          impactCopy={impactCopyFor?.(t)}
        />
      ))}
    </div>
  );
}

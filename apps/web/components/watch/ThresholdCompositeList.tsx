"use client";

import type { CSSProperties, ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";
import ThresholdComposite from "./ThresholdComposite";

export interface ThresholdCompositeListProps {
  thresholds: SignalThreshold[];
  onThresholdClick?: (threshold: SignalThreshold) => void;
  className?: string;
  /**
   * Explicit column count. When omitted the grid uses
   * `repeat(auto-fit, minmax(220px, 1fr))` so composites reflow as the
   * container resizes.
   */
  columns?: number;
}

export default function ThresholdCompositeList({
  thresholds,
  onThresholdClick,
  className,
  columns,
}: ThresholdCompositeListProps): ReactElement {
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: columns
      ? `repeat(${columns}, 1fr)`
      : "repeat(auto-fit, minmax(220px, 1fr))",
    // `align-items: start` keeps each composite's natural height so that
    // an expanded cell grows its row without stretching the collapsed
    // siblings to match.
    alignItems: "start",
    gap: 16,
    width: "100%",
  };

  return (
    <div style={gridStyle} className={className}>
      {thresholds.map(t => (
        <ThresholdComposite
          key={t.gapId}
          threshold={t}
          onClick={onThresholdClick ? () => onThresholdClick(t) : undefined}
        />
      ))}
    </div>
  );
}

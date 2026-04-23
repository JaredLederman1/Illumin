/**
 * Mock provider for the threshold bars. Returns SignalThreshold[] that match
 * the wire contract in lib/types/vigilance, so the component can ship first
 * against mock data and swap to the real /api/watch/thresholds later with a
 * one-line change at the call site.
 *
 * `mockImpactCopy` is a parallel helper, not part of the hook return. The
 * SignalThreshold type is the shared API contract and does not carry an
 * impact string; it's a display concern that belongs on the render side.
 */

"use client";

import { useMemo } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";

export type MockThresholdScenario =
  | "realistic"
  | "all_clean"
  | "all_breached"
  | "single"
  | "empty";

export interface MockThresholdsResult {
  thresholds: SignalThreshold[];
  isLoading: boolean;
}

const REALISTIC: SignalThreshold[] = [
  {
    gapId: "cash_yield",
    domain: "hysa",
    metricLabel: "Cash yield",
    currentValue: 0.5,
    currentValueFormatted: "0.5%",
    thresholdValue: 3.5,
    thresholdLabel: "threshold 3.5%",
    benchmarkValue: 4.8,
    benchmarkLabel: "market 4.8%",
    axisMin: 0,
    axisMax: 6,
    inBreach: true,
  },
  {
    gapId: "subscription_load",
    domain: "idle_cash",
    metricLabel: "Subscription load",
    currentValue: 412,
    currentValueFormatted: "$412/mo",
    thresholdValue: 380,
    thresholdLabel: "threshold $380/mo",
    benchmarkValue: null,
    benchmarkLabel: null,
    axisMin: 0,
    axisMax: 600,
    inBreach: true,
  },
  {
    gapId: "dining_category",
    domain: "idle_cash",
    metricLabel: "Dining category drift",
    currentValue: 8,
    currentValueFormatted: "8%",
    thresholdValue: 14,
    thresholdLabel: "threshold 14%",
    benchmarkValue: null,
    benchmarkLabel: null,
    axisMin: 0,
    axisMax: 25,
    inBreach: false,
  },
  {
    gapId: "debt_utilization",
    domain: "debt",
    metricLabel: "Debt utilization",
    currentValue: 22,
    currentValueFormatted: "22%",
    thresholdValue: 30,
    thresholdLabel: "threshold 30%",
    benchmarkValue: 10,
    benchmarkLabel: "model 10%",
    axisMin: 0,
    axisMax: 100,
    inBreach: false,
  },
];

const ALL_CLEAN: SignalThreshold[] = [
  {
    ...REALISTIC[0],
    currentValue: 4.1,
    currentValueFormatted: "4.1%",
    inBreach: false,
  },
  {
    ...REALISTIC[1],
    currentValue: 210,
    currentValueFormatted: "$210/mo",
    inBreach: false,
  },
  REALISTIC[2],
  REALISTIC[3],
];

const ALL_BREACHED: SignalThreshold[] = [
  REALISTIC[0],
  {
    ...REALISTIC[1],
    currentValue: 520,
    currentValueFormatted: "$520/mo",
    inBreach: true,
  },
  {
    ...REALISTIC[2],
    currentValue: 18,
    currentValueFormatted: "18%",
    inBreach: true,
  },
  {
    ...REALISTIC[3],
    currentValue: 42,
    currentValueFormatted: "42%",
    inBreach: true,
  },
];

const SINGLE: SignalThreshold[] = [REALISTIC[0]];

const IMPACT_COPY: Record<string, string> = {
  cash_yield: "−$1,240/yr opportunity",
  subscription_load: "+$22/mo since last audit",
};

/**
 * Returns a display string like "−$1,240/yr opportunity" keyed by gapId.
 * Components should render this in negative color when it is present, and
 * fall back to "out of bounds" / "within bounds" when it is not.
 */
export function mockImpactCopy(gapId: string): string | undefined {
  return IMPACT_COPY[gapId];
}

function seedFor(scenario: MockThresholdScenario): SignalThreshold[] {
  switch (scenario) {
    case "all_clean":
      return ALL_CLEAN;
    case "all_breached":
      return ALL_BREACHED;
    case "single":
      return SINGLE;
    case "empty":
      return [];
    case "realistic":
    default:
      return REALISTIC;
  }
}

export function useMockThresholds(
  scenario: MockThresholdScenario = "realistic",
): MockThresholdsResult {
  return useMemo(
    () => ({ thresholds: seedFor(scenario), isLoading: false }),
    [scenario],
  );
}

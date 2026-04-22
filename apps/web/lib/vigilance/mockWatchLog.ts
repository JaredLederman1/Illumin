/**
 * Mock provider for the watch log. Mirrors the shape of /api/watch/log so
 * components can wire now and swap in the real endpoint later.
 *
 * All timestamps are computed at hook-call time relative to Date.now(), so
 * "2h ago" stays fresh even if the tab is left open overnight.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  Scan,
  Signal,
  SignalDomain,
  SignalSeverity,
  SignalState,
  WatchLogEntry,
  WatchLogResponse,
} from "@/lib/types/vigilance";

export type MockWatchLogScenario =
  | "active_morning"
  | "quiet_day"
  | "eventful"
  | "empty"
  | "loading";

export interface MockWatchLogResult {
  data: WatchLogResponse | null;
  isLoading: boolean;
  loadMore: () => void;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

let mockIdCounter = 0;
function mockId(prefix: string): string {
  mockIdCounter += 1;
  return `mock_${prefix}_${mockIdCounter}`;
}

function buildSignal(args: {
  gapId: string;
  domain: SignalDomain;
  state?: SignalState;
  severity: SignalSeverity;
  annualValue: number;
  lifetimeValue?: number | null;
  payload?: Record<string, unknown>;
  firstDetectedAgoMs: number;
  lastSeenAgoMs: number;
  resolvedAgoMs?: number;
}): Signal {
  return {
    id: mockId("sig"),
    gapId: args.gapId,
    domain: args.domain,
    state: args.state ?? "active",
    severity: args.severity,
    annualValue: args.annualValue,
    lifetimeValue: args.lifetimeValue ?? null,
    payload: args.payload ?? null,
    firstDetectedAt: isoAgo(args.firstDetectedAgoMs),
    lastSeenAt: isoAgo(args.lastSeenAgoMs),
    acknowledgedAt: null,
    actedAt: null,
    resolvedAt: args.resolvedAgoMs != null ? isoAgo(args.resolvedAgoMs) : null,
  };
}

function buildScan(args: {
  startedAgoMs: number;
  completedAgoMs: number;
  checked: number;
  flagged: number;
  resolved?: number;
}): Scan {
  return {
    id: mockId("scan"),
    startedAt: isoAgo(args.startedAgoMs),
    completedAt: isoAgo(args.completedAgoMs),
    status: "completed",
    trigger: "scheduled",
    signalsChecked: args.checked,
    signalsFlagged: args.flagged,
    signalsResolved: args.resolved ?? 0,
    errorMessage: null,
  };
}

function sortEntriesDesc(entries: WatchLogEntry[]): WatchLogEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function buildActiveMorning(): WatchLogEntry[] {
  const entries: WatchLogEntry[] = [
    {
      type: "scan_completed",
      timestamp: isoAgo(2 * HOUR),
      scan: buildScan({
        startedAgoMs: 2 * HOUR + 40 * 1000,
        completedAgoMs: 2 * HOUR,
        checked: 47,
        flagged: 2,
      }),
    },
    {
      type: "signal_new",
      timestamp: isoAgo(2 * HOUR + 5 * MINUTE),
      signal: buildSignal({
        gapId: "idle_cash:default",
        domain: "idle_cash",
        severity: "flagged",
        state: "new",
        annualValue: 1240,
        firstDetectedAgoMs: 2 * HOUR + 5 * MINUTE,
        lastSeenAgoMs: 2 * HOUR,
        payload: { label: "Idle cash drag" },
      }),
    },
    {
      type: "signal_new",
      timestamp: isoAgo(3 * HOUR),
      signal: buildSignal({
        gapId: "hysa:default",
        domain: "hysa",
        severity: "flagged",
        state: "new",
        annualValue: 540,
        firstDetectedAgoMs: 3 * HOUR,
        lastSeenAgoMs: 3 * HOUR,
        payload: { gapBps: 430 },
      }),
    },
    {
      type: "scan_completed",
      timestamp: isoAgo(7 * HOUR),
      scan: buildScan({
        startedAgoMs: 7 * HOUR + 30 * 1000,
        completedAgoMs: 7 * HOUR,
        checked: 47,
        flagged: 0,
      }),
    },
    {
      type: "scan_completed",
      timestamp: isoAgo(13 * HOUR),
      scan: buildScan({
        startedAgoMs: 13 * HOUR + 30 * 1000,
        completedAgoMs: 13 * HOUR,
        checked: 47,
        flagged: 0,
      }),
    },
    {
      type: "signal_widened",
      timestamp: isoAgo(DAY + 2 * HOUR),
      signal: buildSignal({
        gapId: "idle_cash:default",
        domain: "idle_cash",
        severity: "flagged",
        state: "active",
        annualValue: 1240,
        firstDetectedAgoMs: 4 * DAY,
        lastSeenAgoMs: DAY + 2 * HOUR,
        payload: { label: "Idle cash drag" },
      }),
      deltaAnnualValue: 260,
    },
    {
      type: "signal_resolved",
      timestamp: isoAgo(2 * DAY),
      signal: buildSignal({
        gapId: "match:401k",
        domain: "match",
        severity: "urgent",
        state: "resolved",
        annualValue: 3600,
        firstDetectedAgoMs: 14 * DAY,
        lastSeenAgoMs: 2 * DAY,
        resolvedAgoMs: 2 * DAY,
        payload: { label: "401(k) employer match" },
      }),
    },
  ];
  return sortEntriesDesc(entries);
}

function buildQuietDay(): WatchLogEntry[] {
  const entries: WatchLogEntry[] = [
    {
      type: "scan_completed",
      timestamp: isoAgo(1 * HOUR),
      scan: buildScan({ startedAgoMs: HOUR + 30 * 1000, completedAgoMs: HOUR, checked: 47, flagged: 0 }),
    },
    {
      type: "scan_completed",
      timestamp: isoAgo(7 * HOUR),
      scan: buildScan({ startedAgoMs: 7 * HOUR + 30 * 1000, completedAgoMs: 7 * HOUR, checked: 47, flagged: 0 }),
    },
    {
      type: "scan_completed",
      timestamp: isoAgo(13 * HOUR),
      scan: buildScan({ startedAgoMs: 13 * HOUR + 30 * 1000, completedAgoMs: 13 * HOUR, checked: 47, flagged: 0 }),
    },
    {
      type: "scan_completed",
      timestamp: isoAgo(19 * HOUR),
      scan: buildScan({ startedAgoMs: 19 * HOUR + 30 * 1000, completedAgoMs: 19 * HOUR, checked: 47, flagged: 0 }),
    },
  ];
  return sortEntriesDesc(entries);
}

function buildEventful(): WatchLogEntry[] {
  const base = buildActiveMorning();
  const extras: WatchLogEntry[] = [
    {
      type: "signal_new",
      timestamp: isoAgo(5 * HOUR),
      signal: buildSignal({
        gapId: "debt:high_apr",
        domain: "debt",
        severity: "urgent",
        state: "new",
        annualValue: 2140,
        firstDetectedAgoMs: 5 * HOUR,
        lastSeenAgoMs: 5 * HOUR,
        payload: { accountCount: 2 },
      }),
    },
    {
      type: "signal_new",
      timestamp: isoAgo(6 * HOUR),
      signal: buildSignal({
        gapId: "benefits:Commuter",
        domain: "benefits",
        severity: "advisory",
        state: "new",
        annualValue: 315,
        firstDetectedAgoMs: 6 * HOUR,
        lastSeenAgoMs: 6 * HOUR,
        payload: { label: "Commuter benefits" },
      }),
    },
    {
      type: "signal_widened",
      timestamp: isoAgo(8 * HOUR),
      signal: buildSignal({
        gapId: "hysa:default",
        domain: "hysa",
        severity: "flagged",
        state: "active",
        annualValue: 540,
        firstDetectedAgoMs: 2 * DAY,
        lastSeenAgoMs: 8 * HOUR,
        payload: { gapBps: 470 },
      }),
      deltaAnnualValue: 70,
    },
    {
      type: "signal_resolved",
      timestamp: isoAgo(12 * HOUR),
      signal: buildSignal({
        gapId: "tax_advantaged:ira:2026",
        domain: "tax_advantaged",
        severity: "flagged",
        state: "resolved",
        annualValue: 6500,
        firstDetectedAgoMs: 30 * DAY,
        lastSeenAgoMs: 12 * HOUR,
        resolvedAgoMs: 12 * HOUR,
        payload: { kind: "IRA" },
      }),
    },
  ];
  return sortEntriesDesc([...base, ...extras]);
}

function buildHistoricalBatch(): WatchLogEntry[] {
  const entries: WatchLogEntry[] = [
    {
      type: "scan_completed",
      timestamp: isoAgo(3 * DAY),
      scan: buildScan({ startedAgoMs: 3 * DAY + 30 * 1000, completedAgoMs: 3 * DAY, checked: 46, flagged: 1 }),
    },
    {
      type: "signal_new",
      timestamp: isoAgo(3 * DAY + 1 * HOUR),
      signal: buildSignal({
        gapId: "hysa:default",
        domain: "hysa",
        severity: "flagged",
        state: "new",
        annualValue: 470,
        firstDetectedAgoMs: 3 * DAY + 1 * HOUR,
        lastSeenAgoMs: 3 * DAY + 1 * HOUR,
        payload: { gapBps: 390 },
      }),
    },
    {
      type: "scan_completed",
      timestamp: isoAgo(4 * DAY),
      scan: buildScan({ startedAgoMs: 4 * DAY + 30 * 1000, completedAgoMs: 4 * DAY, checked: 46, flagged: 0 }),
    },
    {
      type: "signal_resolved",
      timestamp: isoAgo(5 * DAY),
      signal: buildSignal({
        gapId: "benefits:HSA",
        domain: "benefits",
        severity: "flagged",
        state: "resolved",
        annualValue: 1200,
        firstDetectedAgoMs: 20 * DAY,
        lastSeenAgoMs: 5 * DAY,
        resolvedAgoMs: 5 * DAY,
        payload: { label: "HSA contributions" },
      }),
    },
  ];
  return sortEntriesDesc(entries);
}

function buildInitialEntries(scenario: MockWatchLogScenario): WatchLogEntry[] {
  switch (scenario) {
    case "quiet_day":
      return buildQuietDay();
    case "eventful":
      return buildEventful();
    case "empty":
    case "loading":
      return [];
    case "active_morning":
    default:
      return buildActiveMorning();
  }
}

export function useMockWatchLog(
  scenario: MockWatchLogScenario = "active_morning",
): MockWatchLogResult {
  // Snapshot initial entries per hook instance. Recomputing on every render
  // would swap mock ids mid-frame, which React dislikes for list keys.
  const [entries, setEntries] = useState<WatchLogEntry[]>(() =>
    buildInitialEntries(scenario),
  );
  const [hasMore, setHasMore] = useState<boolean>(() =>
    scenario === "active_morning" || scenario === "eventful",
  );

  const data = useMemo<WatchLogResponse | null>(() => {
    if (scenario === "loading") return null;
    if (scenario === "empty") {
      return { entries: [], hasMore: false, nextCursor: null };
    }
    return { entries, hasMore, nextCursor: hasMore ? "mock_cursor_1" : null };
  }, [scenario, entries, hasMore]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setEntries(prev => sortEntriesDesc([...prev, ...buildHistoricalBatch()]));
    setHasMore(false);
  }, [hasMore]);

  return {
    data,
    isLoading: scenario === "loading",
    loadMore,
  };
}

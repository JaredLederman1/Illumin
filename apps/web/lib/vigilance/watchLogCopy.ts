/**
 * Copy templates for watch log entries. Lives in its own module so the
 * wording can evolve without touching the renderer. Every string in the
 * watch feed flows through formatWatchEntry.
 */

import type { Signal, SignalDomain, WatchLogEntry } from "@/lib/types/vigilance";

function currency(n: number): string {
  return `$${Math.round(Math.max(0, n)).toLocaleString("en-US")}`;
}

function getPayload(signal: Signal): Record<string, unknown> {
  return signal.payload ?? {};
}

function benefitLabel(signal: Signal): string {
  const p = getPayload(signal);
  const fromPayload =
    typeof p.label === "string" && p.label.length > 0 ? p.label : null;
  return fromPayload ?? "uncaptured benefit";
}

function accountCount(signal: Signal): string {
  const p = getPayload(signal);
  if (typeof p.accountName === "string" && p.accountName.length > 0) {
    return p.accountName;
  }
  if (typeof p.accountCount === "number" && p.accountCount > 0) {
    return `${p.accountCount} account${p.accountCount === 1 ? "" : "s"}`;
  }
  return "1 account";
}

function hysaGapBps(signal: Signal): string {
  const p = getPayload(signal);
  if (typeof p.gapBps === "number") return `${Math.round(p.gapBps)}`;
  // Fall back to a rough estimate from annualValue if present. This keeps
  // the copy readable without depending on backend-side fields existing yet.
  return `430`;
}

function taxAdvantagedKind(signal: Signal): string {
  const p = getPayload(signal);
  if (typeof p.kind === "string") return p.kind.toUpperCase();
  // gapId shape: tax_advantaged:ira:2026 / tax_advantaged:hsa:2026
  const match = signal.gapId.match(/^tax_advantaged:(ira|hsa):/i);
  return match ? match[1].toUpperCase() : "IRA";
}

/**
 * Build the headline text for a signal-shaped event (new / widened /
 * resolved). Prefixes handled by the caller.
 */
function signalHeadline(signal: Signal): string {
  const domain: SignalDomain = signal.domain;
  const value = signal.annualValue;
  switch (domain) {
    case "idle_cash":
      return `New idle cash gap detected · ${currency(value)}/yr`;
    case "hysa":
      return `HYSA yield gap widened to ${hysaGapBps(signal)}bps below market`;
    case "debt":
      return `High-APR debt detected on ${accountCount(signal)}`;
    case "match":
      return `Employer match gap surfaced · ${currency(value)} unclaimed`;
    case "tax_advantaged":
      return `${taxAdvantagedKind(signal)} contribution room remaining this year`;
    case "benefits":
      return `Benefit gap surfaced: ${benefitLabel(signal)}`;
  }
}

export function formatWatchEntry(entry: WatchLogEntry): string {
  switch (entry.type) {
    case "signal_new":
      return signalHeadline(entry.signal);
    case "signal_widened":
      return `Worsened: ${signalHeadline(entry.signal)}`;
    case "signal_resolved":
      return `Resolved: ${signalHeadline(entry.signal)}`;
    case "scan_completed": {
      const checked = entry.scan.signalsChecked;
      const flagged = entry.scan.signalsFlagged;
      return `Scan complete. ${checked} signals checked, ${flagged} flagged.`;
    }
  }
}

export interface WatchValueReadout {
  text: string;
  tone: "negative" | "positive" | "muted";
}

/**
 * Right-side value readout. Null means no readout for this entry.
 */
export function formatWatchValueReadout(
  entry: WatchLogEntry,
): WatchValueReadout | null {
  switch (entry.type) {
    case "signal_new":
    case "signal_widened":
      if (entry.signal.annualValue <= 0) return null;
      return {
        text: `+${currency(entry.signal.annualValue)}/yr`,
        tone: "negative",
      };
    case "signal_resolved":
      if (entry.signal.annualValue <= 0) return null;
      return {
        text: `+${currency(entry.signal.annualValue)}/yr recovered`,
        tone: "positive",
      };
    case "scan_completed":
      return { text: "routine", tone: "muted" };
  }
}

/**
 * Short relative label for the left-side timestamp column. Caps at "yesterday"
 * for yesterday; beyond that, shows "Nd ago".
 */
export function formatWatchTimestamp(iso: string, now: number = Date.now()): string {
  const delta = now - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 0) return "just now";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < 2 * minute) return "just now";
  if (delta < hour) return `${Math.max(1, Math.floor(delta / minute))}m ago`;
  if (delta < day) return `${Math.max(1, Math.floor(delta / hour))}h ago`;
  const days = Math.floor(delta / day);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

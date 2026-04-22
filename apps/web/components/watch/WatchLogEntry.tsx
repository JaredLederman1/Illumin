"use client";

import type { CSSProperties } from "react";
import type { WatchLogEntry as WatchLogEntryModel } from "@/lib/types/vigilance";
import {
  formatWatchEntry,
  formatWatchTimestamp,
  formatWatchValueReadout,
} from "@/lib/vigilance/watchLogCopy";

interface Props {
  entry: WatchLogEntryModel;
}

function dotColor(entry: WatchLogEntryModel): string {
  switch (entry.type) {
    case "signal_new": {
      const severity = entry.signal.severity;
      if (severity === "urgent") return "var(--color-negative)";
      if (severity === "flagged") return "var(--color-gold)";
      return "var(--color-text-muted)";
    }
    case "signal_widened":
      return "var(--color-negative)";
    case "signal_resolved":
      return "var(--color-positive)";
    case "scan_completed":
      return "var(--color-text-muted)";
  }
}

function readoutColor(tone: "negative" | "positive" | "muted"): string {
  switch (tone) {
    case "negative":
      return "var(--color-negative)";
    case "positive":
      return "var(--color-positive)";
    case "muted":
      return "var(--color-text-muted)";
  }
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  padding: "10px 0",
  borderBottom: "0.5px solid var(--color-border)",
};

const tsStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  color: "var(--color-text-muted)",
  width: 44,
  flex: "0 0 44px",
  whiteSpace: "nowrap",
};

const textStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--color-text)",
  lineHeight: 1.45,
  flex: "1 1 auto",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

const readoutStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  flex: "0 0 auto",
  whiteSpace: "nowrap",
};

export default function WatchLogEntryRow({ entry }: Props) {
  const text = formatWatchEntry(entry);
  const readout = formatWatchValueReadout(entry);
  const ts = formatWatchTimestamp(entry.timestamp);

  const dotStyle: CSSProperties = {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: dotColor(entry),
    flex: "0 0 auto",
    alignSelf: "center",
  };

  return (
    <div role="article" aria-label={text} style={rowStyle}>
      <span style={tsStyle}>{ts}</span>
      <span aria-hidden="true" style={dotStyle} />
      <span style={textStyle}>{text}</span>
      {readout && (
        <span style={{ ...readoutStyle, color: readoutColor(readout.tone) }}>
          {readout.text}
        </span>
      )}
    </div>
  );
}

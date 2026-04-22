"use client";

import type { CSSProperties } from "react";
import type { WatchLogResponse } from "@/lib/types/vigilance";
import WatchLogEntryRow from "@/components/watch/WatchLogEntry";

interface Props {
  data: WatchLogResponse | null;
  isLoading: boolean;
  onLoadMore?: () => void;
  meta?: string;
}

const wrapStyle: CSSProperties = {
  borderTop: "0.5px solid var(--color-border)",
  paddingTop: 16,
  paddingBottom: 16,
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  marginBottom: 8,
};

const headerLabelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-mid)",
  margin: 0,
};

const headerMetaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-text-muted)",
  margin: 0,
};

const emptyStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 120,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--color-text-mid)",
  textAlign: "center",
};

const skeletonRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderBottom: "0.5px solid var(--color-border)",
};

const skeletonBlockStyle = (width: number | string, height: number): CSSProperties => ({
  height,
  width,
  borderRadius: 2,
  backgroundColor: "var(--color-surface-2)",
  animation: "illumin-watch-log-pulse 1.6s ease-in-out infinite",
});

const loadMoreStyle: CSSProperties = {
  display: "block",
  marginTop: 12,
  width: "100%",
  padding: "8px 12px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-mid)",
  backgroundColor: "transparent",
  border: "0.5px solid var(--color-border-strong)",
  borderRadius: 2,
  cursor: "pointer",
};

function SkeletonRow() {
  return (
    <div aria-hidden="true" style={skeletonRowStyle}>
      <div style={skeletonBlockStyle(32, 8)} />
      <div style={skeletonBlockStyle(6, 6)} />
      <div style={{ ...skeletonBlockStyle("60%", 10), flex: "1 1 auto" }} />
      <div style={skeletonBlockStyle(56, 8)} />
    </div>
  );
}

export default function WatchLogFeed({
  data,
  isLoading,
  onLoadMore,
  meta = "last 24h",
}: Props) {
  const entries = data?.entries ?? [];
  const hasMore = data?.hasMore ?? false;

  return (
    <>
      <style>{`
        @keyframes illumin-watch-log-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
      `}</style>
      <section style={wrapStyle} aria-label="Watch log">
        <header style={headerRowStyle}>
          <p style={headerLabelStyle}>Watch log</p>
          <p style={headerMetaStyle}>{meta}</p>
        </header>
        <div role="feed" aria-busy={isLoading} aria-label="Vigilance events">
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : entries.length === 0 ? (
            <div role="status" style={emptyStyle}>
              Nothing to report. Scanning again soon.
            </div>
          ) : (
            entries.map((entry, idx) => (
              <WatchLogEntryRow key={`${entry.type}-${entry.timestamp}-${idx}`} entry={entry} />
            ))
          )}
        </div>
        {!isLoading && hasMore && onLoadMore && (
          <button type="button" onClick={onLoadMore} style={loadMoreStyle}>
            Load more
          </button>
        )}
      </section>
    </>
  );
}

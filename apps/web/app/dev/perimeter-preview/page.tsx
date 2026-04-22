// DEV PREVIEW ONLY — to be removed before launch.
"use client";

import type { CSSProperties } from "react";
import PerimeterSVG from "@/components/watch/PerimeterSVG";
import {
  useMockPerimeterData,
  type PerimeterScenario,
} from "@/lib/vigilance/mockPerimeterData";

const SCENARIOS: PerimeterScenario[] = [
  "realistic",
  "sparse",
  "saturated",
  "clean",
  "urgent",
];

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "48px 32px 96px",
  backgroundColor: "var(--color-bg)",
};

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  margin: "0 0 32px 0",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 32,
  alignItems: "start",
};

const cellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: 24,
  border: "0.5px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  backgroundColor: "var(--color-surface)",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--color-text-mid)",
  marginBottom: 16,
};

function ScenarioCell({ scenario }: { scenario: PerimeterScenario }) {
  const { cashAmount, signals } = useMockPerimeterData(scenario);
  return (
    <div style={cellStyle}>
      <p style={labelStyle}>{scenario}</p>
      <PerimeterSVG cashAmount={cashAmount} signals={signals} size={400} />
    </div>
  );
}

export default function PerimeterPreviewPage() {
  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Perimeter SVG · dev preview</h1>
      <div style={gridStyle}>
        {SCENARIOS.map(scenario => (
          <ScenarioCell key={scenario} scenario={scenario} />
        ))}
      </div>
    </div>
  );
}

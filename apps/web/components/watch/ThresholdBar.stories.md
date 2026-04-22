# ThresholdBar

The horizontal spectrum used to make vigilance legible. Every monitored
metric gets a bar that shows where the user sits, where Illumin would flag
them, and (where relevant) where the market benchmark is. The fill tint
communicates whether the current position is concerning (red) or safe
(green), and the two colored markers pin the exact values.

## Props

```ts
interface ThresholdBarProps {
  threshold: SignalThreshold;   // wire type from lib/types/vigilance
  compact?: boolean;            // 10px bar, 8.5px axis labels, tighter spacing
  onClick?: () => void;         // optional; flags the bar as interactive
  className?: string;
  impactCopy?: string;          // display-side override for the right-aligned readout
}

interface ThresholdBarListProps {
  thresholds: SignalThreshold[];
  compact?: boolean;
  onThresholdClick?: (t: SignalThreshold) => void;
  impactCopyFor?: (t: SignalThreshold) => string | undefined;
  className?: string;
}
```

`impactCopy` is not part of the `SignalThreshold` wire type — the type is
the API contract and does not carry display strings. Callers pass the copy
in via this prop. When omitted, the bar falls back to "out of bounds" (when
`inBreach`) or "within bounds".

## Anatomy

- **Top row** — metric label (12px, weight 500, primary) on the left,
  impact readout (DM Mono 11px) on the right. Readout color is negative
  when `inBreach`, muted otherwise.
- **Bar** — 14px tall (10px in compact). Track is surface-2; fill is
  negative-bg or positive-bg depending on `inBreach`, spanning from 0 to
  the current value's normalized position. Thin ticks at the threshold
  and (if present) benchmark positions. Two 2px colored markers overlay
  the bar: red at current, green at threshold. Markers extend 2px above
  and below the track.
- **Axis row** — DM Mono 9.5px (8.5px in compact), tertiary text.
  `yours X` left, `threshold X` centered, `benchmark X` right.

Vertical rhythm: 4px between label row and bar, 3px between bar and axis
labels, 10px between bars in a list. Compact tightens these to 3px / 2px /
8px respectively.

## Interactions

- Hovering the bar lightens the track to `surface-hover`. Cursor is a
  pointer only when `onClick` is provided.
- Hovering either marker reveals a small tooltip 12px above the marker,
  anchored left or right based on which half of the bar the marker sits
  in so it doesn't clip. Tooltip is `pointer-events: none` so cursor
  drift never creates flicker.
- Clicking fires `onClick`.

## Accessibility

- Root has `role="meter"` with `aria-valuenow`, `aria-valuemin`,
  `aria-valuemax`, and `aria-label={metricLabel}`.
- A visually-hidden span holds the full description and is wired via
  `aria-describedby`: "Cash yield. Current value 0.5%. threshold 3.5%.
  market 4.8%. In breach."
- Markers themselves are `aria-hidden` — screen readers get the full
  description on the root instead of marker-level detail.

## Scenarios

`useMockThresholds(scenario)` from `lib/vigilance/mockThresholds.ts`:

- `realistic` (default) — 4 bars: `cash_yield` (in breach), `subscription_load`
  (in breach via audit delta), `dining_category` (within bounds),
  `debt_utilization` (within bounds).
- `all_clean` — same 4 metrics, all within bounds.
- `all_breached` — same 4 metrics, all in breach.
- `single` — just `cash_yield` for focused previews.
- `empty` — fresh user, no thresholds.

`mockImpactCopy(gapId)` returns display strings for `cash_yield` and
`subscription_load`; other gaps fall through to the generic readout.

## Usage

### Single in-breach bar

```tsx
import ThresholdBar from "@/components/watch/ThresholdBar";
import {
  useMockThresholds,
  mockImpactCopy,
} from "@/lib/vigilance/mockThresholds";

export function Demo() {
  const { thresholds } = useMockThresholds("single");
  const t = thresholds[0];
  return <ThresholdBar threshold={t} impactCopy={mockImpactCopy(t.gapId)} />;
}
```

### Single within-bounds bar

```tsx
const { thresholds } = useMockThresholds("all_clean");
<ThresholdBar threshold={thresholds[0]} />
```

### Realistic list

```tsx
import ThresholdBarList from "@/components/watch/ThresholdBarList";
import {
  useMockThresholds,
  mockImpactCopy,
} from "@/lib/vigilance/mockThresholds";

export function Demo() {
  const { thresholds } = useMockThresholds("realistic");
  return (
    <ThresholdBarList
      thresholds={thresholds}
      impactCopyFor={t => mockImpactCopy(t.gapId)}
      onThresholdClick={t => {
        // Later prompt: open the threshold detail modal here.
        console.log("Clicked", t.gapId);
      }}
    />
  );
}
```

### Compact mode

```tsx
const { thresholds } = useMockThresholds("realistic");
<ThresholdBarList
  thresholds={thresholds}
  compact
  impactCopyFor={t => mockImpactCopy(t.gapId)}
/>
```

Same data, 10px bar, 8.5px axis labels, 8px between bars. Used on mobile
or in sidebar contexts where vertical room is scarce.

## Later wiring

`onThresholdClick` is the seam where a future prompt will mount the
threshold detail modal. The prop is optional so the component can ship
against mock data without a host to receive the click.

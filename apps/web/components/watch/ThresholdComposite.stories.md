# ThresholdComposite

The recommended production threshold visualization for Intensity 3. Gauge
at rest for instant glance, 14-day trajectory inline on hover for
historical context. The zones and delta copy are direction-aware, so
yield-style metrics (cash yield) and cost-style metrics (subscription
load, debt utilization) both read correctly.

## Props

```ts
interface ThresholdCompositeProps {
  threshold: SignalThreshold;
  onClick?: () => void;
  className?: string;
}

interface ThresholdCompositeListProps {
  thresholds: SignalThreshold[];
  onThresholdClick?: (t: SignalThreshold) => void;
  className?: string;
  columns?: number;   // omit for responsive auto-fit grid
}
```

## Direction awareness

Metrics in the `hysa` domain are treated as "higher is better" — the green
safe zone sits on the right of the gauge and the red breach zone sits on
the left. Every other domain is "lower is better" — green on the left,
red on the right. The needle always points at the current value's
position on the axis; only the zone colors flip.

Delta copy also inverts by direction:

| Direction          | Position                | Words              |
|--------------------|-------------------------|--------------------|
| higher is better   | current > threshold     | `X above threshold`|
| higher is better   | current < threshold     | `X below threshold`|
| lower is better    | current > threshold     | `X over threshold` |
| lower is better    | current < threshold     | `X under threshold`|

Tone is driven by `inBreach` first, falling back to the geometric
relationship. That means a metric like `subscription_load` that trips an
audit-delta breach while sitting numerically below its threshold reads as
"$133 under threshold" in negative tone — literal about position, but
colored to match the flag the server set.

## Anatomy

### Resting state

- Semi-circular gauge, 120x70, with safe / warning / breach arcs.
- Needle line from the center pivot to the current value position on
  the arc. Red halo glow behind the needle only when `inBreach`.
- Two text lines below the gauge:
  1. `Metric label · currentValueFormatted` (12px, weight 500, primary).
  2. `X below threshold` style readout (DM Mono 10px, tone-colored).

### Hover / focus state

Inline below the resting state, the trajectory reveals in 200ms ease-out
via max-height + opacity transitions. Collapses in 200ms on exit.

- `14d drift` label (DM Mono 9px, uppercase, 0.08em tracking, muted).
- Sparkline of 14 deterministic values seeded by `gapId`, 200 wide
  (scales to container) x 40 tall. Dotted horizontal line at the
  threshold value. When `inBreach`, the area between the sparkline and
  the threshold line on the breach side is filled in negative at 20%
  opacity.
- `was X · now Y` readout (DM Mono 10px, muted).

## Flicker prevention

- The whole composite is a single hover container. The trajectory is a
  child element inside the same event target, not a floating overlay,
  so moving the cursor from the gauge down to the trajectory never
  triggers a mouseleave on the outer.
- Collapsed composite height is natural-flow; the expand transition uses
  `max-height` on the trajectory subtree, which grows downward without
  moving the gauge.

## Touch behavior

When `matchMedia("(hover: none)")` matches, the trajectory is always
shown (no hover gate). Tap-to-expand is a later iteration.

## Scenarios

Use `useMockThresholds("realistic")` from
`lib/vigilance/mockThresholds.ts`. The 4 realistic thresholds cover the
expected combinations: yield (inverted direction, in breach), cost
(standard direction, audit-delta breach), cost within bounds, and cost
within bounds with a benchmark.

## Usage

### In-breach inverted metric (cash yield)

```tsx
import ThresholdComposite from "@/components/watch/ThresholdComposite";
import { useMockThresholds } from "@/lib/vigilance/mockThresholds";

export function Demo() {
  const { thresholds } = useMockThresholds("realistic");
  const cashYield = thresholds.find(t => t.gapId === "cash_yield")!;
  return <ThresholdComposite threshold={cashYield} />;
}
```

Renders with the red breach zone on the LEFT side of the gauge, needle
deep in red at the 0.5% mark, delta readout `3% below threshold` in
negative tone.

### In-breach cost metric (subscription load)

```tsx
const subs = thresholds.find(t => t.gapId === "subscription_load")!;
<ThresholdComposite threshold={subs} />
```

Gauge's red breach zone is on the RIGHT. Needle sits at the $247 mark,
below threshold, but the delta readout is negative-toned because
`inBreach` is set (audit-delta signal).

### Within-bounds metric (dining drift)

```tsx
const dining = thresholds.find(t => t.gapId === "dining_category")!;
<ThresholdComposite threshold={dining} />
```

Red breach zone on the RIGHT. Needle well to the left of threshold.
Delta readout `6% under threshold` in positive tone.

### Responsive grid of composites

```tsx
import ThresholdCompositeList from "@/components/watch/ThresholdCompositeList";

export function Demo() {
  const { thresholds } = useMockThresholds("realistic");
  return (
    <ThresholdCompositeList
      thresholds={thresholds}
      onThresholdClick={t => {
        // Later prompt: open the signal detail modal here.
        console.log("Clicked", t.gapId);
      }}
    />
  );
}
```

The list uses `repeat(auto-fit, minmax(220px, 1fr))` so composites reflow
at narrower widths. `align-items: start` keeps a hovered composite from
stretching its collapsed row siblings.

## Accessibility

- Root is `role="group"` with a full-sentence `aria-label` summarizing
  metric, current value, delta, breach state, and the hover cue.
- Composites are keyboard-focusable (`tabIndex={0}`). Focus alone
  reveals the trajectory exactly like hover. Blur hides it.
- When `onClick` is provided, Enter and Space fire it from the focused
  composite.
- The focus ring comes from the global `:focus-visible` rule in
  `app/globals.css` — a warm gold outline, never browser blue.
- The trajectory SVG has its own `role="img"` with a descriptive label.
  It is marked `aria-hidden` when collapsed so screen-reader focus
  doesn't land on an invisible subtree.

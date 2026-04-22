# WatchLogFeed

The reverse-chronological feed of vigilance events on the dashboard. What
the user sees first every morning: "scan complete, 47 signals checked",
"new idle cash gap detected", "HYSA yield widened". Proves the product
worked while they slept.

## Props

```ts
interface Props {
  data: WatchLogResponse | null
  isLoading: boolean
  onLoadMore?: () => void
  meta?: string        // defaults to "last 24h"
}
```

Null `data` + `isLoading=true` renders three skeleton rows. Null `data` +
`isLoading=false` is treated as empty.

## Anatomy

- Section wrapper with a thin 0.5px border-top
- Header row: "Watch log" (uppercase, 11px, letter-spacing 0.08em, mid
  text) on the left, meta string on the right (11px, muted)
- Feed list: one `WatchLogEntry` row per entry, separated by 0.5px lines
- Each row: timestamp column · colored dot · headline text · optional
  right-aligned value readout

All color tokens come from `globals.css` (`--color-positive`,
`--color-negative`, `--color-gold`, `--color-text`, `--color-text-mid`,
`--color-text-muted`). No hex literals.

## Entry variants

| Variant            | Dot color                 | Readout                              |
|--------------------|---------------------------|--------------------------------------|
| `signal_new`       | severity-driven           | `+$X/yr` in negative                 |
| `signal_widened`   | negative                  | `+$X/yr` in negative                 |
| `signal_resolved`  | positive                  | `+$X/yr recovered` in positive       |
| `scan_completed`   | muted                     | `routine` in muted                   |

`signal_new` dot color by severity:
- `urgent` → `--color-negative`
- `flagged` → `--color-gold`
- `advisory` → `--color-text-muted`

## Copy

All headline text flows through `formatWatchEntry` in
`lib/vigilance/watchLogCopy.ts`. Templates:

- `signal_new` (idle_cash): "New idle cash gap detected · $X/yr"
- `signal_new` (hysa): "HYSA yield gap widened to Nbps below market"
- `signal_new` (debt): "High-APR debt detected on <account>"
- `signal_new` (match): "Employer match gap surfaced · $X unclaimed"
- `signal_new` (tax_advantaged): "IRA contribution room remaining this year"
- `signal_new` (benefits): "Benefit gap surfaced: <label>"
- `signal_widened`: "Worsened: <headline>"
- `signal_resolved`: "Resolved: <headline>"
- `scan_completed`: "Scan complete. N signals checked, M flagged."

## Scenarios

`useMockWatchLog(scenario)` from `lib/vigilance/mockWatchLog.ts`:

- `active_morning` (default) — 7 entries. Scan 2h ago with 2 flagged, then
  the two new signals that caused the flags, routine scans at 7h and 13h,
  yesterday's widening, a resolved 401k match 2d ago. `hasMore: true`.
- `quiet_day` — 4 scan completions, no signals. `hasMore: false`.
- `eventful` — `active_morning` plus extra new/widened/resolved signals.
  `hasMore: true`.
- `empty` — empty list. Renders the "Nothing to report" placeholder.
- `loading` — `data` is null, `isLoading` true. Renders skeletons.

## Usage

### Dashboard integration

```tsx
import WatchLogFeed from '@/components/watch/WatchLogFeed'
import { useMockWatchLog } from '@/lib/vigilance/mockWatchLog'

const watchLog = useMockWatchLog('active_morning')

<WatchLogFeed
  data={watchLog.data}
  isLoading={watchLog.isLoading}
  onLoadMore={watchLog.loadMore}
/>
```

### Stress test

```tsx
const watchLog = useMockWatchLog('eventful')
<WatchLogFeed {...watchLog} />
```

### Loading skeleton

```tsx
const watchLog = useMockWatchLog('loading')
<WatchLogFeed data={null} isLoading={true} />
```

### Empty state

```tsx
<WatchLogFeed data={{ entries: [], hasMore: false, nextCursor: null }} isLoading={false} />
```

Renders the "Nothing to report. Scanning again soon." placeholder.

## Accessibility

- Section has `aria-label="Watch log"`
- List has `role="feed"` and `aria-busy={isLoading}`
- Each entry has `role="article"` with `aria-label` set to the formatted
  headline text
- Skeleton rows are `aria-hidden="true"`
- Load more is a real `<button>`, not a div

## Wire-up notes

Swap `useMockWatchLog` for a real data hook keyed to `/api/watch/log` when
that endpoint exists. The mock returns the exact `WatchLogResponse` shape
defined in `lib/types/vigilance.ts`, so no component changes are needed.

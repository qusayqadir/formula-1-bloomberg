# Frontend Rules

Vite + React + TS in `frontend/`. Tailwind v4, TanStack Query, ECharts, dither-kit.
Verify every change with `cd frontend && npm run typecheck` before calling it done.
When a change is visual, actually load http://localhost:3000 and look at it (both
themes) before calling it done — see "Verifying visually" below.

## Design language

Bloomberg-terminal density: strict-black rail, dark-first dual theme, hairline
strokes, small mono type. JetBrains Mono for all data/labels/controls
(10–11px), sans (SF Pro stack) only for titles and prose. Eyebrow labels use
the `.eyebrow` class. Numbers are always tabular-nums. Every widget's chrome
(card, header, tooltip, legend, table) should be indistinguishable in style
from the widgets already shipped — a new widget must look drawn from the same
system, not visibly "AI-generated." When in doubt, open an existing widget of
the same chart type and copy its structure rather than inventing one.

## Theme tokens — never hardcode colors

- CSS tokens live on `:root[data-theme=…]` in `styles/index.css`, exposed to
  Tailwind via `@theme inline`. Use `bg-surface`, `bg-raised`, `bg-inset`,
  `bg-rail`, `text-ink`, `text-sub`, `text-mut`, `border-stroke`,
  `border-stroke-strong`, `bg-accent`, `text-pos`/`text-neg`/`text-amber`,
  `text-blue` — never raw hex or `bg-white/...`. Overlay washes must be
  ink-based (`bg-ink/[0.05]`, `hover:bg-ink/10`) so they work in both modes.
- Radius/shadow are NOT exposed as Tailwind utilities — there's no `shadow-card`
  class. Consume them as raw CSS vars: `shadow-[var(--shadow-card)]`,
  `shadow-[var(--shadow-pop)]`, `shadow-[var(--control-inset)]`. Don't invent
  new shadow values; reuse these three.
- shadcn-style tokens (`popover`, `muted-foreground`, `foreground`, `input`,
  `ring`) DO NOT EXIST in this theme. Classes using them silently resolve to
  nothing. When adapting shadcn/dither-kit components, remap to app tokens
  (`bg-raised`, `text-sub`, `text-ink`).
- Charts can't read CSS vars (canvas): widgets call `useChartTheme()` from
  `components/charts/theme.ts` and build ECharts options from the returned
  bundle (`C`), keeping `C` in the useMemo deps — the bundle is memoized per
  mode (`BUNDLES.dark/light`), so destructuring it away and dropping it from
  deps will silently freeze the widget on whichever theme was active on mount.
  Chart colors are JS tokens in `lib/colors.ts` (`CHART_DARK` / `CHART_LIGHT`),
  validated per surface (CVD contrast) — never invent a new hex, extend
  `ChartTokens` and both instances if a new semantic color is genuinely needed.
- Team/driver identity colors come from `teamColor(team)` in `lib/colors.ts`:
  DB `primary_color` first (currently always null), else regex match against
  `TEAM_COLOR_PATTERNS` (order matters — specific names like "Racing Bulls"
  must precede "Red Bull"), else a stable cycle through `fallbackSeries`
  cached per-team-id. Never pick a chart color by index yourself — call
  `teamColor`/`seqColor` so identity stays consistent across widgets.
  `fallbackSeries` slot order is load-bearing (CVD-validated) — never reorder.

## Tooltips & popovers — one glass language everywhere

Every hover card and dropdown panel is frosted glass: translucent raised fill
(~75% alpha) + `backdrop-blur-sm` (4–6px) + light ink border (`border-ink/20`
/ `withAlpha(t.ink, 0.22)`) + soft `0 1px 2px` shadow + 6px radius. Content is
mono: 10px `text-sub` heading, 11px tabular rows with an 8px SQUARE swatch
(`rounded-[1px]`, never circles), muted label left, ink value right-aligned.

- ECharts widgets: spread `baseTooltip` from `useChartTheme()` and build the
  HTML with `C.tip(heading, rows)` / `C.tipRow(label, value, { swatch })` —
  never hand-roll `<b>…</b><br/>` markup. `baseTooltip` already sets
  `confine: true`; do not remove it (tooltips must never leave the screen).
  It also sets `backgroundColor: withAlpha(t.raised, 0.75)`, a 1px
  `withAlpha(t.ink, 0.22)` border, `[4,8]` padding, 11px mono text, and
  `extraCssText` for the 6px radius + blur — don't override these per-widget.
- dither-kit widgets: use its `<Tooltip>` (default variant is frosted-glass;
  it self-clamps inside the chart container).
- Dropdown panels: reuse `GLASS_PANEL` in `components/ui/controls.tsx`.
  Filter dropdowns are `GlassSelect` (single) and `MultiSelect` (multi) —
  never native `<select>` for anything visible; the OS-rendered popup can't
  match the glass styling. (`ui/native-select.tsx` and the plain `Select` in
  `controls.tsx` are legacy/unused for new UI — don't reach for them just
  because they exist in the file.)
- Readability beats transparency: keep enough fill+blur that text survives
  over bright marks. Never drop below ~70% alpha without blur.

## Charts

- ECharts widgets live in `features/dashboard/widgets/`, wrapped in
  `AnalyticsCard` (handles eyebrow/title/loading/error/empty/expand); the
  `EChart` wrapper handles resize/theming. dither-kit (`components/dither-kit/`)
  is preferred for standard stacked/grouped bar/area/radar/pie — it brings the
  pixel dither aesthetic and its own Tooltip/BlockLegend. Reach for raw
  ECharts only when the chart needs something dither-kit can't do: dual axes,
  custom series types, line/area with per-point markers, geo, scatter/hexbin,
  bump charts.
- Axes/legends/grids come from the `useChartTheme()` helpers — `categoryAxis(data, overrides?)`,
  `valueAxis(overrides?)`, `legendStyle`, `baseGrid` (`{left:8,right:16,top:10,bottom:4,containLabel:true}`).
  **Always call these helpers for both axes, even the "simple" one** — don't
  hand-roll an axis object with your own `axisLine`/`axisTick`/`splitLine`
  even if it looks like less code; that duplicates (and can drift from) what
  the helper already encodes. (A prior widget hand-rolled just the y-axis
  while calling `valueAxis()` for x — that's the wrong pattern, not a
  precedent to copy.)
- Marks stay thin: 2px lines, capped bars. Position axes render inverted with
  `P{value}` labels.
- Heatmap/matrix shading: fade fill with value (weak cells = translucent wash
  + ink text, strong cells = solid ramp + contrast-picked text via
  `isDarkFill`) and ease skewed distributions (sqrt) — never a wall of
  equally saturated pills.
- Comments describing a visual choice (e.g. "bloom off to keep the stack
  legible") must match what the code actually does — check `bloom`/`variant`
  props against the comment before finishing a widget; a stale comment is
  worse than none.

## Canonical widget skeleton

Every widget follows this shape. Copy it, don't reinvent the wiring:

```tsx
export function Widget(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();               // ECharts widgets only
  const query = useXyz(filters.year, ...); // TanStack Query hook from lib/queries.ts

  const built = useMemo(() => {
    // derive from query.data + filters + props.entities
    if (!data.length) return null;
    return { /* ECharts option, or dither-kit series data */ };
  }, [query.data, filters, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Section · Sub"
      title="..."
      subtitle={...}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !built}
      emptyText="..."
      expandable
      className={props.className}
      bodyClassName="p-2"        // "flex flex-col gap-1.5 p-3" for dither-kit widgets with a legend
    >
      {built && <EChart option={built} />}
    </AnalyticsCard>
  );
}
```

- `useMemo` must return `null` (not `[]`/`undefined`) when there's nothing to
  show — `empty=` wires directly off that null.
- Round-scoped widgets additionally fetch `useSeasonRounds(filters.year)` to
  resolve `round`/`roundName` for the subtitle, filtering `r.number != null`
  first.
- Read filters via `useFilters()` (`filters.year`, `.teamIds`, `.sessionType`,
  `focusRound(rounds, filters)`, `visibleDriverIds(entities, filters)` from
  `features/dashboard/selectors.ts`). Widgets never write filters.
- Adding a data source: add the DTO to `lib/types.ts` right next to a
  `/** GET /path — shape + bronze-gap caveat */` comment, then add the hook to
  `lib/queries.ts` as `useQuery({ queryKey: [...], queryFn: () => fetchJson<ResponseType>(path, params) })`.
  Row types nest `driver: DriverRef`, `team: TeamRef | null`.

## AnalyticsCard anatomy (don't rebuild this by hand)

Card chrome: `rounded-xl border border-stroke bg-surface shadow-[var(--shadow-card)] hover:border-stroke-strong`.
Header: a skewed accent tick (`h-2.5 w-[3px] -skew-x-12 bg-accent`) before the
`.eyebrow` label, middot-separated category text (`CHAMPIONSHIP · DRIVERS`),
bold sans title below, muted inline subtitle. Top-right holds small
`Segmented` toggle chips and the expand icon when `expandable`. Legend rows
(dither-kit `BlockLegend`, or ECharts `legendStyle`) sit under the chart as
small colored swatches with abbreviated codes, paginating if they overflow.

- `loading` → pulsing skeleton rects sized to the eventual chart bounds (no
  layout shift).
- `refreshing` (`isFetching && !isPending`) → dim body to `opacity-60` +
  pulsing amber dot; keep the last-good data on screen, never flash a
  skeleton over live data.
- `error` → centered "Couldn't load this dataset — {message}" + a `Retry`
  pill wired to `onRetry`.
- `empty` → centered muted text (default: "No data for the current filters.
  Widen the selection to see results.").
- All four states render inside the same card chrome so the grid never
  reflows, and each card's state is independent — one widget's error/loading
  must never bleed into a sibling card.

## Tables

Sticky mono header row in muted uppercase (`bg-surface`, `text-sub`), colored
square swatch + code + name per row, colored triangle glyphs (green up / red
down, via `text-pos`/`text-neg`) for signed deltas, right-aligned tabular
numeric columns, muted status text right-most. Wide tables scroll inside their
card (`bodyClassName="overflow-auto"`), header stays pinned.

## Layout & structure

- Dashboard is a 12-col grid (`md:col-span-2 xl:col-span-N`) of fixed-height
  cards (~380–420px).
- Sidebar nav is a FileTree in `components/shell/Sidebar.tsx`: top-level
  folders `terminal`, `chat`, `docs`, `support`; selection follows the router;
  new pages get a route + a FileTreeFile entry. Theme toggle (sun/moon) lives
  top-right of the sidebar's "F1 Terminal" header pill.
- Shared UI primitives (`AnalyticsCard`, `Segmented`, `Chip`, `GlassSelect`,
  `MultiSelect`) live in `components/ui/` — extend these before writing new
  one-off controls.
- Filter state is URL-synced via `useFilters()` in `state/filters`; widgets
  read filters, they don't own them.

## Verifying visually

Typecheck proves the code compiles, not that it looks right. For any widget
or styling change:

- Run the dev server and load the actual page (both `data-theme="dark"` and
  `data-theme="light"`), not just one.
- Compare the new widget's card/header/tooltip/legend against an existing
  widget of the same chart type side by side — spacing rhythm, font sizes,
  swatch shapes, and color usage should be indistinguishable.
- Trigger a tooltip hover and, if plausible, an error/loading state — confirm
  they render inside the same card chrome without shifting the grid.
- If using an automated screenshot tool, don't trust a single stale frame to
  judge theme-toggle correctness (canvas/DOM repaints can lag the capture) —
  re-check with a fresh capture or computed styles before concluding
  something is broken.

## Data caveats (bronze gaps the frontend works around)

- `is_classified` is NULL everywhere; `fastest_lap_time` outside 40s–900s is
  treated as missing; DNF cause detail only meaningful pre-2023. Don't build
  new widgets on these fields without the documented workarounds (CLAUDE.md).

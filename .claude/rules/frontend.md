# Frontend Rules

Vite + React + TS in `frontend/`. Tailwind v4, TanStack Query, ECharts, dither-kit.
Verify every change with `cd frontend && npm run typecheck` before calling it done.

## Design language

Bloomberg-terminal density: strict-black rail, dark-first dual theme, hairline
strokes, small mono type. JetBrains Mono for all data/labels/controls
(10–11px), sans (SF Pro stack) only for titles and prose. Eyebrow labels use
the `.eyebrow` class. Numbers are always tabular-nums.

## Theme tokens — never hardcode colors

- CSS tokens live on `:root[data-theme=…]` in `styles/index.css`, exposed to
  Tailwind via `@theme inline`. Use `bg-surface`, `bg-raised`, `text-ink`,
  `text-sub`, `text-mut`, `border-stroke`, `border-stroke-strong` — never raw
  hex or `bg-white/...`. Overlay washes must be ink-based (`bg-ink/[0.05]`,
  `hover:bg-ink/10`) so they work in both modes.
- shadcn-style tokens (`popover`, `muted-foreground`, `foreground`, `input`,
  `ring`) DO NOT EXIST in this theme. Classes using them silently resolve to
  nothing. When adapting shadcn/dither-kit components, remap to app tokens
  (`bg-raised`, `text-sub`, `text-ink`).
- Charts can't read CSS vars (canvas): widgets call `useChartTheme()` from
  `components/charts/theme.ts` and build ECharts options from the returned
  bundle (`C`), keeping `C` in the useMemo deps. Chart colors are JS tokens in
  `lib/colors.ts` (`CHART_DARK` / `CHART_LIGHT`), validated per surface.
- Team/driver identity colors are brand-anchored, the same hex in both modes
  (curated map in `lib/colors.ts`; DB `primary_color` wins once populated).

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
- dither-kit widgets: use its `<Tooltip>` (default variant is frosted-glass;
  it self-clamps inside the chart container).
- Dropdown panels: reuse `GLASS_PANEL` in `components/ui/controls.tsx`.
  Filter dropdowns are `GlassSelect` (single) and `MultiSelect` (multi) —
  never native `<select>` for anything visible; the OS-rendered popup can't
  match the glass styling. (`ui/native-select.tsx` is legacy/unused.)
- Readability beats transparency: keep enough fill+blur that text survives
  over bright marks. Never drop below ~70% alpha without blur.

## Charts

- ECharts widgets live in `features/dashboard/widgets/`, wrapped in
  `AnalyticsCard` (handles eyebrow/title/loading/error/empty/expand); the
  `EChart` wrapper handles resize/theming. dither-kit (`components/dither-kit/`)
  is preferred for simple bar/area/radar/pie charts — it brings the pixel
  dither aesthetic and its own Tooltip.
- Axes/legends/grids come from the `useChartTheme()` helpers (`categoryAxis`,
  `valueAxis`, `legendStyle`, `baseGrid`) — stay recessive, don't restyle.
- Marks stay thin: 2px lines, capped bars. Position axes render inverted with
  `P{value}` labels.
- Heatmap/matrix shading: fade fill with value (weak cells = translucent wash
  + ink text, strong cells = solid ramp + contrast-picked text via
  `isDarkFill`) and ease skewed distributions (sqrt) — never a wall of
  equally saturated pills.

## Layout & structure

- Dashboard is a 12-col grid (`md:col-span-2 xl:col-span-N`) of fixed-height
  cards (~380–420px). Wide tables scroll inside their card
  (`bodyClassName="overflow-auto"`), with sticky mono headers on `bg-surface`.
- Sidebar nav is a FileTree in `components/shell/Sidebar.tsx`: top-level
  folders `terminal`, `chat`, `docs`, `support`; selection follows the router;
  new pages get a route + a FileTreeFile entry.
- Shared UI primitives (`AnalyticsCard`, `Segmented`, `Chip`, `GlassSelect`,
  `MultiSelect`) live in `components/ui/` — extend these before writing new
  one-off controls.
- Filter state is URL-synced via `useFilters()` in `state/filters`; widgets
  read filters, they don't own them.

## Data caveats (bronze gaps the frontend works around)

- `is_classified` is NULL everywhere; `fastest_lap_time` outside 40s–900s is
  treated as missing; DNF cause detail only meaningful pre-2023. Don't build
  new widgets on these fields without the documented workarounds (CLAUDE.md).

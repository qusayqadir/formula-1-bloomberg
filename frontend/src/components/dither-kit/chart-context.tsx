import type { ScaleLinear } from "d3-scale"
import { createContext, use, useCallback, useMemo, useState } from "react"
import type { CommonChart } from "./common-context"
import type { BloomInput } from "./dither-paint"
import type { DitherColor, Seed } from "./palette"
import { seedOfColor } from "./palette"
import {
  buildBandScale,
  buildValueScale,
  buildXScale,
  computeBands,
  indexAtBand,
  nearestIndex,
  type StackType,
} from "./scales"
import type { Dimensions } from "./use-chart-dimensions"

/** Which chart root a part is composed under — drives the boundary guards. */
export type ChartType = "area" | "bar" | "line" | "pie" | "radar"

/** Bar-chart axis layout: "vertical" (default) grows bars upward with
 * categories on x; "horizontal" grows bars rightward with categories on y
 * (value ticks on x, category labels on y) — used for wide category lists
 * or when the value reads more naturally left-to-right (e.g. laps). Only
 * bar charts interpret this; area/line/pie/radar roots ignore it. */
export type ChartOrientation = "vertical" | "horizontal"

export type ChartConfig = Record<string, { label?: string; color: DitherColor }>

export type Margins = {
  top: number
  right: number
  bottom: number
  left: number
}

type Row = Record<string, unknown>

export type AreaVariant = "gradient" | "dotted" | "hatched" | "solid"
export type StrokeVariant = "solid" | "dashed"
export type SeriesKind = "area" | "line" | "bar"

/** What each series part (<Area />, <Line />, <Bar />) registers so the canvas
 * knows which series to paint and how. */
export type SeriesSpec = {
  dataKey: string
  kind: SeriesKind
  variant: AreaVariant
  strokeVariant: StrokeVariant
  /** Bar-only, horizontal orientation: fade the dither across the bar's own
   * screen height instead of along the value axis — "up"/"down" read like
   * DitherGradient's directions (solid at one edge, dissolving toward the
   * other). "value" (default) keeps the kit's usual fade-toward-the-value-
   * line look — every other bar chart is unaffected unless it opts in. */
  fadeDirection?: "value" | "up" | "down"
}

export type ChartContextValue = {
  chartType: ChartType // which root this part is under
  orientation: ChartOrientation
  config: ChartConfig
  configKeys: string[] // series order — drives stacking + legend
  data: Row[]
  dataLength: number
  stackType: StackType

  margins: Margins
  plot: { width: number; height: number } // inner drawing area
  ready: boolean // true once measured (width > 0)

  xCenter: (index: number) => number // category centre px within the plot
  bandwidth: number // category slot width (0 for point/area scales)
  indexAtX: (px: number) => number // nearest category for a pointer x
  // Bar geometry in plot px — one source of truth for the canvas + click rects.
  barSlot: (
    index: number,
    seriesIndex: number,
    seriesCount: number
  ) => { x: number; width: number }
  y: ScaleLinear<number, number> // value → px within the plot
  bands: Record<string, [number, number][]> // per-series [y0, y1] per row
  max: number
  min: number // most-negative value (0 when nothing dips below the baseline)

  // Interaction state, shared by every part.
  selectedDataKey: string | null
  selectDataKey: (key: string | null) => void
  /** Legend-hover spotlight — dims every series but this one while set. */
  focusDataKey: string | null
  setFocusDataKey: (key: string | null) => void
  hoverIndex: number | null
  setHoverIndex: (index: number | null) => void
  markerIndex: number | null // controlled crosshair override (e.g. committed point)
  cursorX: number
  setCursorX: (px: number) => void
  isMouseInChart: boolean
  setMouseInChart: (over: boolean) => void
  hovered: boolean // parent-driven hover (e.g. the whole card) — lifts the fill
  bloom: BloomInput // glow on the dither canvas
  bloomOnHover: boolean // only bloom while hovered

  // Series register themselves so the canvas knows what (and how) to paint.
  seriesSpecs: Record<string, SeriesSpec>
  registerSeries: (spec: SeriesSpec) => void
  unregisterSeries: (dataKey: string) => void

  // Entrance animation (prop-driven). `revision` bumps when the data changes or
  // the replay token advances, so the canvas can re-play its entrance.
  animate: boolean
  animationDuration: number
  revision: number
  entranceDone: boolean // true once the entrance has played — gates SVG markers
  markEntranceDone: () => void // the canvas calls this when its reveal completes

  // Helpers.
  seedOf: (key: string) => Seed
  common: CommonChart // shared surface for <Legend> / <Tooltip>
}

const ChartContext = createContext<ChartContextValue | null>(null)

const ROOT_OF: Record<ChartType, string> = {
  area: "<AreaChart />",
  bar: "<BarChart />",
  line: "<LineChart />",
  pie: "<PieChart />",
  radar: "<RadarChart />",
}

/** Generic accessor for internal layers (canvas/overlay) that work for any root. */
export function useChart() {
  const ctx = use(ChartContext)
  if (!ctx) {
    throw new Error(
      "Chart parts must be used within a chart root (e.g. <AreaChart />)."
    )
  }
  return ctx
}

/**
 * Boundary guard for a composable part. Throws a precise error when used outside
 * a root, or inside the wrong chart type — e.g. `<Bar />` placed in an area
 * chart. `kind` omitted means the part works under any root (grid, axes, …).
 */
export function useChartPart(
  part: string,
  kind?: ChartType | ChartType[]
): ChartContextValue {
  const ctx = use(ChartContext)
  if (!ctx) {
    const where = kind
      ? ROOT_OF[Array.isArray(kind) ? kind[0] : kind]
      : "a chart root"
    throw new Error(`<${part} /> must be used within ${where}.`)
  }
  if (kind) {
    const allowed = Array.isArray(kind) ? kind : [kind]
    if (!allowed.includes(ctx.chartType)) {
      throw new Error(
        `<${part} /> is not valid inside ${ROOT_OF[ctx.chartType]} — it belongs in ${allowed
          .map((k) => ROOT_OF[k])
          .join(" or ")}.`
      )
    }
  }
  return ctx
}

export { ChartContext }

/** A counter that advances whenever `data` changes identity or `token` advances
 * — drives entrance replays without remounting. Uses the adjust-state-during-
 * render pattern (https://react.dev/reference/react/useState) instead of a ref:
 * the revision is derived purely from render inputs, so it stays consistent
 * across the memoized values below rather than lagging a render behind. */
export function useRevision(data: unknown, token: number) {
  const [prev, setPrev] = useState({ data, token, revision: 0 })
  if (prev.data !== data || prev.token !== token) {
    const next = { data, token, revision: prev.revision + 1 }
    setPrev(next)
    return next.revision
  }
  return prev.revision
}

/**
 * Builds the shared context value: resolves the plot rect from the measured
 * size minus margins, computes the x/y scales and the per-series stack bands,
 * and owns the selection + hover state every part reads.
 */
export function useChartController({
  chartType,
  data,
  config,
  stackType,
  dimensions,
  margins,
  orientation = "vertical",
  barWidth = 1,
  animate = true,
  animationDuration = 900,
  replayToken = 0,
  markerIndex = null,
  hovered = false,
  bloom = "off",
  bloomOnHover = false,
  defaultSelectedDataKey = null,
  onSelectionChange,
}: {
  chartType: ChartType
  data: Row[]
  config: ChartConfig
  stackType: StackType
  dimensions: Dimensions
  margins: Margins
  orientation?: ChartOrientation
  /** Bar-only: scales the drawn bar width, 0–1, without affecting category
   * spacing — 1 (default) is the kit's normal width. */
  barWidth?: number
  animate?: boolean
  animationDuration?: number
  replayToken?: number
  markerIndex?: number | null
  hovered?: boolean
  bloom?: BloomInput
  bloomOnHover?: boolean
  defaultSelectedDataKey?: string | null
  onSelectionChange?: (key: string | null) => void
}): ChartContextValue {
  // This object becomes the ChartContext value, so its identity — and the
  // identity of every function/object it carries — must stay stable across
  // renders that don't change the underlying inputs. Otherwise every consumer
  // (axes, legend, tooltip, dots) re-renders on every parent render. So the
  // expensive derivations, the exposed callbacks, and the returned value are
  // memoized below; only cheap scalars (bandwidth, ready, plot sizes) are left
  // bare, since they're just recomputed reads, not identities anyone depends on.

  // Memoized: configKeys is the dep that drives `bands`, `common` and the
  // canvas `targets` memo — a fresh array each render would bust all of them.
  const configKeys = useMemo(() => Object.keys(config), [config])
  const revision = useRevision(data, replayToken)

  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(
    defaultSelectedDataKey
  )
  const [focusDataKey, setFocusDataKey] = useState<string | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [cursorX, setCursorX] = useState(0)
  const [isMouseInChart, setMouseInChart] = useState(false)
  const [seriesSpecs, setSeriesSpecs] = useState<Record<string, SeriesSpec>>({})

  // useCallback because the series effects in area.tsx/bar.tsx list these as
  // deps — without stable identities the unregister/register effect re-fires
  // every render and its setState pair loops ("Maximum update depth exceeded").
  const registerSeries = useCallback((spec: SeriesSpec) => {
    setSeriesSpecs((prev) => {
      const cur = prev[spec.dataKey]
      return cur &&
        cur.kind === spec.kind &&
        cur.variant === spec.variant &&
        cur.strokeVariant === spec.strokeVariant &&
        cur.fadeDirection === spec.fadeDirection
        ? prev
        : { ...prev, [spec.dataKey]: spec }
    })
  }, [])
  const unregisterSeries = useCallback((dataKey: string) => {
    setSeriesSpecs((prev) => {
      if (!(dataKey in prev)) return prev
      const next = { ...prev }
      delete next[dataKey]
      return next
    })
  }, [])

  // Stable so the memoized value keeps its identity; only re-created when the
  // caller's selection handler does.
  const selectDataKey = useCallback(
    (key: string | null) => {
      setSelectedDataKey(key)
      onSelectionChange?.(key)
    },
    [onSelectionChange]
  )

  // The root spreads `{ ...DEFAULT_MARGINS, ...marginsProp }` fresh every
  // render, so `margins` never keeps its identity. Pin one off the four numbers
  // so it doesn't, on its own, invalidate the value or the plot geometry.
  const { top: mTop, right: mRight, bottom: mBottom, left: mLeft } = margins
  const stableMargins = useMemo(
    () => ({ top: mTop, right: mRight, bottom: mBottom, left: mLeft }),
    [mTop, mRight, mBottom, mLeft]
  )

  const plotWidth = Math.max(0, dimensions.width - mLeft - mRight)
  const plotHeight = Math.max(0, dimensions.height - mTop - mBottom)
  const ready = plotWidth > 0 && plotHeight > 0

  // The entrance gate flips true when the canvas reveal completes (via
  // `markEntranceDone`) so DOM markers fade in with the fill, and re-arms on
  // each replay. Adjust-state-during-render instead of an effect, so the reset
  // lands in the same render as the revision bump.
  const [entrance, setEntrance] = useState({ revision, done: !animate })
  if (entrance.revision !== revision) {
    setEntrance({ revision, done: !animate })
  }
  const entranceDone = entrance.revision === revision ? entrance.done : !animate
  // Stable across renders at the same revision; the canvas holds this in a ref.
  const markEntranceDone = useCallback(
    () => setEntrance({ revision, done: true }),
    [revision]
  )

  // Memoized: the priciest derivation in the render path — it walks every
  // row × series to build the stack bands. Hover/cursor state changes must not
  // recompute it, only a real data/series/stack change.
  const { bands, max, min } = useMemo(
    () => computeBands(data, configKeys, stackType),
    [data, configKeys, stackType]
  )

  const isBar = chartType === "bar"
  const horizontal = orientation === "horizontal"
  // "Category" extent is whichever screen axis carries the category band
  // (x normally, y when horizontal); "value" extent is the other one. Every
  // vertical-orientation consumer sees catExtent===plotWidth /
  // valExtent===plotHeight exactly as before — orientation only changes
  // anything when a bar chart opts into "horizontal".
  const catExtent = horizontal ? plotHeight : plotWidth
  const valExtent = horizontal ? plotWidth : plotHeight

  // The d3 scale factories are memoized so `y` keeps a stable identity: the
  // canvas `targets` memo (cartesian-canvas / bar-canvas) deps on ctx.y, and
  // xCenter/indexAtX/barSlot below close over these.
  const xPoint = useMemo(
    () => buildXScale(data.length, catExtent),
    [data.length, catExtent]
  )
  const xBand = useMemo(
    () => buildBandScale(data.length, catExtent),
    [data.length, catExtent]
  )
  const bandwidth = isBar ? xBand.bandwidth() : 0
  const xCenter = useCallback(
    (i: number) =>
      isBar ? (xBand(i) ?? 0) + xBand.bandwidth() / 2 : (xPoint(i) ?? 0),
    [isBar, xBand, xPoint]
  )
  const indexAtX = useCallback(
    (px: number) =>
      isBar
        ? indexAtBand(px, data.length, catExtent)
        : nearestIndex(px, data.length, catExtent),
    [isBar, data.length, catExtent]
  )
  const stacked = stackType === "stacked" || stackType === "percent"
  const barSlot = useCallback(
    (i: number, si: number, n: number) => {
      const center = xCenter(i)
      if (stacked) {
        const w = bandwidth * 0.9 * barWidth
        return { x: center - w / 2, width: w }
      }
      const slot = bandwidth / Math.max(n, 1)
      const w = slot * 0.84 * barWidth
      return {
        x: center - bandwidth / 2 + si * slot + slot * 0.08 + (slot * 0.84 - w) / 2,
        width: w,
      }
    },
    [xCenter, stacked, bandwidth, barWidth]
  )
  // `invert`: vertical bars grow upward (0 at the plot's bottom edge), so the
  // range is flipped; horizontal bars grow rightward (0 at the plot's left
  // edge), so it isn't.
  const y = useMemo(
    () => buildValueScale(min, max, valExtent, !horizontal),
    [min, max, valExtent, horizontal]
  )

  // Stable so `common` and the value stay stable; re-created only on config.
  const seedOf = useCallback(
    (key: string) => seedOfColor(config[key]?.color ?? "grey"),
    [config]
  )

  // Memoized: this is the value handed to CommonChartContext (Legend/Tooltip),
  // so it needs its own stable identity independent of the parent value.
  const common: CommonChart = useMemo(() => ({
    names: configKeys,
    labelOf: (n) => config[n]?.label ?? n,
    seedOf,
    selectedDataKey,
    selectDataKey,
    focusDataKey,
    setFocusDataKey,
    hoverIndex,
    ready,
    tooltipLeft: Math.max(48, Math.min(plotWidth + mLeft - 48, cursorX)),
    // Follow the highest hovered node so the card rides the data path, but
    // keep enough headroom that the upward-lifted card never clips the top.
    // Horizontal bars: `y(...)` maps along the value axis (now horizontal),
    // not a row position, so ride the hovered category's band center instead.
    tooltipTop: (() => {
      const floor = mTop + 44
      if (hoverIndex == null) return floor
      if (horizontal) return Math.max(floor, mTop + xCenter(hoverIndex))
      let minY = Number.POSITIVE_INFINITY
      for (const key of configKeys) {
        const b = bands[key]?.[hoverIndex]
        if (b) minY = Math.min(minY, y(b[1]))
      }
      if (!Number.isFinite(minY)) return floor
      return Math.max(floor, mTop + minY)
    })(),
    heading: (i, labelKey) =>
      labelKey ? String(data[i]?.[labelKey] ?? "") : null,
    itemsAt: (i) =>
      configKeys.map((name) => {
        const raw = data[i]?.[name]
        return {
          name,
          label: config[name]?.label ?? name,
          value: typeof raw === "number" ? raw : 0,
          seed: seedOf(name),
          dimmed: (() => {
            const emphasis = selectedDataKey ?? focusDataKey
            return emphasis !== null && emphasis !== name
          })(),
        }
      }),
  }), [
    configKeys,
    config,
    seedOf,
    selectedDataKey,
    selectDataKey,
    focusDataKey,
    setFocusDataKey,
    hoverIndex,
    ready,
    plotWidth,
    mLeft,
    mTop,
    cursorX,
    bands,
    y,
    data,
    horizontal,
    xCenter,
  ])

  // Memoized: this is the ChartContext value. A fresh object here would
  // re-render every consumer on every parent render — the whole reason the
  // pieces above are stabilized. Rebuilds only when a listed input changes
  // (which is exactly when a consumer needs the update). The useState setters
  // are listed but never change identity, so they never trigger a rebuild.
  return useMemo<ChartContextValue>(
    () => ({
      chartType,
      orientation,
      config,
      configKeys,
      data,
      dataLength: data.length,
      stackType,
      margins: stableMargins,
      plot: { width: plotWidth, height: plotHeight },
      ready,
      xCenter,
      bandwidth,
      indexAtX,
      barSlot,
      y,
      bands,
      max,
      min,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      setHoverIndex,
      markerIndex,
      cursorX,
      setCursorX,
      isMouseInChart,
      setMouseInChart,
      hovered,
      bloom,
      bloomOnHover,
      seriesSpecs,
      registerSeries,
      unregisterSeries,
      animate,
      animationDuration,
      revision,
      entranceDone,
      markEntranceDone,
      seedOf,
      common,
    }),
    [
      chartType,
      orientation,
      config,
      configKeys,
      data,
      stackType,
      stableMargins,
      plotWidth,
      plotHeight,
      ready,
      xCenter,
      bandwidth,
      indexAtX,
      barSlot,
      y,
      bands,
      max,
      min,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      setHoverIndex,
      markerIndex,
      cursorX,
      setCursorX,
      isMouseInChart,
      setMouseInChart,
      hovered,
      bloom,
      bloomOnHover,
      seriesSpecs,
      registerSeries,
      unregisterSeries,
      animate,
      animationDuration,
      revision,
      entranceDone,
      markEntranceDone,
      seedOf,
      common,
    ]
  )
}

import { useEffect, useMemo, useRef } from "react"
import { useChart } from "./chart-context"
import {
  backingSize,
  bloomLayerStyle,
  clamp01,
  easeOutCubic,
  paintColumn,
  paintRow,
  prefersReducedMotion,
} from "./dither-paint"

type Bars = { top: number[]; base: number[] } // per data index, in backing rows

// Fraction of the timeline spent staggering bar starts — the rest is each bar's
// own grow window, so the rise sweeps across the chart as a wave.
const STAGGER = 0.55

// Floor for the chart-height "up"/"down" fade (see `fadeDirection` below) —
// the dissolving edge of the chart stays legible instead of fading to
// nothing, mirroring OFF_TIER's off-cell floor in dither-paint.ts.
const MIN_BAND_DIM = 0.35

/**
 * Dither canvas for bar charts. Each category owns a band; grouped series split
 * it into side-by-side bars, stacked series share its full width and pile in y.
 * Every bar is filled with the shared {@link paintColumn} ordered dither. Bars
 * grow up from their base in a staggered left-to-right wave (eased), and the
 * hovered category lifts while the rest dim.
 */
export function BarCanvas() {
  const ctx = useChart()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bloomRef = useRef<HTMLCanvasElement>(null)

  const { width, height } = ctx.plot
  const { cols, rows } = backingSize(width, height)
  const { ready, configKeys, bands, y, orientation } = ctx
  const horizontal = orientation === "horizontal"

  // Memoized: per-series bar tops/bases (backing px along the value axis —
  // rows for vertical bars, cols for horizontal ones) over the data indices.
  // The canvas re-renders on every hover/cursor tick, so pin this map to the
  // exact ctx fields it reads plus the backing geometry — a bar hover must not
  // rebuild every band's geometry.
  const targets = useMemo(() => {
    const out: Record<string, Bars> = {}
    if (!ready) return out
    const extent = (horizontal ? width : height) || 1
    const backingLen = horizontal ? cols : rows
    for (const key of configKeys) {
      const band = bands[key]
      if (!band) continue
      out[key] = {
        top: band.map((b) => (y(b[1]) / extent) * (backingLen - 1)),
        base: band.map((b) => (y(b[0]) / extent) * (backingLen - 1)),
      }
    }
    return out
  }, [ready, configKeys, bands, y, width, height, rows, cols, horizontal])

  // The RAF loop reads these through refs so it always sees the latest values;
  // refs are written in an effect (never during render) — mutating a ref
  // mid-render tears under Strict Mode / concurrent rendering.
  const state = useRef(ctx)
  const targetsRef = useRef(targets)
  useEffect(() => {
    state.current = ctx
    targetsRef.current = targets
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const c = canvas?.getContext("2d")
    if (!(canvas && c) || cols <= 0 || rows <= 0) return
    canvas.width = cols
    canvas.height = rows

    const bloomCanvas = bloomRef.current
    const bloomCtx = bloomCanvas?.getContext("2d") ?? null
    if (bloomCanvas) {
      bloomCanvas.width = cols
      bloomCanvas.height = rows
    }

    const reduce = prefersReducedMotion()
    const animate = state.current.animate && !reduce
    const duration = state.current.animationDuration
    const fx = cols / Math.max(width, 1)
    const fy = rows / Math.max(height, 1)

    // Eased grow factor for bar `i` at global progress `prog`.
    const barProgress = (i: number, len: number, prog: number) => {
      if (!animate) return 1
      const start = len > 1 ? (i / (len - 1)) * STAGGER : 0
      return easeOutCubic(clamp01((prog - start) / (1 - STAGGER)))
    }

    const paint = (prog: number) => {
      const s = state.current
      const horiz = s.orientation === "horizontal"
      c.clearRect(0, 0, cols, rows)
      const stacked = s.stackType === "stacked" || s.stackType === "percent"
      const keys = s.configKeys
      const backingLen = horiz ? cols : rows
      // Whole-row value extent for a stacked+horizontal bar's continuous fade
      // (see `fadeExtent` on paintRow): the first series' base is always the
      // row's zero baseline, and the last series' top is the cumulative total
      // — true even for a row whose real segments end early, since d3's stack
      // pads the remaining keys to zero-length right at that same total.
      const firstRowTargets = horiz && stacked && keys.length ? targetsRef.current[keys[0]] : undefined
      const lastRowTargets =
        horiz && stacked && keys.length ? targetsRef.current[keys[keys.length - 1]] : undefined
      keys.forEach((key, si) => {
        const t = targetsRef.current[key]
        if (!t) return
        const seed = s.seedOf(key)
        const variant = s.seriesSpecs[key]?.variant ?? "gradient"
        const fadeDirection = s.seriesSpecs[key]?.fadeDirection ?? "value"
        const emphasis = s.selectedDataKey ?? s.focusDataKey
        const selDim = emphasis !== null && emphasis !== key ? 0.3 : 1
        for (let i = 0; i < s.dataLength; i++) {
          const bp = barProgress(i, s.dataLength, prog)
          const base = t.base[i] ?? backingLen - 1
          const grown = base + ((t.top[i] ?? base) - base) * bp
          // Bars grow from the zero baseline toward the value. Vertical:
          // positive values sit above the baseline (smaller row), so the
          // lower-numbered edge is the value line and paintColumn wants it
          // first. Horizontal: positive values sit right of the baseline
          // (larger col), so the lower-numbered edge is the baseline and
          // paintRow wants IT first — min/max ordering works for both since
          // each paint fn already assigns the roles for its own axis.
          const lo = Math.min(grown, base)
          const hi = Math.max(grown, base)
          const active = s.hoverIndex === i
          const hoverDim =
            s.hoverIndex != null && !active && s.isMouseInChart ? 0.5 : 1
          // Cross-axis (category) band in plot px — x/width name the field,
          // but for horizontal bars this range runs down the y axis.
          const slot = s.barSlot(i, si, keys.length)
          const opts = {
            variant,
            intensity: intensity + (active ? 0.4 : 0),
            dim: selDim * hoverDim,
            stacked,
          }
          if (horiz) {
            const r0 = Math.round(slot.x * fy)
            const r1 = Math.round((slot.x + slot.width) * fy)
            if (fadeDirection === "value") {
              const fadeExtent: [number, number] | undefined =
                firstRowTargets && lastRowTargets
                  ? [firstRowTargets.base[i] ?? lo, lastRowTargets.top[i] ?? hi]
                  : undefined
              for (let row = r0; row < r1; row++) {
                paintRow(c, row, lo, hi, seed, { ...opts, fadeExtent })
              }
            } else {
              // Screen "up"/"down" fade across the WHOLE chart height (every
              // row's category band, not just this one bar's own few px of
              // thickness) — solid at one edge, dissolving toward the other,
              // like a DitherGradient wash baked into the bars themselves
              // instead of sitting behind them. Folded into `dim` (already a
              // per-pixel alpha multiplier) so paintRow's border and dither
              // texture are untouched, just dimmed per row.
              for (let row = r0; row < r1; row++) {
                const rowT = row / Math.max(1, backingLen - 1)
                const edgeT = fadeDirection === "up" ? rowT : 1 - rowT
                const band = MIN_BAND_DIM + (1 - MIN_BAND_DIM) * edgeT
                paintRow(c, row, lo, hi, seed, { ...opts, dim: opts.dim * band })
              }
            }
          } else {
            const c0 = Math.round(slot.x * fx)
            const c1 = Math.round((slot.x + slot.width) * fx)
            for (let col = c0; col < c1; col++) {
              paintColumn(c, col, lo, hi, seed, opts)
            }
          }
        }
      })
    }

    let raf = 0
    let animStart = 0
    let lastProg = -1
    let lastRevision = state.current.revision
    let intensity = 0
    let needsFill = true
    let lastPaintSig = ""
    let lastSelected: string | null | undefined = Symbol() as never
    let lastHover: number | null | undefined = Symbol() as never

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const s = state.current
      if (!s.ready) return
      if (bloomCtx) {
        const on =
          s.bloom !== "off" &&
          (!s.bloomOnHover || s.isMouseInChart || s.hovered)
        if (on) {
          bloomCtx.clearRect(0, 0, cols, rows)
          bloomCtx.drawImage(canvas, 0, 0)
        }
      }
      if (s.revision !== lastRevision) {
        lastRevision = s.revision
        animStart = 0 // re-play the wave on data change / replay
        lastProg = -1
      }
      if (!animStart) animStart = now
      const prog = animate ? Math.min(1, (now - animStart) / duration) : 1

      if (prog !== lastProg) {
        lastProg = prog
        needsFill = true
      }
      const emphasisNow = s.selectedDataKey ?? s.focusDataKey
      if (emphasisNow !== lastSelected) {
        lastSelected = emphasisNow
        needsFill = true
      }
      if (s.hoverIndex !== lastHover) {
        lastHover = s.hoverIndex
        needsFill = true
      }
      const itTarget = s.isMouseInChart || s.hovered ? 1 : 0
      if (Math.abs(intensity - itTarget) > 0.001) {
        intensity += (itTarget - intensity) * (reduce ? 1 : 0.16)
        needsFill = true
      } else intensity = itTarget

      // Live tweak repaint (variant, fade direction, stacking, orientation)
      // without replaying the wave.
      const paintSig = `${s.stackType}|${s.orientation}|${s.configKeys
        .map((k) => `${s.seriesSpecs[k]?.variant ?? ""}:${s.seriesSpecs[k]?.fadeDirection ?? ""}`)
        .join(",")}`
      if (paintSig !== lastPaintSig) {
        lastPaintSig = paintSig
        needsFill = true
      }

      if (!needsFill) return
      paint(prog)
      needsFill = false
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [cols, rows, width, height])

  const bloomActive = ctx.bloomOnHover
    ? ctx.isMouseInChart || ctx.hovered
    : true
  const bloom = bloomLayerStyle(ctx.bloom, bloomActive)
  const pos = {
    left: ctx.margins.left,
    top: ctx.margins.top,
    width,
    height,
  } as const

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute"
        style={{ ...pos, imageRendering: "pixelated" }}
      />
      <canvas
        ref={bloomRef}
        className="pointer-events-none absolute"
        style={{
          ...pos,
          transition: "opacity 220ms ease",
          ...(bloom ?? { opacity: 0 }),
        }}
      />
    </>
  )
}

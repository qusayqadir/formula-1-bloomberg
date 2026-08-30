import type { AreaVariant } from "./chart-context"
import { rgb, type Seed } from "./palette"

// 4×4 ordered (Bayer) matrix, normalized to 0–1 thresholds — the exact matrix
// the legacy chart dithers with.
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

export const CELL = 2 // css px per dither cell — chunky enough to read pixelated
export const MAX_COLS = 520
export const MAX_ROWS = 200
// Opacity of the top border outline (just under solid, so it reads as a soft
// edge rather than a hard line). See the note on colour vs opacity below.
export const BORDER_ALPHA = 0.72
// Opacity of a dither "off" cell relative to an "on" cell. The scatter modulates
// between these two tiers of the *same* colour instead of leaving holes, so the
// background never shows through as stark white on a light theme.
export const OFF_TIER = 0.4

export type PaintOpts = {
  variant: AreaVariant
  intensity: number // 0–1 hover lift
  dim: number // selection dim multiplier (0.3 dimmed, 1 normal)
  stacked: boolean // denser + solid floor when layers stack
  sparse?: number // raise the dither threshold (thin out) — front layers
  /** paintRow only: compute the value-fade density against this [lo, hi]
   * range instead of the segment's own [base, value] — lets a stacked bar's
   * fade run continuously across the whole stack instead of resetting solid
   * at every segment boundary. Segment fill is unaffected (still just
   * [base, value]); only the density gradient reads from the wider range. */
  fadeExtent?: [number, number]
}

// Colour vs opacity — the guiding rule for the whole engine:
//
//   Work with opacities instead of different shades of the same color. This will
//   make sure it looks good on both light and dark mode.
//
// So every pixel is the series' single `fill` colour and we vary only its alpha.
// The old lighter `line` / near-white `star` shades were dropped: a shade that
// pops on a dark background reads as a jarring bright speck on a light one, while
// the same colour at a lower opacity simply blends into whatever sits behind it.

/**
 * Fill one backing-canvas column `x` from row `top` down to `floor` with the
 * ordered-dither scatter — solid at the floor, dissolving upward so it *fades
 * out toward the value line* — then cap the top with a soft border outline in
 * the series colour. Density drives opacity (see the note above), so the fade
 * reads correctly against both light and dark backgrounds. The single source of
 * the dither look across area / line / bar.
 */
export function paintColumn(
  octx: CanvasRenderingContext2D,
  x: number,
  top: number,
  floor: number,
  seed: Seed,
  { variant, intensity, dim, stacked, sparse = 0 }: PaintOpts
) {
  const t = Math.round(top)
  const f = Math.round(floor)
  const depth = f - t
  if (depth <= 0) {
    // Only draw a fallback pixel for a genuinely thin (nonzero) bar that
    // rounds away to nothing — an exactly-zero value (e.g. a stint a driver
    // never ran) should render as nothing, not a stray dot.
    if (top !== floor) {
      octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
      octx.fillRect(x, t, 1, 1)
    }
    return
  }
  const bias = (variant === "dotted" ? 0.12 : 0) + (stacked ? 0.2 : 0) - sparse
  for (let y = t; y < f; y++) {
    // Inverted falloff: 0 at the top line, 1 at the floor — dense at the
    // bottom, thinning as it rises toward the outline.
    let density = (y - t) / depth
    if (stacked) density = 0.5 + 0.5 * density
    if (variant === "hatched" && ((x + y) & 3) >= 2) continue
    const lit =
      variant === "solid" ||
      density > BAYER[y & 3][x & 3] - 0.1 * intensity - bias
    // "dotted" keeps real gaps for its open look; every other variant covers
    // the cell and lets the dither ride the alpha (on = full tier, off = a
    // faint tint) so nothing shows the background through as white.
    if (variant === "dotted" && !lit) continue
    // Density → alpha (see the colour-vs-opacity note above).
    const k = (0.3 + density * 0.7) * (1 + 0.22 * intensity)
    const alpha = clamp01((lit ? k : k * OFF_TIER) * dim)
    octx.fillStyle = rgb(seed.fill, 1, alpha)
    octx.fillRect(x, y, 1, 1)
  }
  // Top border outline — the shape's edge now that the fill fades out here.
  // Kept just under full opacity, with a faint feather row beneath, so it reads
  // as a soft edge rather than a hard line floating over the fade.
  octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
  octx.fillRect(x, t, 1, 1)
  if (depth > 1) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * 0.5 * dim)
    octx.fillRect(x, t + 1, 1, 1)
  }
}

/**
 * Row-oriented mirror of {@link paintColumn}, for horizontal bars. Fills one
 * backing-canvas row `y` from `base` (the zero baseline, dense) rightward to
 * `value` (dissolving toward the outline, capped with the border there) —
 * i.e. the same fade-toward-the-value-line look, transposed. `base` must be
 * <= `value`; callers pass the growth-animated pixel pair pre-ordered. Pass
 * `fadeExtent` to ramp the density over a wider range than this fill (e.g. a
 * stacked bar's full width) instead of resetting solid at every segment.
 */
export function paintRow(
  octx: CanvasRenderingContext2D,
  y: number,
  base: number,
  value: number,
  seed: Seed,
  { variant, intensity, dim, stacked, sparse = 0, fadeExtent }: PaintOpts
) {
  const b = Math.round(base)
  const v = Math.round(value)
  const depth = v - b
  if (depth <= 0) {
    // Same rule as paintColumn: skip the fallback pixel for an exactly-zero
    // (missing) segment; only draw it for a thin nonzero one.
    if (base !== value) {
      octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
      octx.fillRect(b, y, 1, 1)
    }
    return
  }
  // The stacked dither-threshold bias exists to keep individual segments
  // reading as solid despite the old locally-compressed [0.5, 1] density
  // range (below) — with `fadeExtent` supplying a real 0→1 range across the
  // whole bar, that same bias would instead flatten out the dithering for
  // any segment sitting in the high-density (early) part of the bar, hiding
  // its share of the fade entirely. Skip it once `fadeExtent` is doing the
  // real work.
  const bias = (variant === "dotted" ? 0.12 : 0) + (stacked && !fadeExtent ? 0.2 : 0) - sparse
  // `fadeExtent`, when passed, reads the density ramp from a wider [lo, hi]
  // than this segment's own fill range — the caller uses this to run one
  // continuous fade across a whole stacked bar. Without it, the ramp is
  // local to [b, v] (every other caller's existing behavior, unchanged).
  const [fadeLo, fadeHi] = fadeExtent ?? [b, v]
  const fadeDepth = Math.max(1, fadeHi - fadeLo)
  for (let x = b; x < v; x++) {
    // Falloff: 1 at the base (dense), 0 at the value edge (thinning toward
    // the outline) — the transpose of paintColumn's top-to-floor falloff.
    let density = (fadeHi - x) / fadeDepth
    // The stacked "solid floor" compression exists to keep individual
    // segments from each showing a harsh full 0→1 fade over their own few
    // px — moot (and undesired) once `fadeExtent` already spreads the ramp
    // across the whole bar, so only apply it to the local-range case.
    if (stacked && !fadeExtent) density = 0.5 + 0.5 * density
    if (variant === "hatched" && ((x + y) & 3) >= 2) continue
    const lit =
      variant === "solid" ||
      density > BAYER[y & 3][x & 3] - 0.1 * intensity - bias
    if (variant === "dotted" && !lit) continue
    const k = (0.3 + density * 0.7) * (1 + 0.22 * intensity)
    const alpha = clamp01((lit ? k : k * OFF_TIER) * dim)
    octx.fillStyle = rgb(seed.fill, 1, alpha)
    octx.fillRect(x, y, 1, 1)
  }
  // Border outline at the value edge (the far end from the baseline).
  octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
  octx.fillRect(v - 1, y, 1, 1)
  if (depth > 1) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * 0.5 * dim)
    octx.fillRect(v - 2, y, 1, 1)
  }
}

/** Linear-resample a per-index fraction array to `cols` columns. */
export function resample(src: number[], cols: number): number[] {
  const out = new Array<number>(cols)
  const last = Math.max(src.length - 1, 1)
  for (let c = 0; c < cols; c++) {
    const t = (c / Math.max(cols - 1, 1)) * last
    const i = Math.floor(t)
    const f = t - i
    const a = src[i] ?? 0
    const b = src[Math.min(i + 1, src.length - 1)] ?? a
    out[c] = a + (b - a) * f
  }
  return out
}

/** Backing-canvas resolution for a plot rect — low-res, scaled up `pixelated`. */
export function backingSize(width: number, height: number) {
  return {
    cols: Math.min(MAX_COLS, Math.max(8, Math.round(width / CELL))),
    rows: Math.min(MAX_ROWS, Math.max(8, Math.round(height / CELL))),
  }
}

// Bloom — a real "shader" glow that comes from the colours themselves: a blurred
// copy of the rendered canvas, composited additively (`plus-lighter`) so each
// hue blooms in its own colour instead of a grey wash. Lives on a second canvas
// layered over the crisp one (which stays sharp/pixelated).
export type BloomLevel = "off" | "low" | "high" | "aura"
export type BloomBlend = "plus-lighter" | "screen" | "lighten"
export type BloomConfig = {
  blur: number // px
  brightness: number // 1 = none
  opacity: number // 0–1
  /** Saturation of the glow — >1 keeps it vividly in the dither's colour
   * instead of washing toward white. */
  saturate?: number
  blend?: BloomBlend // additive by default
}
/** A preset name, a full config, or "off". */
export type BloomInput = BloomLevel | BloomConfig

const PRESET: Record<Exclude<BloomLevel, "off">, BloomConfig> = {
  low: { blur: 3, brightness: 1.35, opacity: 0.7, saturate: 1.4 },
  high: { blur: 5, brightness: 1.5, opacity: 0.78, saturate: 1.5 },
  aura: { blur: 15, brightness: 2.9, opacity: 0.1, saturate: 3 },
}

export type BloomStyle = {
  filter: string
  opacity: number
  mixBlendMode: BloomBlend
  imageRendering: "auto"
}

/** Style for the bloom *layer* canvas (a blurred, additive copy). null when off. */
export function bloomLayerStyle(
  input: BloomInput,
  active: boolean
): BloomStyle | null {
  if (!active || input === "off") return null
  const cfg = typeof input === "string" ? PRESET[input] : input
  return {
    filter: `blur(${cfg.blur}px) brightness(${cfg.brightness}) saturate(${cfg.saturate ?? 1})`,
    opacity: cfg.opacity,
    mixBlendMode: cfg.blend ?? "plus-lighter",
    imageRendering: "auto",
  }
}

// Easing — gentle start + soft settle so entrances don't feel linear.
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

/** Whether the OS asks for reduced motion (snap + steady stars). */
export function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  )
}

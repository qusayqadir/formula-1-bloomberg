/** Data-color system, dual theme.
 *
 * Identity colors follow the ENTITY (team → its drivers), never the rank, so
 * filtering does not repaint survivors — and the identity hue stays the SAME
 * hex in both modes (brand-anchored). The DB's team.primary_color is
 * currently NULL for every team, so identity comes from a curated F1-inspired
 * map keyed on team name. If ingest populates primary_color it wins.
 *
 * Every functional palette is validated per surface with the dataviz palette
 * validator:
 * - dark (#121417): categorical worst adjacent CVD ΔE 8.4 / normal 19.3, all
 *   ≥3:1; ordinal ramp monotone, dark end 2.28:1; diverging pair ΔE 23.0.
 * - light (#ffffff): categorical worst adjacent CVD ΔE 9.1 / normal 19.6
 *   (magenta/yellow/aqua sit below 3:1 → relief rule: charts always carry
 *   direct labels + tooltips); ordinal ramp monotone, light end 2.11:1;
 *   diverging pair ΔE 25.5.
 * Slot ORDER is the CVD-safety mechanism: assign in order, never cycle, and
 * never reorder without re-running the validator.
 */

export interface ChartTokens {
  surface: string;
  ink: string;
  inkSub: string;
  inkMut: string;
  gridLine: string;
  axisLine: string;
  raised: string; // tooltip / popover fill
  popBorder: string;
  accent: string;
  /** pos/neg sit in the deutan floor band — never color-alone; consumers
   *  must carry the sign another way (slope, ± prefix, ▲▼ glyph). */
  pos: string;
  neg: string;
  neutral: string;
  labelBright: string; // end-labels on colored marks
  labelDim: string;
  heatLabel: string; // text on filled heat cells
  heatLabelBorder: string;
  gained: string; // diverging pair (validated)
  lost: string;
  geoLand: string;
  geoBorder: string;
  geoPinBorder: string;
  blue: string; // categorical slot 1 / single-series hue
  blueEmphasis: string;
  fallbackSeries: readonly string[];
  seqRamp: readonly string[];
  tooltipShadow: string;
}

export const CHART_DARK: ChartTokens = {
  surface: "#121417",
  ink: "#edeef0",
  inkSub: "#9ba1a8",
  inkMut: "#626973",
  gridLine: "#1f2226",
  axisLine: "#2a2e34",
  raised: "#1a1d21",
  popBorder: "rgba(255,255,255,0.08)",
  accent: "#e5484d",
  pos: "#2eb672",
  neg: "#e5484d",
  neutral: "#626973",
  labelBright: "#c8cdd3",
  labelDim: "#4a4f56",
  heatLabel: "#eef1f4",
  heatLabelBorder: "rgba(0,0,0,0.4)",
  gained: "#3987e5",
  lost: "#e5484d",
  geoLand: "#15181d",
  geoBorder: "#262b33",
  geoPinBorder: "#0a0b0d",
  blue: "#3987e5",
  blueEmphasis: "#5598e7",
  fallbackSeries: ["#3987e5", "#008300", "#d55181", "#c98500", "#199e70", "#d95926", "#9085e9", "#e66767"],
  seqRamp: ["#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4"],
  tooltipShadow: "0 8px 24px rgba(0,0,0,0.45)",
};

export const CHART_LIGHT: ChartTokens = {
  surface: "#ffffff",
  ink: "#16181d",
  inkSub: "#4d545e",
  inkMut: "#8a919c",
  gridLine: "#eef0f3",
  axisLine: "#d5d8de",
  raised: "#ffffff",
  popBorder: "rgba(22,24,29,0.1)",
  accent: "#e5484d",
  pos: "#178a55",
  neg: "#d02b31",
  neutral: "#8a919c",
  labelBright: "#3d434c",
  labelDim: "#b3b8c0",
  heatLabel: "#16181d",
  heatLabelBorder: "rgba(255,255,255,0.5)",
  gained: "#2a78d6",
  lost: "#d02b31",
  geoLand: "#e9ebee",
  geoBorder: "#d5d8de",
  geoPinBorder: "#ffffff",
  blue: "#2a78d6",
  blueEmphasis: "#1c5cab",
  fallbackSeries: ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a", "#eb6834", "#4a3aa7", "#e34948"],
  seqRamp: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"],
  tooltipShadow: "0 8px 24px rgba(22,24,29,0.16)",
};

/* Legacy single-theme aliases (dark) — used by teamColor's fallback pool;
 * widgets should read ChartTokens via useChartTheme() instead. */
export const SURFACE = CHART_DARK.surface;
export const FALLBACK_SERIES = CHART_DARK.fallbackSeries;
export const SEQ_RAMP = CHART_DARK.seqRamp;

/** name-pattern → identity color (2011 → current grid). Order matters: more
 *  specific franchises (Racing Bulls vs Red Bull) match first. */
const TEAM_COLOR_PATTERNS: [RegExp, string][] = [
  [/racing bulls|alphatauri|toro rosso/i, "#6c98ff"],
  [/red bull/i, "#4e7fd4"],
  [/ferrari/i, "#e8112d"],
  [/mercedes/i, "#14a8a0"],
  [/mclaren/i, "#ff8000"],
  [/aston martin/i, "#2d9a6d"],
  [/alpine/i, "#2293d1"],
  [/williams/i, "#4ea4e8"],
  [/haas/i, "#a8b2bd"],
  [/kick|stake/i, "#35b24a"],
  [/alfa romeo/i, "#c0244a"],
  [/sauber/i, "#35b24a"],
  [/renault/i, "#c8b400"],
  [/lotus/i, "#b39a5b"],
  [/force india|racing point/i, "#d5588f"],
  [/caterham/i, "#0f8a50"],
  [/marussia|manor|virgin/i, "#c45048"],
  [/hrt|hispania/i, "#a08a4d"],
  [/brawn/i, "#b8f04a"],
];

const assigned = new Map<number, string>();
let nextFallback = 0;

export function teamColor(team: { id: number; name: string; primary_color?: string | null }): string {
  if (team.primary_color) {
    return team.primary_color.startsWith("#") ? team.primary_color : `#${team.primary_color}`;
  }
  const hit = assigned.get(team.id);
  if (hit) return hit;
  const pattern = TEAM_COLOR_PATTERNS.find(([re]) => re.test(team.name));
  const color = pattern ? pattern[1] : FALLBACK_SERIES[nextFallback++ % FALLBACK_SERIES.length];
  assigned.set(team.id, color);
  return color;
}

/** Teammates share the team hue; the line DASH separates them (index within
 *  the team, stable by driver id). */
export type LineStyleKind = "solid" | "dashed" | "dotted";
export function teammateLineStyle(index: number): LineStyleKind {
  return index === 0 ? "solid" : index === 1 ? "dashed" : "dotted";
}

/** Interpolate a sequential ramp at t ∈ [0,1] (t=1 = maximum intensity). */
export function seqColor(t: number, ramp: readonly string[] = SEQ_RAMP): string {
  const clamped = Math.max(0, Math.min(1, t));
  const pos = clamped * (ramp.length - 1);
  const i = Math.min(Math.floor(pos), ramp.length - 2);
  return mixHex(ramp[i], ramp[i + 1], pos - i);
}

/** True when text on this fill needs to be light (fill is dark). */
export function isDarkFill(hex: string): boolean {
  const v = parseInt(hex.slice(1), 16);
  const lum =
    0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255);
  return lum < 140;
}

/** hex → rgba() for translucent fills that keep the identity hue. */
export function withAlpha(hex: string, alpha: number): string {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

/** Mix two hex colors, t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t);
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

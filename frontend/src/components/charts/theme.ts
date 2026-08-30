/** Shared ECharts chrome, dark-only. Widgets call useChartTheme() and build
 *  options from the returned bundle; it's a module-level singleton, so
 *  putting it in a useMemo dependency list is just a stable identity check.
 *  Marks stay thin (2px lines, capped bars); grid/axes stay recessive. */
import type { LegendComponentOption, TooltipComponentOption } from "echarts";
import { CHART_DARK, withAlpha, type ChartTokens } from "@/lib/colors";
import type { ThemeMode } from "@/state/theme";

export const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';
export const SANS = '"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", system-ui, sans-serif';

export interface ChartChrome {
  mode: ThemeMode;
  t: ChartTokens;
  axisLabel: { color: string; fontSize: number; fontFamily: string };
  baseTooltip: TooltipComponentOption;
  baseGrid: { left: number; right: number; top: number; bottom: number; containLabel: boolean };
  legendStyle: LegendComponentOption;
  /* axis helpers return `any` on purpose: the same fragment feeds x- and
   * y-axis slots, whose ECharts option types are distinct. */
  categoryAxis: (data: (string | number)[], overrides?: object) => any;
  valueAxis: (overrides?: object) => any;
  /* Tooltip HTML kit — mirrors the dither-kit <Tooltip> card (mono heading,
   * swatch + muted label + right-aligned tabular value rows) so ECharts
   * widgets and dither-kit widgets share one hover language. */
  tipHeading: (text: string) => string;
  tipRow: (
    label: string,
    value: string,
    opts?: { swatch?: string; dimmed?: boolean },
  ) => string;
  tip: (heading: string | null, rows: string[]) => string;
}

function build(mode: ThemeMode, t: ChartTokens): ChartChrome {
  const axisLabel = { color: t.inkSub, fontSize: 10, fontFamily: MONO };
  const tipHeading = (text: string) =>
    `<div style="margin-bottom:2px;font-family:${MONO};font-size:10px;color:${t.inkSub}">${text}</div>`;
  const tipRow = (
    label: string,
    value: string,
    opts: { swatch?: string; dimmed?: boolean } = {},
  ) =>
    `<div style="display:flex;align-items:center;gap:6px;min-width:0;font-family:${MONO};font-size:11px;font-variant-numeric:tabular-nums;color:${t.ink};${opts.dimmed ? "opacity:.4;" : ""}">` +
    (opts.swatch
      ? `<span style="flex:none;width:8px;height:8px;border-radius:1px;background:${opts.swatch}"></span>`
      : "") +
    `<span style="color:${t.inkSub}">${label}</span>` +
    `<span style="margin-left:auto;padding-left:8px">${value}</span></div>`;
  const tip = (heading: string | null, rows: string[]) =>
    `${heading ? tipHeading(heading) : ""}<div style="display:flex;flex-direction:column;gap:2px">${rows.join("")}</div>`;
  return {
    mode,
    t,
    axisLabel,
    baseTooltip: {
      /* frosted-glass card (matches dither-kit <Tooltip>): near-transparent
       * fill + backdrop blur + light ink border, soft shadow; confine keeps
       * it on screen. */
      backgroundColor: withAlpha(t.raised, 0.75),
      borderColor: withAlpha(t.ink, 0.22),
      borderWidth: 1,
      padding: [4, 8] as number[],
      confine: true,
      // ECharts defaults to a 0.4s CSS transition on the tooltip's position —
      // fine for a slow-moving cursor, but it reads as laggy/choppy tracking
      // when scrubbing quickly across points. Snap instantly instead.
      transitionDuration: 0,
      textStyle: { color: t.ink, fontSize: 11, fontFamily: MONO },
      extraCssText:
        "box-shadow: 0 1px 2px rgba(0,0,0,0.1); border-radius: 6px; font-variant-numeric: tabular-nums; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); line-height: 1.45;",
    },
    baseGrid: { left: 8, right: 16, top: 10, bottom: 4, containLabel: true },
    legendStyle: {
      type: "scroll" as const,
      bottom: 0,
      left: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 3,
      itemGap: 12,
      textStyle: { color: t.inkSub, fontSize: 10, fontFamily: MONO },
      inactiveColor: t.labelDim,
      pageIconColor: t.inkSub,
      pageIconInactiveColor: t.labelDim,
      pageTextStyle: { color: t.inkSub, fontFamily: MONO, fontSize: 10 },
    },
    categoryAxis: (data: (string | number)[], overrides: object = {}) => ({
      type: "category" as const,
      data,
      axisLine: { lineStyle: { color: t.axisLine } },
      axisTick: { show: false },
      axisLabel,
      ...overrides,
    }),
    valueAxis: (overrides: object = {}) => ({
      type: "value" as const,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel,
      splitLine: { lineStyle: { color: t.gridLine, width: 1, type: "solid" as const } },
      ...overrides,
    }),
    tipHeading,
    tipRow,
    tip,
  };
}

const DARK_BUNDLE = build("dark", CHART_DARK);

export function useChartTheme(): ChartChrome {
  return DARK_BUNDLE;
}

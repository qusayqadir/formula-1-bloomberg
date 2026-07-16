/** Shared ECharts chrome, theme-aware. Widgets call useChartTheme() and
 *  build options from the returned bundle; the bundle is a per-mode cached
 *  singleton, so putting it in a useMemo dependency list re-renders the
 *  chart exactly once per theme flip. Marks stay thin (2px lines, capped
 *  bars); grid/axes stay recessive in both modes. */
import type { LegendComponentOption, TooltipComponentOption } from "echarts";
import { CHART_DARK, CHART_LIGHT, type ChartTokens } from "@/lib/colors";
import { useTheme, type ThemeMode } from "@/state/theme";

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
}

function build(mode: ThemeMode, t: ChartTokens): ChartChrome {
  const axisLabel = { color: t.inkSub, fontSize: 10, fontFamily: MONO };
  return {
    mode,
    t,
    axisLabel,
    baseTooltip: {
      backgroundColor: t.raised,
      borderColor: t.popBorder,
      borderWidth: 1,
      padding: [8, 10] as number[],
      textStyle: { color: t.ink, fontSize: 11, fontFamily: SANS },
      extraCssText: `box-shadow: ${t.tooltipShadow}; border-radius: 6px;`,
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
  };
}

const BUNDLES: Record<ThemeMode, ChartChrome> = {
  dark: build("dark", CHART_DARK),
  light: build("light", CHART_LIGHT),
};

export function useChartTheme(): ChartChrome {
  const { mode } = useTheme();
  return BUNDLES[mode];
}

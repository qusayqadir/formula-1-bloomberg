/** One live Polymarket F1 event, one widget per event (matches the
 *  historical dashboard's chart language: raw ECharts line + real x/y axes,
 *  not the dither-kit sparkline). Multi-candidate events (driver/constructor
 *  champion, action of the year, ...) chart every candidate as its own
 *  line, colored + legended like ChampionshipProgression — mirroring
 *  Polymarket's own event chart. Plain binary events ("Will X retire?")
 *  render as a single trend-colored line, since the market IS the event.
 *  Yes/no prices are Polymarket's native 0-1 pricing scaled to 0-100
 *  (no_price = 100 - yes_price, binary markets). */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { useChartTheme } from "@/components/charts/theme";
import { teamColor, withAlpha } from "@/lib/colors";
import type { PolymarketEvent } from "@/lib/types";

function formatOdds(v: number): string {
  if (!isFinite(v)) return "—";
  return v < 1 || v > 99 ? `${v.toFixed(2)}%` : `${Math.round(v)}%`;
}

function formatUsdCompact(v: number): string {
  if (!isFinite(v)) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDateLabel(t: number): string {
  return new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Days remaining until `expiryMs`, counting down toward the market's
 * resolution (0 at expiry) — used in place of calendar dates for closed
 * events, since "Aug 27" means nothing once the market's long since
 * resolved but "5 days before it settled" still does. */
function formatCountdownLabel(valueMs: number, expiryMs: number): string {
  const days = Math.round((expiryMs - valueMs) / 86_400_000);
  return `${days}D`;
}

/** Stable synthetic id for teamColor()'s per-identity cache, derived from
 * the outcome label — offset well above any real DB team id so it can
 * never collide with one. Constructor names resolve to their real brand
 * hex via teamColor()'s pattern match; anything else (driver names) falls
 * through to its fallbackSeries cycle, same as a real unmatched team would,
 * and stays consistent for that name across every card on the page. */
function labelId(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return 1_000_000 + (hash >>> 0) % 1_000_000;
}

/** Last known price at-or-before `targetMs` (order-book prices are
 * piecewise-constant between trades). Each market is downsampled
 * independently, so their timestamps rarely line up — looking this up
 * directly, rather than relying on ECharts to find a same-position point
 * per series, is what lets every market show up in the tooltip together. */
function priceAt(history: { t: number; yes_price: number }[], targetMs: number): number | null {
  if (!history.length) return null;
  const targetSec = targetMs / 1000;
  let value = history[0].yes_price;
  for (const p of history) {
    if (p.t > targetSec) break;
    value = p.yes_price;
  }
  return value;
}

export function PolymarketMarketWidget(props: {
  event: PolymarketEvent;
  refreshing?: boolean;
  className?: string;
}) {
  const { event } = props;
  const markets = event.markets;
  const multi = markets.length > 1;
  const expiryMs = event.expiry ? new Date(event.expiry).getTime() : null;
  const closed = event.status === "closed" && expiryMs != null;
  const C = useChartTheme();
  const { t, axisLabel, baseGrid, baseTooltip, legendStyle, valueAxis } = C;

  const xLabel = (ms: number) => (closed ? formatCountdownLabel(ms, expiryMs!) : formatDateLabel(ms / 1000));

  const option = useMemo<EChartsOption | null>(() => {
    if (!markets.length || markets.every((m) => m.price_history.length === 0)) return null;

    const colored = markets.map((m) => {
      if (multi) return { market: m, color: teamColor({ id: labelId(m.outcome_label), name: m.outcome_label }) };
      const trendUp =
        m.price_history.length < 2
          ? null
          : m.price_history[m.price_history.length - 1].yes_price >= m.price_history[0].yes_price;
      return { market: m, color: trendUp === null ? t.neutral : trendUp ? t.pos : t.neg };
    });

    return {
      animationDuration: 300,
      grid: { ...baseGrid, left: 4, bottom: multi ? 26 : 22 },
      legend: multi ? { ...legendStyle } : undefined,
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        axisPointer: { type: "line", snap: true, lineStyle: { color: t.labelDim } },
        // Build every row from the raw series data at the hovered
        // timestamp instead of trusting ECharts' per-series axis match —
        // with independently-downsampled series that rarely share an exact
        // x position, that match drops series with no point right there.
        formatter: (ps: any) => {
          const p0 = Array.isArray(ps) ? ps[0] : ps;
          if (!p0) return "";
          const hoveredMs = p0.axisValue as number;
          const rows = colored
            .map(({ market: m, color }) => {
              const price = priceAt(m.price_history, hoveredMs);
              return price == null ? null : { label: m.outcome_label, price, color };
            })
            .filter((r): r is { label: string; price: number; color: string } => r != null)
            .sort((a, b) => b.price - a.price);
          if (!rows.length) return "";
          return C.tip(
            xLabel(hoveredMs),
            rows.map((r) => C.tipRow(r.label, formatOdds(r.price), { swatch: r.color })),
          );
        },
      },
      // Real time axis, not a category of day-labels: a market can carry
      // several downsampled points within the same calendar day, and a
      // category axis collapses same-label points onto one tick — which
      // made the tooltip stack multiple distinct prices under one row.
      // Exact timestamps sidestep that collision entirely.
      xAxis: {
        type: "time" as const,
        axisLine: { lineStyle: { color: t.axisLine } },
        axisTick: { show: false },
        minInterval: 24 * 60 * 60 * 1000,
        // Force consistent ticks — ECharts' default time-axis formatter
        // switches to hour:minute once the visible span is under a day,
        // which reads as a different (and inconsistent) axis style from
        // every other card. Closed events count down days-to-expiry
        // instead of calendar dates, which resolved long ago and mean
        // nothing at a glance next to a live market's chart.
        axisLabel: { ...axisLabel, formatter: (value: number) => xLabel(value) },
      },
      yAxis: valueAxis({ min: 0, max: 100, axisLabel: { ...axisLabel, formatter: "{value}%" } }),
      series: colored.map(({ market: m, color }) => ({
        name: m.outcome_label,
        type: "line" as const,
        showSymbol: false,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        color,
        areaStyle: multi ? undefined : { color: withAlpha(color, 0.28) },
        data: m.price_history.map((p) => [p.t * 1000, p.yes_price]),
      })),
    };
  }, [markets, multi, closed, expiryMs, t, axisLabel, baseGrid, baseTooltip, legendStyle, valueAxis, C]);

  const leader = markets[0]; // backend sorts markets richest-outcome-first
  const subtitle = !leader
    ? undefined
    : multi
      ? `Leader: ${leader.outcome_label} ${formatOdds(leader.yes_price)}`
      : `YES ${formatOdds(leader.yes_price)} · NO ${formatOdds(leader.no_price)}`;

  return (
    <AnalyticsCard
      eyebrow={event.status === "closed" ? "Closed · Polymarket" : "Live · Polymarket"}
      title={event.event_title}
      subtitle={subtitle}
      refreshing={props.refreshing}
      empty={!option}
      emptyText="No price history yet for this event."
      className={props.className}
      bodyClassName="flex flex-col gap-2 p-2"
    >
      {option && (
        <>
          <div className="min-h-0 flex-1">
            <EChart option={option} />
          </div>
          <div className="flex flex-none items-center justify-between font-mono text-[10px] uppercase tracking-wider text-mut">
            <span>
              Vol <span className="text-[13px] font-semibold normal-case tabular-nums text-ink">{formatUsdCompact(event.event_volume)}</span>
            </span>
            <span>
              Liq <span className="text-[13px] font-semibold normal-case tabular-nums text-ink">{formatUsdCompact(event.event_liquidity)}</span>
            </span>
          </div>
        </>
      )}
    </AnalyticsCard>
  );
}

/** Pole conversion vs order shuffle per circuit, 2011–2025. One dot per
 *  circuit (size = races held): bottom-left is processional and pole-locked
 *  (Monaco country), top-right rewards racecraft. Single hue — identity
 *  lives in the selective labels and the tooltip, never in color. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useCircuitRacecraft } from "@/lib/queries";
import { quantileSorted } from "@/features/dashboard/selectors";

const YEAR_FROM = 2011;
const YEAR_TO = 2025;
const MIN_RACES = 4;

/** First distinctive word(s) of a circuit name ("Circuit de Monaco" → Monaco). */
const GENERIC = new Set([
  "circuit", "circuito", "autodromo", "autódromo", "international", "internacional",
  "nazionale", "de", "di", "do", "da", "del", "du", "the", "park", "street",
  "raceway", "speedway", "grand", "prix", "bay",
]);
function shortName(name: string): string {
  const words = name.split(/\s+/).filter((w) => !GENERIC.has(w.toLowerCase()));
  if (!words.length) return name;
  return words[0].length <= 4 && words[1] ? `${words[0]} ${words[1]}` : words[0];
}

export function CircuitRacecraft(props: { className?: string }) {
  const C = useChartTheme();
  const { t, axisLabel, baseTooltip, valueAxis } = C;
  const query = useCircuitRacecraft(YEAR_FROM, YEAR_TO);

  const option = useMemo<EChartsOption | null>(() => {
    const rows = (query.data?.rows ?? []).filter(
      (r) =>
        r.races >= MIN_RACES && r.pole_win_rate != null && r.avg_abs_position_change != null,
    );
    if (!rows.length) return null;

    const xs = rows.map((r) => r.avg_abs_position_change as number);
    const ys = rows.map((r) => (r.pole_win_rate as number) * 100);
    const medianX = quantileSorted([...xs].sort((a, b) => a - b), 0.5);
    const medianY = quantileSorted([...ys].sort((a, b) => a - b), 0.5);

    // Selective direct labels: the extremes on each axis only.
    const labeled = new Set<number>();
    const byX = rows.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
    const byY = rows.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
    for (const i of [...byX.slice(0, 2), ...byX.slice(-2), ...byY.slice(0, 2), ...byY.slice(-2)]) {
      labeled.add(i);
    }

    return {
      animationDuration: 300,
      grid: { left: 8, right: 24, top: 28, bottom: 34, containLabel: true },
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (p: any) => {
          const r = rows[p.dataIndex];
          if (!r) return "";
          return C.tip(r.circuit_name, [
            C.tipRow("RACES", `${r.races}`),
            C.tipRow("POLE→WIN", `${Math.round((r.pole_win_rate ?? 0) * 100)}% (${r.pole_wins}/${r.pole_starts})`),
            C.tipRow("FRONT ROW→WIN", `${Math.round((r.front_row_win_rate ?? 0) * 100)}%`),
            C.tipRow("WINNER AVG GRID", `P${(r.winner_avg_grid ?? 0).toFixed(1)}`),
            C.tipRow("AVG SHUFFLE", `${(r.avg_abs_position_change ?? 0).toFixed(2)} PL/FIN`),
          ]);
        },
      },
      xAxis: valueAxis({
        name: "AVG PLACES CHANGED / FINISHER",
        nameLocation: "middle",
        nameGap: 24,
        nameTextStyle: { color: t.inkMut, fontFamily: MONO, fontSize: 8 },
        scale: true,
      }),
      yAxis: valueAxis({
        name: "POLE → WIN",
        nameTextStyle: { color: t.inkMut, fontFamily: MONO, fontSize: 8 },
        axisLabel: { ...axisLabel, formatter: (v: number) => `${v}%` },
      }),
      series: [
        {
          type: "scatter",
          data: rows.map((r, i) => ({
            value: [r.avg_abs_position_change, (r.pole_win_rate ?? 0) * 100],
            symbolSize: 8 + Math.sqrt(r.races) * 2,
            label: labeled.has(i)
              ? {
                  show: true,
                  position: "top",
                  distance: 3,
                  color: t.inkSub,
                  fontFamily: MONO,
                  fontSize: 8,
                  formatter: () => shortName(r.circuit_name),
                }
              : undefined,
          })),
          itemStyle: {
            color: t.blue,
            opacity: 0.9,
            borderColor: t.surface,
            borderWidth: 1.5,
          },
          labelLayout: { moveOverlap: "shiftY" },
          emphasis: { itemStyle: { color: t.blueEmphasis, opacity: 1 } },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: t.axisLine, type: "dashed", width: 1 },
            label: { show: false },
            data: [{ xAxis: medianX }, { yAxis: medianY }],
          },
        },
      ],
    };
  }, [query.data, C]);

  return (
    <AnalyticsCard
      eyebrow="Circuits · Racecraft"
      title="Pole conversion vs shuffle"
      subtitle={`${YEAR_FROM}–${YEAR_TO} · circuits with ${MIN_RACES}+ races · dot = races held`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No circuit aggregates available for the window."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

/** Grid → Finish slope for the focused round. Polarity encoding (diverging):
 *  green = gained, red = lost, gray = held — identity comes from the labels. */
import { useMemo } from "react";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, roundsFromResults, rowsForRound, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { driverCode, shortRoundName } from "@/lib/format";

export function GridFinishSlope(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t, axisLabel, baseTooltip } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);
  const rounds = useMemo(() => roundsFromResults(query.data?.items), [query.data]);
  const round = focusRound(rounds, filters);
  const roundName = rounds.find((r) => r.number === round)?.name;

  const option = useMemo<EChartsOption | null>(() => {
    const visible = visibleDriverIds(props.entities, filters);
    const rows = rowsForRound(query.data?.items, round).filter(
      (r) =>
        (visible === null || visible.has(r.driver_id)) &&
        r.grid != null &&
        r.grid > 0 &&
        r.position != null,
    );
    if (!rows.length) return null;
    const maxPos = Math.max(...rows.map((r) => Math.max(r.grid ?? 0, r.position ?? 0)));

    const series: LineSeriesOption[] = rows.map((r) => {
      const delta = (r.grid ?? 0) - (r.position ?? 0);
      const color = delta > 0 ? t.pos : delta < 0 ? t.neg : t.neutral;
      const code = driverCode({ abbreviation: r.driver_abbreviation, surname: r.driver_surname });
      return {
        name: code,
        type: "line",
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: delta === 0 ? 1.5 : 2, color, opacity: delta === 0 ? 0.45 : 0.85 },
        itemStyle: { color, borderColor: t.surface, borderWidth: 1.5 },
        emphasis: { focus: "series", lineStyle: { width: 3, opacity: 1 } },
        blur: { lineStyle: { opacity: 0.1 }, itemStyle: { opacity: 0.1 }, label: { show: false } },
        endLabel: {
          show: true,
          formatter: `${code} ${delta > 0 ? `+${delta}` : delta}`,
          color: t.labelBright,
          fontFamily: MONO,
          fontSize: 9,
          distance: 6,
        },
        labelLayout: { moveOverlap: "shiftY" },
        tooltip: {
          formatter: () =>
            `<b>${code}</b> — ${r.team_name}<br/>` +
            `<span style="font-family:${MONO};font-size:10px">GRID P${r.grid} → FIN P${r.position} (${delta > 0 ? "+" : ""}${delta})</span>`,
        },
        data: [
          ["GRID", r.grid],
          ["FINISH", r.position],
        ],
      };
    });

    return {
      animationDuration: 300,
      grid: { left: 8, right: 66, top: 14, bottom: 6, containLabel: true },
      tooltip: { ...baseTooltip, trigger: "item" },
      xAxis: {
        type: "category",
        data: ["GRID", "FINISH"],
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, fontSize: 9, fontWeight: 600 },
      },
      yAxis: {
        type: "value",
        inverse: true,
        min: 1,
        max: maxPos,
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, formatter: "P{value}" },
        splitLine: { lineStyle: { color: t.gridLine, width: 1, type: "solid" } },
      },
      series,
    };
  }, [query.data, round, filters, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Session · Grid vs finish"
      title="Grid → Finish"
      subtitle={round ? `R${round} ${shortRoundName(roundName)}` : undefined}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No grid/finish pairs for this session (pit-lane starts and missing grids are excluded)."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

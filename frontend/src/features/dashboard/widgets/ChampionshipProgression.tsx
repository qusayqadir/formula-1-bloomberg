/** One reusable championship-progression widget powers both the driver and
 *  constructor cards: same dataset, metric toggle (points / wins /
 *  gap-to-leader) re-shapes it locally with zero extra requests. Position
 *  (rank-over-time) is deliberately omitted — that's exactly the standalone
 *  BumpChart widget below, so keeping it here would just duplicate it. */
import { useMemo, useState } from "react";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Segmented } from "@/components/ui/controls";
import { EChart } from "@/components/charts/EChart";
import { useChartTheme } from "@/components/charts/theme";
import { useDriverProgression, useTeamProgression } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { sliceProgression, visibleDriverIds, type ChampMetric } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";

const METRIC_OPTIONS: { value: ChampMetric; label: string }[] = [
  { value: "points", label: "PTS" },
  { value: "wins", label: "WINS" },
  { value: "gap", label: "GAP" },
];

export function ChampionshipProgression(props: {
  kind: "drivers" | "teams";
  entities: SeasonEntities;
  className?: string;
}) {
  const { filters } = useFilters();
  const [metric, setMetric] = useState<ChampMetric>("points");
  const C = useChartTheme();
  const { t, axisLabel, baseGrid, baseTooltip, categoryAxis, legendStyle, valueAxis } = C;
  const driversQ = useDriverProgression(filters.year);
  const teamsQ = useTeamProgression(filters.year);
  const query = props.kind === "drivers" ? driversQ : teamsQ;

  const option = useMemo<EChartsOption | null>(() => {
    const data = query.data;
    if (!data) return null;
    const visible = props.kind === "drivers" ? visibleDriverIds(props.entities, filters) : null;
    const teamFilter =
      props.kind === "teams" && filters.teamIds.length ? new Set(filters.teamIds) : null;

    const roundNumbers = new Set<number>();
    const series: LineSeriesOption[] = [];
    let maxPosition = 0;

    for (const s of data.series) {
      const entityId = (s.entity as { id: number }).id;
      if (visible && !visible.has(entityId)) continue;
      if (teamFilter && !teamFilter.has(entityId)) continue;
      const values = sliceProgression(s.values, filters);
      if (!values.length) continue;

      let name: string, color: string, dash: "solid" | "dashed" | "dotted" = "solid";
      if (props.kind === "drivers") {
        const d = props.entities.driverById.get(entityId);
        name = d?.code ?? (s.entity as { surname?: string }).surname ?? String(entityId);
        color = d?.color ?? t.neutral;
        dash = d?.lineStyle ?? "solid";
      } else {
        const team = props.entities.teamById.get(entityId);
        name = team?.name ?? (s.entity as { name?: string }).name ?? String(entityId);
        color = team?.color ?? t.neutral;
      }
      for (const v of values) roundNumbers.add(v.round_number);
      maxPosition = Math.max(maxPosition, ...values.map((v) => v.position ?? 0));

      series.push({
        name,
        type: "line",
        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,
        emphasis: { focus: "series" },
        lineStyle: { width: 2, type: dash },
        itemStyle: { color, borderColor: t.surface, borderWidth: 2 },
        color,
        data: values.map((v) => {
          const value =
            metric === "points"
              ? v.points
              : metric === "position"
                ? v.position
                : metric === "wins"
                  ? v.win_count
                  : v.gap_to_leader;
          return { name: v.round_name ?? `R${v.round_number}`, value: [`R${v.round_number}`, value] };
        }),
      });
    }
    if (!series.length) return null;

    const rounds = [...roundNumbers].sort((a, b) => a - b).map((n) => `R${n}`);
    const inverse = metric === "position";
    return {
      animationDuration: 300,
      grid: { ...baseGrid, bottom: 26 },
      legend: { ...legendStyle },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: t.labelDim } },
        order: inverse ? "valueAsc" : "valueDesc",
        confine: true,
        formatter: (ps: any) => {
          const items = (Array.isArray(ps) ? ps : [ps])
            .filter((p: any) => p.value?.[1] != null)
            .sort((a: any, b: any) =>
              inverse ? a.value[1] - b.value[1] : b.value[1] - a.value[1],
            );
          if (!items.length) return "";
          return C.tip(
            items[0].data?.name ?? items[0].axisValueLabel,
            items.map((p: any) =>
              C.tipRow(p.seriesName, inverse ? `P${p.value[1]}` : `${p.value[1]}`, {
                swatch: p.color,
              }),
            ),
          );
        },
      },
      xAxis: categoryAxis(rounds, { boundaryGap: false }),
      yAxis: valueAxis(
        inverse
          ? { inverse: true, min: 1, max: maxPosition || undefined, minInterval: 1, axisLabel: { ...axisLabel, formatter: "P{value}" } }
          : { min: 0 },
      ),
      series,
    };
  }, [query.data, metric, filters, props.entities, props.kind, C]);

  return (
    <AnalyticsCard
      eyebrow={props.kind === "drivers" ? "Championship · Drivers" : "Championship · Constructors"}
      title={props.kind === "drivers" ? "Driver progression" : "Constructor progression"}
      subtitle={`${filters.year} · by round`}
      controls={
        <Segmented ariaLabel="Championship metric" value={metric} options={METRIC_OPTIONS} onChange={setMetric} />
      }
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No championship snapshots match the current selection."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

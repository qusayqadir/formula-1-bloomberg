/** Driver × round heatmap over the season-results dataset. Sequential
 *  single-hue ramp; for rank metrics the bright end means better (P1).
 *  Row-label click toggles the driver filter; cell click focuses the round. */
import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Segmented } from "@/components/ui/controls";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { filteredSeasonRows, roundsFromResults } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { durationToSeconds, sanitizeLapSeconds, shortRoundName } from "@/lib/format";
import type { SessionResult } from "@/lib/types";

type Metric = "finish" | "grid" | "points" | "flrank";

const METRICS: Record<
  Metric,
  { label: string; value: (r: SessionResult) => number | null; lowerIsBetter: boolean }
> = {
  finish: { label: "FIN", value: (r) => r.position, lowerIsBetter: true },
  grid: { label: "GRID", value: (r) => (r.grid && r.grid > 0 ? r.grid : null), lowerIsBetter: true },
  points: { label: "PTS", value: (r) => r.points, lowerIsBetter: false },
  // source fastest_lap_rank ranks polluted values — derived per round instead
  flrank: { label: "FL RANK", value: () => null, lowerIsBetter: true },
};

/** driverId:round → rank of the driver's sanitized fastest lap in that round. */
function computeFlRanks(rows: SessionResult[]): Map<string, number> {
  const byRound = new Map<number, { driverId: number; lap: number }[]>();
  for (const r of rows) {
    const lap = sanitizeLapSeconds(durationToSeconds(r.fastest_lap_time));
    if (lap == null || r.round_number == null) continue;
    const bucket = byRound.get(r.round_number) ?? [];
    bucket.push({ driverId: r.driver_id, lap });
    byRound.set(r.round_number, bucket);
  }
  const ranks = new Map<string, number>();
  for (const [round, laps] of byRound) {
    laps.sort((a, b) => a.lap - b.lap);
    laps.forEach((l, i) => ranks.set(`${l.driverId}:${round}`, i + 1));
  }
  return ranks;
}

export function ResultsHeatmap(props: { entities: SeasonEntities; className?: string }) {
  const { filters, set, toggleDriver } = useFilters();
  const [metric, setMetric] = useState<Metric>("finish");
  const C = useChartTheme();
  const { t, axisLabel, baseTooltip } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);

  const model = useMemo(() => {
    const rows = filteredSeasonRows(query.data?.items, props.entities, filters);
    if (!rows.length) return null;
    const rounds = roundsFromResults(rows);
    const driverIds = new Set(rows.map((r) => r.driver_id));
    // rows ordered by championship points (entities are pre-sorted desc)
    const drivers = props.entities.drivers.filter((d) => driverIds.has(d.id));
    if (!drivers.length || !rounds.length) return null;

    const roundIndex = new Map(rounds.map((r, i) => [r.number, i]));
    const driverIndex = new Map(drivers.map((d, i) => [d.id, i]));
    const spec = METRICS[metric];
    const flRanks = metric === "flrank" ? computeFlRanks(rows) : null;
    const cells: [number, number, number][] = [];
    const meta = new Map<string, { round: string; circuit: string; raw: number }>();
    let min = Infinity;
    let max = -Infinity;
    for (const r of rows) {
      const x = roundIndex.get(r.round_number ?? -1);
      const y = driverIndex.get(r.driver_id);
      const v = flRanks ? (flRanks.get(`${r.driver_id}:${r.round_number}`) ?? null) : spec.value(r);
      if (x == null || y == null || v == null) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
      cells.push([x, y, v]);
      meta.set(`${x}:${y}`, {
        round: `R${r.round_number} ${shortRoundName(r.round_name)}`,
        circuit: r.circuit_name,
        raw: v,
      });
    }
    if (!cells.length) return null;
    return { rounds, drivers, cells, min, max, spec, meta };
  }, [query.data, props.entities, filters, metric]);

  const option = useMemo<EChartsOption | null>(() => {
    if (!model) return null;
    const { rounds, drivers, cells, min, max, spec, meta } = model;
    const ramp = spec.lowerIsBetter ? [...t.seqRamp].reverse() : [...t.seqRamp];
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 8, bottom: 42, containLabel: true },
      tooltip: {
        ...baseTooltip,
        formatter: (p: any) => {
          const m = meta.get(`${p.value[0]}:${p.value[1]}`);
          const d = drivers[p.value[1]];
          return (
            `<b>${d.code}</b> — ${d.name}<br/>` +
            `<span style="font-family:${MONO};font-size:10px;color:${t.inkSub}">${m?.round} · ${m?.circuit}</span><br/>` +
            `${spec.label}: <b>${spec.lowerIsBetter ? `P${p.value[2]}` : p.value[2]}</b>`
          );
        },
      },
      xAxis: {
        type: "category",
        position: "top",
        data: rounds.map((r) => `R${r.number}`),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, fontSize: 9 },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: drivers.map((d) => d.code),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, fontSize: 10 },
        triggerEvent: true,
      },
      visualMap: {
        min,
        max,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemHeight: 220,
        itemWidth: 10,
        inverse: spec.lowerIsBetter,
        text: spec.lowerIsBetter ? ["P1 · best", `P${max}`] : ["max", "0"],
        textStyle: { color: t.inkMut, fontSize: 9, fontFamily: MONO },
        inRange: { color: ramp },
      },
      series: [
        {
          type: "heatmap",
          data: model.cells.length ? cells : [],
          itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 2 },
          label: {
            show: rounds.length <= 26 && drivers.length <= 24,
            fontSize: 8.5,
            fontFamily: MONO,
            color: t.heatLabel,
            textBorderColor: t.heatLabelBorder,
            textBorderWidth: 1.5,
            formatter: (p: any) => String(p.value[2]),
          },
          emphasis: { itemStyle: { borderColor: t.accent, borderWidth: 1.5 } },
        },
      ],
    };
  }, [model, C]);

  const events = {
    click: (params: any) => {
      if (params.componentType === "yAxis") {
        const d = model?.drivers.find((x) => x.code === params.value);
        if (d) toggleDriver(d.id);
        return;
      }
      if (params.componentType === "series" && model) {
        const round = model.rounds[params.value[0]];
        if (round) set({ round: round.number });
      }
    },
  };

  return (
    <AnalyticsCard
      eyebrow="Season · Results matrix"
      title="Driver results heatmap"
      subtitle="click a cell to focus its round · click a driver code to filter"
      controls={
        <Segmented
          ariaLabel="Heatmap metric"
          value={metric}
          options={Object.entries(METRICS).map(([value, m]) => ({ value: value as Metric, label: m.label }))}
          onChange={setMetric}
        />
      }
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} events={events} />}
    </AnalyticsCard>
  );
}

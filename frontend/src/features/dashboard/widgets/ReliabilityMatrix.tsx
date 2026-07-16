/** Retirements by cause — stacked DNF counts per team, worst first.
 *  Buckets come from the status vocabulary (statusBucket in selectors);
 *  the three category hues are a validated sub-palette (blue/magenta/amber
 *  — green is deliberately skipped in a failures chart). */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { filteredSeasonRows, statusBucket } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";

/** Bucket hues come from validated categorical slots 1/3/4 per mode —
 *  green is deliberately skipped in a failures chart. */
const BUCKETS = [
  { key: "mechanical", label: "Mechanical", slot: 0 },
  { key: "incident", label: "Incident", slot: 2 },
  { key: "other", label: "Other DNF", slot: 3 },
] as const;

interface TeamReliability {
  name: string;
  starts: number;
  mechanical: number;
  incident: number;
  other: number;
  total: number;
}

export function ReliabilityMatrix(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t, axisLabel, baseGrid, baseTooltip, legendStyle, valueAxis } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);

  const built = useMemo<{ option: EChartsOption; teams: TeamReliability[] } | null>(() => {
    const rows = filteredSeasonRows(query.data?.items, props.entities, filters);
    if (!rows.length) return null;

    const byTeam = new Map<number, TeamReliability>();
    for (const r of rows) {
      let t = byTeam.get(r.team_id);
      if (!t) {
        t = { name: r.team_name, starts: 0, mechanical: 0, incident: 0, other: 0, total: 0 };
        byTeam.set(r.team_id, t);
      }
      t.starts += 1;
      const bucket = statusBucket(r.status);
      if (bucket !== "finish") {
        t[bucket] += 1;
        t.total += 1;
      }
    }
    const teams = [...byTeam.values()].sort(
      (a, b) => b.total - a.total || a.name.localeCompare(b.name),
    );
    if (!teams.some((t) => t.total > 0)) return null;

    const option: EChartsOption = {
      animationDuration: 300,
      grid: { ...baseGrid, right: 30, bottom: 22 },
      legend: { ...legendStyle, data: BUCKETS.map((b) => b.label) },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (ps: any) => {
          const t = teams[ps[0]?.dataIndex];
          if (!t) return "";
          const finishRate = Math.round(((t.starts - t.total) / t.starts) * 100);
          return (
            `<b>${t.name}</b><br/>` +
            `<span style="font-family:${MONO};font-size:10px">` +
            `MECH ${t.mechanical} · INCIDENT ${t.incident} · OTHER ${t.other}<br/>` +
            `${t.total} DNF / ${t.starts} STARTS · ${finishRate}% FINISH RATE</span>`
          );
        },
      },
      xAxis: valueAxis({ minInterval: 1 }),
      yAxis: {
        type: "category",
        inverse: true,
        data: teams.map((t) => t.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, fontSize: 9, width: 104, overflow: "truncate" },
      },
      series: [
        ...BUCKETS.map((b) => ({
          name: b.label,
          type: "bar" as const,
          stack: "dnf",
          barMaxWidth: 14,
          itemStyle: { color: t.fallbackSeries[b.slot], borderColor: t.surface, borderWidth: 1 },
          emphasis: { focus: "series" as const },
          data: teams.map((team) => team[b.key]),
        })),
        {
          // invisible stack cap that anchors the total label at the bar end
          type: "bar" as const,
          stack: "dnf",
          silent: true,
          itemStyle: { color: "transparent" },
          label: {
            show: true,
            position: "right",
            distance: 4,
            color: t.inkSub,
            fontFamily: MONO,
            fontSize: 9,
            formatter: (p: any) => String(teams[p.dataIndex]?.total ?? ""),
          },
          data: teams.map(() => 0),
        },
      ],
    };
    return { option, teams };
  }, [query.data, filters, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Season · Reliability"
      title="Retirements by cause"
      subtitle={`${filters.year} · race status buckets`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !built}
      emptyText="No retirements in the current selection — every entry was classified as a finish."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {built && <EChart option={built.option} />}
    </AnalyticsCard>
  );
}

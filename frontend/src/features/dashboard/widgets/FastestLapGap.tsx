/** Fastest-lap gap for the focused round — horizontal bars, fastest first.
 *  Uses the backend's precomputed interval gap (never string comparison).
 *  One entity list → one hue; identity lives in the row labels. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, roundsFromResults, rowsForRound, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { durationToSeconds, driverCode, formatGap, formatLapTime, sanitizeLapSeconds, shortRoundName } from "@/lib/format";

export function FastestLapGap(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t, axisLabel, baseTooltip, valueAxis } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);
  const rounds = useMemo(() => roundsFromResults(query.data?.items), [query.data]);
  const round = focusRound(rounds, filters);
  const roundName = rounds.find((r) => r.number === round)?.name;

  const option = useMemo<EChartsOption | null>(() => {
    const visible = visibleDriverIds(props.entities, filters);
    // Laps are sanitized (bronze mixes race totals/gaps into this column) and
    // the gap is recomputed against the best VALID lap of the session.
    const laps = rowsForRound(query.data?.items, round)
      .filter((r) => visible === null || visible.has(r.driver_id))
      .map((r) => ({
        code: driverCode({ abbreviation: r.driver_abbreviation, surname: r.driver_surname }),
        team: r.team_name,
        lap: sanitizeLapSeconds(durationToSeconds(r.fastest_lap_time)),
      }))
      .filter((r): r is typeof r & { lap: number } => r.lap != null)
      .sort((a, b) => a.lap - b.lap);
    if (!laps.length) return null;
    const best = laps[0].lap;
    const rows = laps.map((r, i) => ({ ...r, gap: r.lap - best, rank: i + 1 }));

    return {
      animationDuration: 300,
      grid: { left: 8, right: 52, top: 4, bottom: 4, containLabel: true },
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (p: any) => {
          const r = rows[p.dataIndex];
          return (
            `<b>${r.code}</b> — ${r.team}<br/>` +
            `<span style="font-family:${MONO};font-size:10px">LAP ${formatLapTime(r.lap)} · GAP ${formatGap(r.gap)} · RANK ${r.rank}</span>`
          );
        },
      },
      xAxis: valueAxis({
        axisLabel: { ...axisLabel, formatter: (v: number) => `+${v.toFixed(1)}s` },
      }),
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map((r) => r.code),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, fontSize: 10 },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: t.blue, borderRadius: [0, 3, 3, 0] },
          emphasis: { itemStyle: { color: t.blueEmphasis } },
          label: {
            show: true,
            position: "right",
            distance: 4,
            color: t.inkSub,
            fontFamily: MONO,
            fontSize: 9,
            formatter: (p: any) => formatGap(rows[p.dataIndex].gap),
          },
          data: rows.map((r) => r.gap),
        },
      ],
    };
  }, [query.data, round, filters, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Session · Fastest laps"
      title="Gap to fastest"
      subtitle={round ? `R${round} ${shortRoundName(roundName)}` : undefined}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No plausible fastest-lap times for this session (implausible source values are excluded)."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

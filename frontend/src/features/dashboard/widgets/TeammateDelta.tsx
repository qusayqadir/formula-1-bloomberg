/** Teammate gap — the intra-team benchmark. One bar per team: the average
 *  finishing-position gap between its two main drivers over rounds where
 *  BOTH took a classified finish (DNF retirement order never pollutes it).
 *  Bars wear the team identity color; the pair label carries who leads. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { inRoundRange, statusBucket } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { driverCode } from "@/lib/format";

interface PairRow {
  teamId: number;
  teamName: string;
  leaderCode: string;
  trailCode: string;
  gap: number;
  shared: number;
  avgLeader: number;
  avgTrail: number;
  leaderAhead: number;
}

export function TeammateDelta(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t, axisLabel, baseGrid, baseTooltip, valueAxis } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);

  const pairs = useMemo<PairRow[]>(() => {
    // Round range + team filter only: a driver filter would break the pairs.
    const rows = (query.data?.items ?? []).filter(
      (r) =>
        inRoundRange(r.round_number, filters) &&
        (filters.teamIds.length === 0 || filters.teamIds.includes(r.team_id)),
    );
    const teams = new Map<
      number,
      { name: string; drivers: Map<number, { code: string; finishes: Map<number, number> }> }
    >();
    for (const r of rows) {
      if (r.round_number == null) continue;
      let team = teams.get(r.team_id);
      if (!team) {
        team = { name: r.team_name, drivers: new Map() };
        teams.set(r.team_id, team);
      }
      let driver = team.drivers.get(r.driver_id);
      if (!driver) {
        driver = {
          code: driverCode({ abbreviation: r.driver_abbreviation, surname: r.driver_surname }),
          finishes: new Map(),
        };
        team.drivers.set(r.driver_id, driver);
      }
      if (r.position != null && statusBucket(r.status) === "finish") {
        driver.finishes.set(r.round_number, r.position);
      }
    }

    const result: PairRow[] = [];
    for (const [teamId, team] of teams) {
      // Most-shared pair wins (mid-season swaps produce 3+ drivers).
      const drivers = [...team.drivers.values()];
      let best: { a: (typeof drivers)[0]; b: (typeof drivers)[0]; shared: number[] } | null = null;
      for (let i = 0; i < drivers.length; i++) {
        for (let j = i + 1; j < drivers.length; j++) {
          const shared = [...drivers[i].finishes.keys()].filter((round) =>
            drivers[j].finishes.has(round),
          );
          if (!best || shared.length > best.shared.length) {
            best = { a: drivers[i], b: drivers[j], shared };
          }
        }
      }
      if (!best || best.shared.length < 3) continue;
      const shared = best.shared;
      const mean = (d: (typeof drivers)[0]) =>
        shared.reduce((sum, round) => sum + (d.finishes.get(round) ?? 0), 0) / shared.length;
      let [leader, trail] = [best.a, best.b];
      if (mean(trail) < mean(leader)) [leader, trail] = [trail, leader];
      const avgLeader = mean(leader);
      const avgTrail = mean(trail);
      const leaderAhead = shared.filter(
        (round) => (leader.finishes.get(round) ?? 99) < (trail.finishes.get(round) ?? 99),
      ).length;
      result.push({
        teamId,
        teamName: team.name,
        leaderCode: leader.code,
        trailCode: trail.code,
        gap: avgTrail - avgLeader,
        shared: best.shared.length,
        avgLeader,
        avgTrail,
        leaderAhead,
      });
    }
    return result.sort((a, b) => b.gap - a.gap);
  }, [query.data, filters]);

  const option = useMemo<EChartsOption | null>(() => {
    if (!pairs.length) return null;
    return {
      animationDuration: 300,
      grid: { ...baseGrid, right: 36 },
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (p: any) => {
          const r = pairs[p.dataIndex];
          return (
            `<b>${r.teamName}</b><br/>` +
            `<span style="font-family:${MONO};font-size:10px">` +
            `${r.leaderCode} AVG P${r.avgLeader.toFixed(1)} · ${r.trailCode} AVG P${r.avgTrail.toFixed(1)}<br/>` +
            `H2H ${r.leaderAhead}–${r.shared - r.leaderAhead} OVER ${r.shared} SHARED FINISHES</span>`
          );
        },
      },
      xAxis: valueAxis({
        axisLabel: { ...axisLabel, formatter: (v: number) => v.toFixed(1) },
      }),
      yAxis: {
        type: "category",
        inverse: true,
        data: pairs.map((r) => `${r.leaderCode} ▸ ${r.trailCode}`),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, fontSize: 10 },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 14,
          data: pairs.map((r) => ({
            value: r.gap,
            itemStyle: {
              color: props.entities.teamById.get(r.teamId)?.color ?? t.blue,
              borderRadius: [0, 3, 3, 0],
            },
          })),
          label: {
            show: true,
            position: "right",
            distance: 4,
            color: t.inkSub,
            fontFamily: MONO,
            fontSize: 9,
            formatter: (p: any) => `+${pairs[p.dataIndex].gap.toFixed(1)}`,
          },
        },
      ],
    };
  }, [pairs, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Season · Intra-team"
      title="Teammate gap"
      subtitle={`${filters.year} · avg finish delta · shared classified finishes`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No teammate pair shares 3+ classified finishes in the current selection."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

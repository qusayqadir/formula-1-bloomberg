/** Teammate gap — the intra-team benchmark. One dithered bar per team: the
 *  average finishing-position gap between its two main drivers over rounds
 *  where BOTH took a classified finish (DNF retirement order never pollutes
 *  it). The pair label carries who leads. */
import { useMemo } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Bar, BarChart, Grid, Tooltip, XAxis, YAxis } from "@/components/dither-kit";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { inRoundRange, statusBucket } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { driverCode } from "@/lib/format";

const CONFIG = { gap: { label: "Avg finish gap", color: "pink" } } as const;

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

  const rows = useMemo(
    () =>
      pairs.map((r) => ({
        pair: `${r.leaderCode}▸${r.trailCode}`,
        gap: Number(r.gap.toFixed(2)),
      })),
    [pairs],
  );

  return (
    <AnalyticsCard
      eyebrow="Season · Intra-team"
      title="Teammate gap"
      subtitle={`${filters.year} · avg finish delta · shared classified finishes`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && rows.length === 0}
      emptyText="No teammate pair shares 3+ classified finishes in the current selection."
      expandable
      className={props.className}
      bodyClassName="p-3"
    >
      {rows.length > 0 && (
        <BarChart data={rows} config={CONFIG} bloom="low">
          <Grid />
          <XAxis dataKey="pair" maxTicks={rows.length} tickFormatter={(v) => String(v).split("▸")[0]} />
          <YAxis tickFormatter={(v) => v.toFixed(1)} />
          <Tooltip labelKey="pair" valueFormatter={(v) => `+${v.toFixed(2)} avg positions`} />
          <Bar dataKey="gap" variant="gradient" />
        </BarChart>
      )}
    </AnalyticsCard>
  );
}

/** Fastest-lap gap for the focused round — dither-kit bars, fastest first.
 *  Laps are sanitized (bronze mixes race totals/gaps into this column) and
 *  the gap is recomputed against the best VALID lap of the session. */
import { useMemo } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Bar, BarChart, Grid, Tooltip, XAxis, YAxis } from "@/components/dither-kit";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, roundsFromResults, rowsForRound, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { durationToSeconds, driverCode, sanitizeLapSeconds, shortRoundName } from "@/lib/format";
import type { SessionType } from "@/lib/types";

const CONFIG = { gap: { label: "Gap to fastest (s)", color: "blue" } } as const;

export function FastestLapGap(props: {
  entities: SeasonEntities;
  className?: string;
  sessionType?: SessionType;
}) {
  const { filters } = useFilters();
  const session = props.sessionType ?? filters.sessionType;
  const query = useSeasonResults(filters.year, session);
  const rounds = useMemo(() => roundsFromResults(query.data?.items), [query.data]);
  const round = focusRound(rounds, filters);
  const roundName = rounds.find((r) => r.number === round)?.name;

  const rows = useMemo(() => {
    const visible = visibleDriverIds(props.entities, filters);
    const laps = rowsForRound(query.data?.items, round)
      .filter((r) => visible === null || visible.has(r.driver_id))
      .map((r) => ({
        code: driverCode({ abbreviation: r.driver_abbreviation, surname: r.driver_surname }),
        lap: sanitizeLapSeconds(durationToSeconds(r.fastest_lap_time)),
      }))
      .filter((r): r is { code: string; lap: number } => r.lap != null)
      .sort((a, b) => a.lap - b.lap);
    if (!laps.length) return [];
    const best = laps[0].lap;
    return laps.map((r) => ({ code: r.code, gap: Number((r.lap - best).toFixed(3)) }));
  }, [query.data, round, filters, props.entities]);

  return (
    <AnalyticsCard
      eyebrow={`${session} · Fastest laps`}
      title="Gap to fastest"
      subtitle={round ? `R${round} ${shortRoundName(roundName)}` : undefined}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && rows.length === 0}
      emptyText="No plausible fastest-lap times for this session (implausible source values are excluded)."
      expandable
      className={props.className}
      bodyClassName="p-3"
    >
      {rows.length > 0 && (
        <BarChart data={rows} config={CONFIG} bloom="low">
          <Grid />
          <XAxis dataKey="code" />
          <YAxis />
          <Tooltip labelKey="code" />
          <Bar dataKey="gap" variant="gradient" />
        </BarChart>
      )}
    </AnalyticsCard>
  );
}

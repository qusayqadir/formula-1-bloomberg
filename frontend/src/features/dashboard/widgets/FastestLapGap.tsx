/** Fastest-lap gap for the focused round. Race keeps the dither-kit bar
 *  chart; Sprint renders as a dense text list instead (same typography as
 *  the qualifying segment-times sheet) since a handful of sprint laps don't
 *  carry enough visual weight to justify a chart. Laps are sanitized
 *  (bronze mixes race totals/gaps into this column) and the gap is
 *  recomputed against the best VALID lap of the session. */
import { useMemo } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Bar, BarChart, Grid, Tooltip, XAxis, YAxis } from "@/components/dither-kit";
import { useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, roundsFromResults, rowsForRound, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { durationToSeconds, driverCode, formatGap, sanitizeLapSeconds, sessionLabel, shortRoundName } from "@/lib/format";
import type { SessionType } from "@/lib/types";

const CONFIG = { gap: { label: "Gap to fastest (s)", color: "blue" } } as const;

export function FastestLapGap(props: {
  entities: SeasonEntities;
  className?: string;
  sessionType?: SessionType;
}) {
  const { filters } = useFilters();
  const session = props.sessionType ?? filters.sessionType;
  const asList = session === "Sprint";
  const { t } = useChartTheme();
  const query = useSeasonResults(filters.year, session);
  const rounds = useMemo(() => roundsFromResults(query.data?.items), [query.data]);
  const round = focusRound(rounds, filters);
  const roundName = rounds.find((r) => r.number === round)?.name;

  const rows = useMemo(() => {
    const visible = visibleDriverIds(props.entities, filters);
    const laps = rowsForRound(query.data?.items, round)
      .filter((r) => visible === null || visible.has(r.driver_id))
      .map((r) => ({
        driverId: r.driver_id,
        code: driverCode({ abbreviation: r.driver_abbreviation, surname: r.driver_surname }),
        teamName: r.team_name,
        lap: sanitizeLapSeconds(durationToSeconds(r.fastest_lap_time)),
      }))
      .filter((r): r is { driverId: number; code: string; teamName: string; lap: number } => r.lap != null)
      .sort((a, b) => a.lap - b.lap);
    if (!laps.length) return [];
    const best = laps[0].lap;
    return laps.map((r) => ({ ...r, gap: Number((r.lap - best).toFixed(3)) }));
  }, [query.data, round, filters, props.entities]);

  return (
    <AnalyticsCard
      eyebrow={`${sessionLabel(session)} · Fastest laps`}
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
      bodyClassName={asList ? "overflow-auto" : "p-3"}
    >
      {rows.length > 0 &&
        (asList ? (
          <table className="w-full min-w-[360px] border-collapse font-mono text-[12px] tabular-nums">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-stroke text-left">
                {["POS", "DRIVER", "TEAM", "GAP"].map((label, i) => (
                  <th
                    key={label}
                    className={`whitespace-nowrap px-3 py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut ${
                      i === 3 ? "text-right" : ""
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const driver = props.entities.driverById.get(r.driverId);
                return (
                  <tr key={r.driverId} className="border-b border-stroke/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className={`font-semibold ${i === 0 ? "text-accent" : "text-ink"}`}>P{i + 1}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-[2px] align-middle"
                        style={{ background: driver?.color ?? t.neutral }}
                        aria-hidden
                      />
                      <span className="font-sans font-medium text-ink">{driver?.code ?? r.code}</span>
                    </td>
                    <td className="max-w-32 truncate whitespace-nowrap px-3 py-2 font-sans text-sub">{r.teamName}</td>
                    <td className={`px-3 py-2 text-right ${i === 0 ? "text-accent" : "text-sub"}`}>{formatGap(r.gap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <BarChart data={rows} config={CONFIG} bloom="low">
            <Grid />
            <XAxis dataKey="code" />
            <YAxis />
            <Tooltip labelKey="code" />
            <Bar dataKey="gap" variant="gradient" />
          </BarChart>
        ))}
    </AnalyticsCard>
  );
}

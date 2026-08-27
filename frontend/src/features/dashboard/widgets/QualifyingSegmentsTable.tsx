/** Q1/Q2/Q3 times table for the focused round — times only, no grid/points/
 *  laps/status (those fields don't exist at qualifying-segment grain). */
import { useMemo } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { useChartTheme } from "@/components/charts/theme";
import { useQualifyingSegments, useSeasonRounds } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { driverCode, durationToSeconds, formatLapTime, sanitizeLapSeconds, shortRoundName } from "@/lib/format";

export function QualifyingSegmentsTable(props: { entities: SeasonEntities; className?: string }) {
  const { filters, toggleDriver } = useFilters();
  const { t } = useChartTheme();

  const roundsQuery = useSeasonRounds(filters.year);
  const rounds = useMemo(
    () =>
      (roundsQuery.data?.items ?? [])
        .filter((r) => r.number != null)
        .map((r) => ({ number: r.number as number, name: r.name })),
    [roundsQuery.data],
  );
  const round = focusRound(rounds, filters);
  const roundName = rounds.find((r) => r.number === round)?.name;

  const query = useQualifyingSegments(filters.year, round);

  const rows = useMemo(() => {
    const visible = visibleDriverIds(props.entities, filters);
    return (query.data?.rows ?? [])
      .filter((r) => visible === null || visible.has(r.driver.id))
      .sort((a, b) => (a.final_position ?? 99) - (b.final_position ?? 99));
  }, [query.data, filters, props.entities]);

  return (
    <AnalyticsCard
      eyebrow="Qualifying · Segment times"
      title="Q1 / Q2 / Q3 Times"
      subtitle={round ? `R${round} ${shortRoundName(roundName)}` : undefined}
      loading={query.isPending || roundsQuery.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && rows.length === 0}
      emptyText="No qualifying segment times for this round."
      expandable
      className={props.className}
      bodyClassName="overflow-auto"
    >
      <table className="w-full min-w-[420px] border-collapse font-mono text-[11px] tabular-nums">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-stroke text-left">
            {["POS", "DRIVER", "TEAM", "Q1", "Q2", "Q3"].map((label, i) => (
              <th
                key={label}
                className={`whitespace-nowrap px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-mut ${
                  i >= 3 ? "text-right" : ""
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const driver = props.entities.driverById.get(r.driver.id);
            const selected = filters.driverIds.includes(r.driver.id);
            return (
              <tr
                key={r.driver.id}
                onClick={() => toggleDriver(r.driver.id)}
                title="Toggle driver filter"
                className={`cursor-pointer border-b border-stroke/60 transition-colors last:border-0 hover:bg-ink/[0.04] ${
                  selected ? "bg-accent/[0.06]" : ""
                }`}
              >
                <td className="px-2 py-1">
                  <span className={`font-semibold ${r.final_position === 1 ? "text-accent" : "text-ink"}`}>
                    {r.final_position != null ? `P${r.final_position}` : "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-[2px] align-middle" style={{ background: driver?.color ?? t.neutral }} aria-hidden />
                  <span className="font-sans text-ink">{driver?.code ?? driverCode(r.driver)}</span>
                </td>
                <td className="max-w-28 truncate whitespace-nowrap px-2 py-1 font-sans text-sub">{r.team.name}</td>
                <td className="px-2 py-1 text-right text-sub">{formatLapTime(sanitizeLapSeconds(durationToSeconds(r.q1_time)))}</td>
                <td className="px-2 py-1 text-right text-sub">{formatLapTime(sanitizeLapSeconds(durationToSeconds(r.q2_time)))}</td>
                <td className="px-2 py-1 text-right text-sub">{formatLapTime(sanitizeLapSeconds(durationToSeconds(r.q3_time)))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AnalyticsCard>
  );
}

/** Q1/Q2/Q3 times table for the focused round — times only, no grid/points/
 *  laps/status (those fields don't exist at qualifying-segment grain). Gap
 *  is each driver's last valid segment time (their final effort, whichever
 *  segment it landed in) vs. the pole time. */
import { useMemo } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { useChartTheme } from "@/components/charts/theme";
import { useQualifyingSegments, useSeasonRounds } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { driverCode, durationToSeconds, formatGap, formatLapTime, sanitizeLapSeconds, shortRoundName } from "@/lib/format";

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
    const built = (query.data?.rows ?? [])
      .filter((r) => visible === null || visible.has(r.driver.id))
      .map((r) => {
        const q1 = sanitizeLapSeconds(durationToSeconds(r.q1_time));
        const q2 = sanitizeLapSeconds(durationToSeconds(r.q2_time));
        const q3 = sanitizeLapSeconds(durationToSeconds(r.q3_time));
        return { ...r, q1, q2, q3, finalTime: q3 ?? q2 ?? q1 };
      })
      .sort((a, b) => (a.final_position ?? 99) - (b.final_position ?? 99));
    const pole = built.find((r) => r.final_position === 1)?.finalTime ?? built[0]?.finalTime ?? null;
    return { built, pole };
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
      empty={!query.isPending && !query.error && rows.built.length === 0}
      emptyText="No qualifying segment times for this round."
      expandable
      className={props.className}
      bodyClassName="overflow-auto"
    >
      <table className="w-full min-w-[520px] border-collapse font-mono text-[12px] tabular-nums">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-stroke text-left">
            {["POS", "DRIVER", "TEAM", "Q1", "Q2", "Q3", "GAP"].map((label, i) => (
              <th
                key={label}
                className={`whitespace-nowrap px-3 py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut ${
                  i >= 3 ? "text-right" : ""
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.built.map((r) => {
            const driver = props.entities.driverById.get(r.driver.id);
            const selected = filters.driverIds.includes(r.driver.id);
            const gap = r.finalTime != null && rows.pole != null ? r.finalTime - rows.pole : null;
            return (
              <tr
                key={r.driver.id}
                onClick={() => toggleDriver(r.driver.id)}
                title="Toggle driver filter"
                className={`cursor-pointer border-b border-stroke/60 transition-colors last:border-0 hover:bg-ink/[0.05] ${
                  selected ? "bg-accent/[0.07]" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <span className={`font-semibold ${r.final_position === 1 ? "text-accent" : "text-ink"}`}>
                    {r.final_position != null ? `P${r.final_position}` : "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-[2px] align-middle" style={{ background: driver?.color ?? t.neutral }} aria-hidden />
                  <span className="font-sans font-medium text-ink">{driver?.code ?? driverCode(r.driver)}</span>
                </td>
                <td className="max-w-32 truncate whitespace-nowrap px-3 py-2 font-sans text-sub">{r.team.name}</td>
                <td className="px-3 py-2 text-right text-sub">{formatLapTime(r.q1)}</td>
                <td className="px-3 py-2 text-right text-sub">{formatLapTime(r.q2)}</td>
                <td className="px-3 py-2 text-right text-sub">{formatLapTime(r.q3)}</td>
                <td className={`px-3 py-2 text-right ${r.final_position === 1 ? "text-accent" : "text-sub"}`}>
                  {gap != null ? formatGap(gap) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AnalyticsCard>
  );
}

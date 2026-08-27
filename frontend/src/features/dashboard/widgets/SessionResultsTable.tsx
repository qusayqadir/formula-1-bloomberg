/** Dense classification table for the focused round — straight off the
 *  session-results dataset. Row click commits the driver to global filters. */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { useChartTheme } from "@/components/charts/theme";
import { withAlpha } from "@/lib/colors";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, roundsFromResults, rowsForRound, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { durationToSeconds, formatLapTime, formatPoints, sanitizeLapSeconds, sessionLabel, shortRoundName } from "@/lib/format";
import type { SessionResult, SessionType } from "@/lib/types";

type SortKey = "position" | "grid" | "points" | "laps_completed" | "fastest_lap" | "delta";

const COLUMNS: { key: SortKey | null; label: string; align?: "right" }[] = [
  { key: "position", label: "POS" },
  { key: null, label: "DRIVER" },
  { key: null, label: "TEAM" },
  { key: "grid", label: "GRID", align: "right" },
  { key: "delta", label: "+/−", align: "right" },
  { key: "points", label: "PTS", align: "right" },
  { key: "laps_completed", label: "LAPS", align: "right" },
  { key: "fastest_lap", label: "FASTEST", align: "right" },
  { key: null, label: "STATUS" },
];

function sortValue(row: SessionResult, key: SortKey): number {
  switch (key) {
    case "fastest_lap":
      return sanitizeLapSeconds(durationToSeconds(row.fastest_lap_time)) ?? Infinity;
    case "delta":
      return -(row.positions_gained ?? -99);
    case "position":
      return row.position ?? 90 + (row.is_classified ? 0 : 5);
    default:
      return (row[key] as number | null) ?? -1;
  }
}

export function SessionResultsTable(props: {
  entities: SeasonEntities;
  className?: string;
  sessionType?: SessionType;
}) {
  const { filters, toggleDriver } = useFilters();
  const session = props.sessionType ?? filters.sessionType;
  const { t } = useChartTheme();
  const query = useSeasonResults(filters.year, session);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "position", dir: 1 });

  const rounds = useMemo(() => roundsFromResults(query.data?.items), [query.data]);
  const round = focusRound(rounds, filters);
  const roundName = rounds.find((r) => r.number === round)?.name;

  const rows = useMemo(() => {
    const visible = visibleDriverIds(props.entities, filters);
    const base = rowsForRound(query.data?.items, round).filter(
      (r) => visible === null || visible.has(r.driver_id),
    );
    return [...base].sort((a, b) => (sortValue(a, sort.key) - sortValue(b, sort.key)) * sort.dir);
  }, [query.data, round, filters, props.entities, sort]);

  // best VALID lap of the shown session (source fastest_lap_rank is polluted
  // by race-total/gap values, so the FL marker is derived, not read)
  const bestLap = useMemo(() => {
    const valid = rows
      .map((r) => sanitizeLapSeconds(durationToSeconds(r.fastest_lap_time)))
      .filter((v): v is number => v != null);
    return valid.length ? Math.min(...valid) : null;
  }, [rows]);

  const clickSort = (key: SortKey | null) => {
    if (!key) return;
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  };

  return (
    <AnalyticsCard
      eyebrow={`${sessionLabel(session)} · Classification`}
      title={shortRoundName(roundName) || `${sessionLabel(session)} results`}
      subtitle={round ? `R${round} · ${sessionLabel(session)} · ${filters.year}` : String(filters.year)}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && rows.length === 0}
      emptyText={`No ${sessionLabel(session)} entries for this selection.`}
      expandable
      className={props.className}
      bodyClassName="overflow-auto"
    >
      <table className="w-full min-w-[560px] border-collapse font-mono text-[11px] tabular-nums">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-stroke text-left">
            {COLUMNS.map((c) => (
              <th
                key={c.label}
                onClick={() => clickSort(c.key)}
                aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                className={`whitespace-nowrap px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-mut ${
                  c.align === "right" ? "text-right" : ""
                } ${c.key ? "cursor-pointer select-none hover:text-sub" : ""}`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {c.label}
                  {sort.key === c.key &&
                    (sort.dir === 1 ? <ArrowUp size={9} /> : <ArrowDown size={9} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const driver = props.entities.driverById.get(r.driver_id);
            const selected = filters.driverIds.includes(r.driver_id);
            const delta = r.positions_gained;
            return (
              <tr
                key={r.id}
                onClick={() => toggleDriver(r.driver_id)}
                title="Toggle driver filter"
                className={`cursor-pointer border-b border-stroke/60 transition-colors last:border-0 hover:bg-ink/[0.04] ${
                  selected ? "bg-accent/[0.06]" : ""
                }`}
              >
                <td className="px-2 py-1">
                  <span className={`font-semibold ${r.position === 1 ? "text-accent" : "text-ink"}`}>
                    {r.position ?? r.position_text ?? "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-[2px] align-middle" style={{ background: driver?.color ?? t.neutral }} aria-hidden />
                  <span className="font-sans text-ink">{driver?.code ?? r.driver_abbreviation ?? r.driver_surname}</span>
                  <span className="ml-1.5 hidden font-sans text-sub xl:inline">{r.driver_surname}</span>
                </td>
                <td className="max-w-28 truncate whitespace-nowrap px-2 py-1 font-sans text-sub">{r.team_name}</td>
                <td className="px-2 py-1 text-right text-sub">{r.grid && r.grid > 0 ? r.grid : "PL"}</td>
                <td className={`px-2 py-1 text-right font-semibold ${delta == null ? "text-mut" : delta > 0 ? "text-pos" : delta < 0 ? "text-neg" : "text-mut"}`}>
                  {delta == null ? "—" : delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : "="}
                </td>
                <td className="px-2 py-1 text-right text-ink">{formatPoints(r.points)}</td>
                <td className="px-2 py-1 text-right text-sub">{r.laps_completed ?? "—"}</td>
                <td className="px-2 py-1 text-right text-sub">
                  {(() => {
                    const lap = sanitizeLapSeconds(durationToSeconds(r.fastest_lap_time));
                    return (
                      <>
                        {formatLapTime(lap)}
                        {lap != null && lap === bestLap && (
                          <span
                            className="ml-1 rounded-sm px-1 font-semibold"
                            style={{
                              background: withAlpha(t.fallbackSeries[6], 0.16),
                              color: t.fallbackSeries[6],
                            }}
                          >
                            FL
                          </span>
                        )}
                      </>
                    );
                  })()}
                </td>
                <td className="max-w-32 truncate whitespace-nowrap px-2 py-1 font-sans text-sub">
                  {r.status ?? (r.is_classified ? "Finished" : "—")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AnalyticsCard>
  );
}

/** Driver × round performance matrix over the season-results dataset — same
 *  sticky-table language as the circuit × driver matrix (CircuitMatrix.tsx):
 *  sequential cell shading (bright = better), exact values in every cell.
 *  Column-header click focuses that round; row-label click toggles the
 *  driver filter (same pattern as the other classification tables). */
import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Segmented } from "@/components/ui/controls";
import { useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { filteredSeasonRows, roundsFromResults } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { isDarkFill, seqColor, withAlpha } from "@/lib/colors";
import { durationToSeconds, sanitizeLapSeconds, shortRoundName } from "@/lib/format";
import type { SessionResult } from "@/lib/types";

type Metric = "finish" | "grid" | "points" | "flrank";

const METRICS: Record<
  Metric,
  { label: string; value: (r: SessionResult) => number | null; lowerIsBetter: boolean; format: (v: number | null) => string }
> = {
  finish: { label: "FIN", value: (r) => r.position, lowerIsBetter: true, format: (v) => (v == null ? "—" : `P${v}`) },
  grid: { label: "GRID", value: (r) => (r.grid && r.grid > 0 ? r.grid : null), lowerIsBetter: true, format: (v) => (v == null ? "—" : `P${v}`) },
  points: { label: "PTS", value: (r) => r.points, lowerIsBetter: false, format: (v) => (v == null ? "—" : String(v)) },
  // source fastest_lap_rank ranks polluted values — derived per round instead
  flrank: { label: "FL RANK", value: () => null, lowerIsBetter: true, format: (v) => (v == null ? "—" : `P${v}`) },
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
  const { t } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);

  const model = useMemo(() => {
    const rows = filteredSeasonRows(query.data?.items, props.entities, filters);
    if (!rows.length) return null;
    const rounds = roundsFromResults(rows);
    const driverIds = new Set(rows.map((r) => r.driver_id));
    // rows ordered by championship points (entities are pre-sorted desc)
    const drivers = props.entities.drivers.filter((d) => driverIds.has(d.id));
    if (!drivers.length || !rounds.length) return null;

    const circuitByRound = new Map<number, string>();
    for (const r of rows) {
      if (r.round_number != null && !circuitByRound.has(r.round_number)) circuitByRound.set(r.round_number, r.circuit_name);
    }

    const spec = METRICS[metric];
    const flRanks = metric === "flrank" ? computeFlRanks(rows) : null;
    const byKey = new Map<string, number>();
    for (const r of rows) {
      if (r.round_number == null) continue;
      const v = flRanks ? (flRanks.get(`${r.driver_id}:${r.round_number}`) ?? null) : spec.value(r);
      if (v == null) continue;
      byKey.set(`${r.driver_id}:${r.round_number}`, v);
    }
    if (!byKey.size) return null;

    const values = [...byKey.values()];
    const min = Math.min(...values);
    const max = Math.max(...values);
    /* Fill fades with value so weak cells recede into the surface instead of
     * reading as a wall of pills; sqrt eases the skew (one dominant driver
     * would otherwise flatten everyone else to the bottom of the ramp). */
    const shade = (v: number | null): { bg: string; strength: number } | null => {
      if (v == null || max === min) return null;
      const x = (v - min) / (max - min);
      const strength = Math.sqrt(spec.lowerIsBetter ? 1 - x : x);
      return { bg: seqColor(strength, t.seqRamp), strength };
    };
    return { rounds, drivers, byKey, circuitByRound, shade, spec };
  }, [query.data, props.entities, filters, metric, t]);

  return (
    <AnalyticsCard
      eyebrow="Season · Results matrix"
      title="Driver results heatmap"
      subtitle="click a round to focus it · click a driver code to filter"
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
      empty={!query.isPending && !query.error && !model}
      expandable
      className={props.className}
      bodyClassName="overflow-auto"
    >
      {model && (
        <table className="border-collapse font-mono text-[11px] tabular-nums">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[130px] bg-surface px-3 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-[0.12em] text-mut">
                Driver
              </th>
              {model.rounds.map((r) => (
                <th
                  key={r.number}
                  onClick={() => set({ round: r.number })}
                  title={`R${r.number} ${shortRoundName(r.name)} — ${model.circuitByRound.get(r.number) ?? ""}`}
                  className="sticky top-0 z-10 min-w-[92px] cursor-pointer bg-surface px-2 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-wider text-mut hover:text-sub"
                >
                  R{r.number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.drivers.map((d) => {
              const selected = filters.driverIds.includes(d.id);
              return (
                <tr
                  key={d.id}
                  onClick={() => toggleDriver(d.id)}
                  title="Toggle driver filter"
                  className={`group cursor-pointer transition-colors hover:bg-ink/[0.05] ${selected ? "bg-accent/[0.07]" : ""}`}
                >
                  <th className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-1 text-left text-[13px] font-semibold text-sub group-hover:text-ink">
                    <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: d.color }} />
                    {d.code}
                  </th>
                  {model.rounds.map((r) => {
                    const v = model.byKey.get(`${d.id}:${r.number}`) ?? null;
                    return (
                      <td key={r.number} className="px-1 py-1">
                        {v != null ? (
                          <span
                            className="block rounded-sm px-1.5 py-1 text-center text-ink"
                            style={(() => {
                              const s = model.shade(v);
                              if (!s) return undefined;
                              /* strong cells get the solid ramp color with
                               * contrast-picked text; weak ones a translucent
                               * wash with normal ink. */
                              if (s.strength >= 0.55) {
                                return {
                                  background: s.bg,
                                  color: isDarkFill(s.bg) ? "#f2f4f7" : "#16181d",
                                };
                              }
                              return { background: withAlpha(s.bg, 0.12 + 0.7 * s.strength) };
                            })()}
                          >
                            {model.spec.format(v)}
                          </span>
                        ) : (
                          <span className="block text-center text-mut/50">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </AnalyticsCard>
  );
}

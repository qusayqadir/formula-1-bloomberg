/** Circuit × driver performance matrix over a five-season window — the
 *  circuit-performance dataset pivoted client-side. Sticky labels, sequential
 *  cell shading (bright = better), exact values in every cell. */
import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Segmented } from "@/components/ui/controls";
import { useCircuitDriverMatrix } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import type { CircuitSummaryRow } from "@/lib/types";
import { isDarkFill, seqColor } from "@/lib/colors";
import { useChartTheme } from "@/components/charts/theme";
import { formatNumber, formatPoints } from "@/lib/format";

// avg_finish and classification_rate are excluded: both depend on
// is_classified, which is NULL for every bronze row (documented data gap).
type Metric = "total_points" | "avg_points" | "avg_grid" | "avg_positions_gained" | "avg_fastest_lap_rank";

const METRICS: Record<Metric, { label: string; lowerIsBetter: boolean; format: (v: number | null) => string }> = {
  total_points: { label: "PTS", lowerIsBetter: false, format: (v) => formatPoints(v) },
  avg_points: { label: "AVG PTS", lowerIsBetter: false, format: (v) => formatNumber(v) },
  avg_grid: { label: "AVG GRID", lowerIsBetter: true, format: (v) => formatNumber(v) },
  avg_positions_gained: { label: "+/−", lowerIsBetter: false, format: (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${formatNumber(v)}`) },
  avg_fastest_lap_rank: { label: "FL RANK", lowerIsBetter: true, format: (v) => formatNumber(v) },
};

const WINDOW = 4; // seasons back from the selected year

export function CircuitMatrix(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t } = C;
  const [metric, setMetric] = useState<Metric>("total_points");
  const visible = visibleDriverIds(props.entities, filters);
  // scope the request to the season's grid (or the current selection)
  const driverIds = (visible ? [...visible] : props.entities.drivers.map((d) => d.id)).slice(0, 30);
  const query = useCircuitDriverMatrix(filters.year - WINDOW, filters.year, driverIds);

  const model = useMemo(() => {
    const rows = (query.data?.rows ?? []).filter((r) => r.driver != null);
    if (!rows.length) return null;
    const spec = METRICS[metric];
    const value = (r: CircuitSummaryRow) => r[metric];

    const circuits = [...new Map(rows.map((r) => [r.circuit_id, r.circuit_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
    const driverOrder = props.entities.drivers.filter((d) => rows.some((r) => r.driver?.id === d.id));
    const byKey = new Map(rows.map((r) => [`${r.driver!.id}:${r.circuit_id}`, r]));

    const values = rows.map(value).filter((v): v is number => v != null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const shade = (v: number | null) => {
      if (v == null || max === min) return "transparent";
      const x = (v - min) / (max - min);
      return seqColor(spec.lowerIsBetter ? 1 - x : x, t.seqRamp);
    };
    return { circuits, driverOrder, byKey, shade, spec };
  }, [query.data, metric, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Circuits · Performance"
      title="Circuit × driver matrix"
      subtitle={`${filters.year - WINDOW}–${filters.year} · ${filters.sessionType} aggregates`}
      controls={
        <Segmented
          ariaLabel="Matrix metric"
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
        <table className="border-collapse font-mono text-[10px] tabular-nums">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-surface px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-mut">
                Driver
              </th>
              {model.circuits.map((c) => (
                <th
                  key={c.id}
                  title={c.name}
                  className="sticky top-0 z-10 max-w-16 truncate bg-surface px-1.5 py-1.5 text-left align-bottom text-[8.5px] font-semibold uppercase tracking-wider text-mut"
                >
                  {c.name.replace(/(circuit|international|autodrome|autódromo|de |di )/gi, "").trim().slice(0, 9)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.driverOrder.map((d) => (
              <tr key={d.id} className="group">
                <th className="sticky left-0 z-10 whitespace-nowrap bg-surface px-2 py-0.5 text-left font-medium text-sub group-hover:text-ink">
                  <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: d.color }} />
                  {d.code}
                </th>
                {model.circuits.map((c) => {
                  const row = model.byKey.get(`${d.id}:${c.id}`);
                  const v = row ? (row[metric] as number | null) : null;
                  return (
                    <td
                      key={c.id}
                      title={row ? `${d.code} @ ${c.name}: ${model.spec.label} ${model.spec.format(v)} (${row.starts} starts)` : undefined}
                      className="px-0.5 py-0.5"
                    >
                      {v != null ? (
                        <span
                          className="block rounded-sm px-1 py-0.5 text-center"
                          style={(() => {
                            const bg = model.shade(v);
                            const dark = bg !== "transparent" && isDarkFill(bg);
                            return {
                              background: bg,
                              color: dark ? "#f2f4f7" : "#16181d",
                              textShadow: dark ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
                            };
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
            ))}
          </tbody>
        </table>
      )}
    </AnalyticsCard>
  );
}

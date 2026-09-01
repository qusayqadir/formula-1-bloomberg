/** Track-type over/under-index — points-per-start at each circuit archetype
 *  vs. the entity's own career average, one row per driver/team. Diverging
 *  shading (blue = over-indexes, red = under-indexes) since 0 is a real
 *  baseline here, not an empty cell. Same sticky-table language as the
 *  circuit × driver matrix. 2011 → latest season, independent of the season filter. */
import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Segmented } from "@/components/ui/controls";
import { useChartTheme } from "@/components/charts/theme";
import { mixHex } from "@/lib/colors";
import { useTrackTypeIndex } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { driverCode, formatNumber } from "@/lib/format";

type Entity = "driver" | "team";

export function TrackTypePerformanceMatrix(props: { className?: string }) {
  const C = useChartTheme();
  const { t } = C;
  const { latestYear } = useFilters();
  const [entity, setEntity] = useState<Entity>("driver");
  const query = useTrackTypeIndex(entity);

  const model = useMemo(() => {
    const rows = query.data?.rows ?? [];
    if (!rows.length) return null;

    const trackTypes = [...new Set(rows.map((r) => r.track_type))].sort();
    const byId = new Map<number, { id: number; label: string; color: string; starts: number }>();
    for (const r of rows) {
      const id = entity === "driver" ? r.driver?.id : r.team?.id;
      if (id == null) continue;
      const label = entity === "driver" ? driverCode(r.driver!) : r.team!.name;
      const color = entity === "team" && r.team?.primary_color ? r.team.primary_color : t.blue;
      const existing = byId.get(id);
      if (existing) existing.starts += r.starts;
      else byId.set(id, { id, label, color, starts: r.starts });
    }
    const order = [...byId.values()].sort((a, b) => b.starts - a.starts).slice(0, 30);
    const byKey = new Map(rows.map((r) => [`${(entity === "driver" ? r.driver : r.team)?.id}:${r.track_type}`, r]));

    const maxAbs = Math.max(...rows.map((r) => Math.abs(r.index)), 0.1);

    return { trackTypes, order, byKey, maxAbs };
  }, [query.data, entity, t]);

  return (
    <AnalyticsCard
      eyebrow="Track Type · Over-index"
      title="Track-type performance matrix"
      subtitle={`2011–${latestYear} · pts/start vs. own career average · min 3 starts per cell`}
      controls={
        <Segmented
          ariaLabel="Matrix entity"
          value={entity}
          options={[
            { value: "driver", label: "DRIVERS" },
            { value: "team", label: "TEAMS" },
          ]}
          onChange={setEntity}
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
        <table className="w-full table-fixed border-collapse font-mono text-[11px] tabular-nums">
          <thead>
            <tr>
              {/* Fixed layout + an explicit width on just this column: with
                  only a handful of track-type columns, auto layout dumps all
                  the card's leftover width into whichever column has no cap
                  (the sticky label column), stranding a blank gap before the
                  first data cell. A fixed width here forces the remainder to
                  split evenly across the (unwidthed) data columns instead. */}
              <th className="sticky left-0 top-0 z-20 w-[110px] bg-surface px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-mut">
                {entity === "driver" ? "Driver" : "Team"}
              </th>
              {model.trackTypes.map((tt) => (
                <th
                  key={tt}
                  className="sticky top-0 z-10 bg-surface px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-mut"
                >
                  {tt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.order.map((e) => (
              <tr key={e.id} className="group">
                <th className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-1 text-left text-[13px] font-semibold text-sub group-hover:text-ink">
                  <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: e.color }} />
                  {e.label}
                </th>
                {model.trackTypes.map((tt) => {
                  const row = model.byKey.get(`${e.id}:${tt}`);
                  const idx = row?.index ?? null;
                  const strength = idx == null ? 0 : Math.min(1, Math.abs(idx) / model.maxAbs);
                  const bg = idx == null ? undefined : mixHex(t.surface, idx >= 0 ? t.gained : t.lost, 0.15 + 0.65 * strength);
                  return (
                    <td
                      key={tt}
                      title={row ? `${e.label} @ ${tt}: ${formatNumber(row.avg_points)} avg pts (${row.starts} starts) vs ${formatNumber(row.avg_points_overall)} overall` : undefined}
                      className="px-1 py-1"
                    >
                      {idx != null ? (
                        // Fixed 1 decimal (not formatNumber's zero-stripping)
                        // so every cell in the column lines up the same way
                        // instead of "+0" sitting next to "-0.2".
                        <span className="block rounded-md px-2 py-1 text-center text-ink" style={{ background: bg }}>
                          {idx > 0 ? "+" : ""}
                          {idx.toFixed(1)}
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

/** Driver head-to-head — dedicated comparison dataset (shared sessions only).
 *  Defaults to the top of the standings or the globally selected drivers. */
import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Select } from "@/components/ui/controls";
import { PALETTE, rgb } from "@/components/dither-kit/palette";
import { useHeadToHead } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { durationToSeconds, formatNumber, formatPoints, sanitizeLapSeconds } from "@/lib/format";

/** Fixed dither hues for the two sides — team colors would collide for
 *  teammates, and these match the dither-kit charts around the card. */
const SIDE_A = PALETTE.blue;
const SIDE_B = PALETTE.red;

/** Dithered 2px checker wash over the side hue, so the tally bars read as
 *  part of the dither-kit family without a canvas. */
const ditherFill = (fill: string, line: string) => ({
  background: `repeating-conic-gradient(${line} 0% 25%, ${fill} 0% 50%) 0 0 / 4px 4px`,
});

function TallyBar(props: { a: number; b: number }) {
  const total = props.a + props.b;
  const pctA = total === 0 ? 50 : (props.a / total) * 100;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-inset" aria-hidden>
      <div style={{ width: `${pctA}%`, ...ditherFill(rgb(SIDE_A.fill), rgb(SIDE_A.fill, 1.25)) }} />
      <div className="w-0.5 flex-none bg-surface" />
      <div className="flex-1" style={ditherFill(rgb(SIDE_B.fill), rgb(SIDE_B.fill, 1.25))} />
    </div>
  );
}

export function HeadToHead(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const drivers = props.entities.drivers;
  const [manual, setManual] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });

  // defaults: explicit picks > global selection > championship top two
  const globalSel = filters.driverIds;
  const a = manual.a ?? globalSel[0] ?? drivers[0]?.id ?? null;
  const bCandidate = manual.b ?? globalSel.find((id) => id !== a) ?? null;
  const b = bCandidate ?? drivers.find((d) => d.id !== a)?.id ?? null;

  const query = useHeadToHead(a, b, filters.year, filters.sessionType);
  const da = a != null ? props.entities.driverById.get(a) : undefined;
  const db = b != null ? props.entities.driverById.get(b) : undefined;

  const rows = useMemo(() => {
    const s = query.data?.summary;
    if (!s) return [];
    // bronze is_classified is NULL everywhere, which nulls the API's averages;
    // derive them (and a clean fastest-lap duel) from the per-session rows.
    const sessions = query.data?.rows ?? [];
    const avg = (vals: (number | null)[]) => {
      const v = vals.filter((x): x is number => x != null);
      return v.length ? v.reduce((acc, x) => acc + x, 0) / v.length : null;
    };
    const aAvgFinish = s.a_avg_finish ?? avg(sessions.map((r) => r.a_position));
    const bAvgFinish = s.b_avg_finish ?? avg(sessions.map((r) => r.b_position));
    const aAvgGrid = s.a_avg_grid ?? avg(sessions.map((r) => (r.a_grid && r.a_grid > 0 ? r.a_grid : null)));
    const bAvgGrid = s.b_avg_grid ?? avg(sessions.map((r) => (r.b_grid && r.b_grid > 0 ? r.b_grid : null)));
    const fl = { a: 0, b: 0 };
    for (const r of sessions) {
      const la = sanitizeLapSeconds(durationToSeconds(r.a_fastest_lap_time));
      const lb = sanitizeLapSeconds(durationToSeconds(r.b_fastest_lap_time));
      if (la == null || lb == null || la === lb) continue;
      if (la < lb) fl.a += 1;
      else fl.b += 1;
    }
    return [
      { label: "Total points", a: formatPoints(s.a_total_points), b: formatPoints(s.b_total_points), tally: { a: s.a_total_points, b: s.b_total_points } },
      { label: "Wins", a: String(s.a_wins), b: String(s.b_wins), tally: { a: s.a_wins, b: s.b_wins } },
      { label: "Race head-to-head", a: String(s.position.a), b: String(s.position.b), tally: s.position },
      { label: "Grid head-to-head", a: String(s.grid.a), b: String(s.grid.b), tally: s.grid },
      { label: "Fastest-lap duel", a: String(fl.a), b: String(fl.b), tally: fl },
      { label: "Avg finish", a: formatNumber(aAvgFinish), b: formatNumber(bAvgFinish), lowerBetter: true, va: aAvgFinish, vb: bAvgFinish },
      { label: "Avg grid", a: formatNumber(aAvgGrid), b: formatNumber(bAvgGrid), lowerBetter: true, va: aAvgGrid, vb: bAvgGrid },
    ];
  }, [query.data]);

  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.code} · ${d.surname}` }));
  const shared = query.data?.summary.shared_sessions ?? 0;

  return (
    <AnalyticsCard
      eyebrow="Comparison · Drivers"
      title="Head-to-head"
      subtitle={`${filters.sessionType} · shared sessions only`}
      loading={query.isPending && a != null && b != null}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && (a == null || b == null || (query.data != null && shared === 0))}
      emptyText="These two drivers share no sessions under the current filters."
      className={props.className}
      bodyClassName="flex flex-col"
    >
      <div className="flex items-center gap-1.5 border-b border-stroke px-3 py-2">
        <Select label="A" value={a ?? 0} numeric options={driverOptions} onChange={(v) => setManual((m) => ({ ...m, a: v }))} />
        <span className="font-mono text-[10px] text-mut">vs</span>
        <Select label="B" value={b ?? 0} numeric options={driverOptions} onChange={(v) => setManual((m) => ({ ...m, b: v }))} />
      </div>

      <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
        {[da, db].map((d, i) => (
          <div key={i} className={`min-w-0 ${i === 1 ? "text-right" : ""}`}>
            <p className="truncate text-[13px] font-semibold text-ink">
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full align-baseline"
                style={{ background: rgb((i === 0 ? SIDE_A : SIDE_B).fill) }}
                aria-hidden
              />
              {d?.code ?? "—"}
            </p>
            <p className="truncate font-mono text-[9px] uppercase tracking-wider text-mut">{d?.teamName ?? ""}</p>
          </div>
        ))}
      </div>
      <p className="px-3 pb-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-mut">
        {shared} shared sessions · {filters.year}
      </p>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
        {rows.map((r) => {
          const aBetter = r.lowerBetter
            ? r.va != null && r.vb != null && r.va < r.vb
            : (r.tally?.a ?? 0) > (r.tally?.b ?? 0);
          const bBetter = r.lowerBetter
            ? r.va != null && r.vb != null && r.vb < r.va
            : (r.tally?.b ?? 0) > (r.tally?.a ?? 0);
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[11px] tabular-nums">
                <span className={aBetter ? "font-semibold text-ink" : "text-sub"}>{r.a}</span>
                <span className="text-center font-sans text-[10px] text-mut">{r.label}</span>
                <span className={bBetter ? "font-semibold text-ink" : "text-sub"}>{r.b}</span>
              </div>
              {r.tally && <TallyBar a={r.tally.a} b={r.tally.b} />}
            </div>
          );
        })}
      </div>
    </AnalyticsCard>
  );
}

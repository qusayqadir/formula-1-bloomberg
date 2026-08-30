/** Constructor head-to-head — same card language as the driver H2H, but
 *  each side is a team's combined car (points summed, better-placed car
 *  used for position/grid duels — that's how the constructors' championship
 *  itself scores a round). */
import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Select } from "@/components/ui/controls";
import { PALETTE, rgb } from "@/components/dither-kit/palette";
import { useTeamHeadToHead } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { formatNumber, formatPoints } from "@/lib/format";

const SIDE_A = PALETTE.blue;
const SIDE_B = PALETTE.red;

const ditherFill = (fill: string, line: string) => ({
  background: `repeating-conic-gradient(${line} 0% 25%, ${fill} 0% 50%) 0 0 / 4px 4px`,
});

function TallyBar(props: { a: number; b: number }) {
  const total = props.a + props.b;
  const pctA = total === 0 ? 50 : (props.a / total) * 100;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-inset" aria-hidden>
      <div style={{ width: `${pctA}%`, ...ditherFill(rgb(SIDE_A.fill), rgb(SIDE_A.fill, 1.25)) }} />
      <div className="w-0.5 flex-none bg-surface" />
      <div className="flex-1" style={ditherFill(rgb(SIDE_B.fill), rgb(SIDE_B.fill, 1.25))} />
    </div>
  );
}

export function TeamHeadToHead(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const teams = props.entities.teams;
  const [manual, setManual] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });

  const globalSel = filters.teamIds;
  const a = manual.a ?? globalSel[0] ?? teams[0]?.id ?? null;
  const bCandidate = manual.b ?? globalSel.find((id) => id !== a) ?? null;
  const b = bCandidate ?? teams.find((t) => t.id !== a)?.id ?? null;

  const query = useTeamHeadToHead(a, b, filters.year, filters.sessionType);
  const ta = a != null ? props.entities.teamById.get(a) : undefined;
  const tb = b != null ? props.entities.teamById.get(b) : undefined;

  const rows = useMemo(() => {
    const s = query.data?.summary;
    if (!s) return [];
    return [
      { label: "Total points", a: formatPoints(s.a_total_points), b: formatPoints(s.b_total_points), tally: { a: s.a_total_points, b: s.b_total_points } },
      { label: "Wins", a: String(s.a_wins), b: String(s.b_wins), tally: { a: s.a_wins, b: s.b_wins } },
      { label: "Race head-to-head", a: String(s.position.a), b: String(s.position.b), tally: s.position },
      { label: "Grid head-to-head", a: String(s.grid.a), b: String(s.grid.b), tally: s.grid },
      { label: "Avg finish", a: formatNumber(s.a_avg_finish), b: formatNumber(s.b_avg_finish), lowerBetter: true, va: s.a_avg_finish, vb: s.b_avg_finish },
      { label: "Avg grid", a: formatNumber(s.a_avg_grid), b: formatNumber(s.b_avg_grid), lowerBetter: true, va: s.a_avg_grid, vb: s.b_avg_grid },
    ];
  }, [query.data]);

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));
  // A and B must never resolve to the same team — each side's list hides
  // whichever team the other side currently holds.
  const optionsForA = teamOptions.filter((o) => o.value !== b);
  const optionsForB = teamOptions.filter((o) => o.value !== a);
  const shared = query.data?.summary.shared_sessions ?? 0;

  return (
    <AnalyticsCard
      eyebrow="Comparison · Constructors"
      title="Head-to-head"
      subtitle={`${filters.sessionType} · shared rounds only`}
      loading={query.isPending && a != null && b != null}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && (a == null || b == null || (query.data != null && shared === 0))}
      emptyText="These two constructors share no rounds under the current filters."
      className={props.className}
      bodyClassName="flex flex-col"
    >
      <div className="flex items-center justify-center gap-1.5 border-b border-stroke px-3 py-2">
        <Select label="A" value={a ?? 0} numeric options={optionsForA} onChange={(v) => setManual((m) => ({ ...m, a: v }))} />
        <span className="font-mono text-[10px] text-mut">vs</span>
        <Select label="B" value={b ?? 0} numeric options={optionsForB} onChange={(v) => setManual((m) => ({ ...m, b: v }))} />
      </div>

      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        {[ta, tb].map((t, i) => (
          <div key={i} className={`min-w-0 ${i === 1 ? "text-right" : ""}`}>
            <p className="truncate text-[15px] font-semibold text-ink">
              <span
                className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-baseline"
                style={{ background: rgb((i === 0 ? SIDE_A : SIDE_B).fill) }}
                aria-hidden
              />
              {t?.name ?? "—"}
            </p>
          </div>
        ))}
      </div>
      <p className="px-3 pb-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-mut">
        {shared} shared rounds · {filters.year}
      </p>

      {/* Fixed row gap matching HeadToHead.tsx exactly — only the row count
          differs (6 here vs. 7 for drivers, no fastest-lap duel). */}
      <div className="flex flex-1 flex-col gap-2.5 px-3 pb-3">
        {rows.map((r) => {
          const aBetter = r.lowerBetter
            ? r.va != null && r.vb != null && r.va < r.vb
            : (r.tally?.a ?? 0) > (r.tally?.b ?? 0);
          const bBetter = r.lowerBetter
            ? r.va != null && r.vb != null && r.vb < r.va
            : (r.tally?.b ?? 0) > (r.tally?.a ?? 0);
          return (
            <div key={r.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 font-mono text-[13px] tabular-nums">
                <span className={aBetter ? "font-semibold text-ink" : "text-sub"}>{r.a}</span>
                <span className="text-center font-sans text-[11px] text-mut">{r.label}</span>
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

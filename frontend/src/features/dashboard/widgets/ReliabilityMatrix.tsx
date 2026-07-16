/** Retirements by cause — dithered stacked DNF counts per team, worst first.
 *  Buckets come from the status vocabulary (statusBucket in selectors);
 *  the three cause hues are dither palette slots orange/red/purple —
 *  green is deliberately skipped in a failures chart. */
import { useMemo } from "react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import {
  Bar,
  BarChart,
  BlockLegend,
  Grid,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/dither-kit";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { filteredSeasonRows, statusBucket } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";

const CONFIG = {
  mechanical: { label: "Mechanical", color: "orange" },
  incident: { label: "Incident", color: "red" },
  other: { label: "Other DNF", color: "purple" },
} as const;

/** Axis code for a team name: strip filler words, keep the first word's stem. */
function teamTick(name: unknown): string {
  const stripped = String(name ?? "")
    .replace(/\b(F1|Formula One|Team|Racing|Grand Prix)\b/gi, "")
    .trim();
  return (stripped || String(name ?? "")).split(/\s+/)[0].slice(0, 4).toUpperCase();
}

interface TeamReliability {
  team: string;
  starts: number;
  mechanical: number;
  incident: number;
  other: number;
  total: number;
}

export function ReliabilityMatrix(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const query = useSeasonResults(filters.year, filters.sessionType);

  const teams = useMemo<TeamReliability[]>(() => {
    const rows = filteredSeasonRows(query.data?.items, props.entities, filters);
    const byTeam = new Map<number, TeamReliability>();
    for (const r of rows) {
      let t = byTeam.get(r.team_id);
      if (!t) {
        t = { team: r.team_name, starts: 0, mechanical: 0, incident: 0, other: 0, total: 0 };
        byTeam.set(r.team_id, t);
      }
      t.starts += 1;
      const bucket = statusBucket(r.status);
      if (bucket !== "finish") {
        t[bucket] += 1;
        t.total += 1;
      }
    }
    const out = [...byTeam.values()].sort(
      (a, b) => b.total - a.total || a.team.localeCompare(b.team),
    );
    return out.some((t) => t.total > 0) ? out : [];
  }, [query.data, filters, props.entities]);

  return (
    <AnalyticsCard
      eyebrow="Season · Reliability"
      title="Retirements by cause"
      subtitle={`${filters.year} · race status buckets`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && teams.length === 0}
      emptyText="No retirements in the current selection — every entry was classified as a finish."
      expandable
      className={props.className}
      bodyClassName="flex flex-col gap-1.5 p-3"
    >
      {teams.length > 0 && (
        <>
          <BlockLegend config={CONFIG} align="end" className="flex-none" />
          <div className="min-h-0 flex-1">
            <BarChart data={teams} config={CONFIG} stackType="stacked" bloom="low">
              <Grid />
              <XAxis dataKey="team" maxTicks={teams.length} tickFormatter={teamTick} />
              <YAxis tickFormatter={(v) => String(Math.round(v))} />
              <Tooltip
                labelKey="team"
                valueFormatter={(v, name) => `${v} DNF · ${String(name)}`}
              />
              <Bar dataKey="mechanical" variant="gradient" isClickable />
              <Bar dataKey="incident" variant="gradient" isClickable />
              <Bar dataKey="other" variant="gradient" isClickable />
            </BarChart>
          </div>
        </>
      )}
    </AnalyticsCard>
  );
}

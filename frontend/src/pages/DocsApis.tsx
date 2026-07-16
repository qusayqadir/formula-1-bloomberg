/** Backend API reference — grouped endpoint list mirrored from app/router.
 *  This is a hand-maintained index; the interactive contract lives in the
 *  FastAPI Swagger UI, linked below. */
import { ExternalLink } from "lucide-react";

interface Endpoint {
  path: string;
  note: string;
}

const GROUPS: { title: string; blurb: string; endpoints: Endpoint[] }[] = [
  {
    title: "Core resources",
    blurb: "One router per bronze entity — plain reads with pagination and shared filters.",
    endpoints: [
      { path: "/api/v1/seasons", note: "Seasons with round counts" },
      { path: "/api/v1/seasons/{year}", note: "Single season" },
      { path: "/api/v1/seasons/{year}/rounds", note: "Calendar for a season" },
      { path: "/api/v1/rounds/{round_id}", note: "Round detail" },
      { path: "/api/v1/rounds/{round_id}/entries", note: "Cars entered in a round" },
      { path: "/api/v1/rounds/{round_id}/sessions", note: "Sessions of a round" },
      { path: "/api/v1/sessions/{session_id}", note: "Session detail" },
      { path: "/api/v1/sessions/{session_id}/results", note: "Classification of one session" },
      { path: "/api/v1/results", note: "The core dataset — one row per session entry, filterable by year/round/session/driver/team" },
      { path: "/api/v1/drivers", note: "Driver index (search + nationality filters)" },
      { path: "/api/v1/drivers/{driver_id}", note: "Driver detail" },
      { path: "/api/v1/drivers/{driver_id}/seasons", note: "Seasons and seats for a driver" },
      { path: "/api/v1/teams", note: "Team index" },
      { path: "/api/v1/teams/{team_id}", note: "Team detail" },
      { path: "/api/v1/teams/{team_id}/drivers", note: "Season line-ups for a team" },
      { path: "/api/v1/circuits", note: "Circuit index with geo fields" },
      { path: "/api/v1/circuits/{circuit_id}", note: "Circuit detail" },
      { path: "/api/v1/circuits/{circuit_id}/rounds", note: "Rounds held at a circuit" },
      { path: "/api/v1/championships/drivers", note: "Driver standings snapshots" },
      { path: "/api/v1/championships/constructors", note: "Constructor standings snapshots" },
      { path: "/api/v1/championships/drivers/{driver_id}/history", note: "A driver's championship arc" },
      { path: "/api/v1/championships/constructors/{team_id}/history", note: "A team's championship arc" },
      { path: "/api/v1/meta/filters", note: "Distinct filter values (years, session types, nationalities…)" },
      { path: "/health", note: "Liveness probe" },
    ],
  },
  {
    title: "Analytics",
    blurb: "Aggregated datasets under /api/v1/analytics — aggregation happens in Postgres, shaped for charts.",
    endpoints: [
      { path: ".../championships/drivers/progression", note: "Per-round points/position series per driver" },
      { path: ".../championships/teams/progression", note: "Same shape for constructors" },
      { path: ".../drivers/summary", note: "Driver aggregates · group_by driver / season / circuit" },
      { path: ".../teams/summary", note: "Team aggregates · group_by includes team_driver seat map" },
      { path: ".../circuits/performance", note: "Circuit aggregates incl. geo/altitude" },
      { path: ".../circuits/racecraft", note: "Pole conversion, front-row wins, order shuffle per circuit" },
      { path: ".../results/status-distribution", note: "Reliability: status counts by driver/team/season" },
      { path: ".../results/grid-finish-density", note: "Grid × finish cell counts (hexbin source)" },
      { path: ".../comparisons/drivers", note: "Head-to-head over shared sessions" },
    ],
  },
];

export function DocsApis() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-8">
      <p className="eyebrow">Documentation / Backend APIs</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">API reference</h1>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="flex h-7 items-center gap-1.5 rounded-md border border-stroke bg-surface px-2.5 font-mono text-[10px] uppercase tracking-wider text-sub transition-colors hover:border-stroke-strong hover:text-ink"
        >
          Swagger UI <ExternalLink size={10} />
        </a>
      </div>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-sub">
        Read-only FastAPI service over the ingested historic database (schema{" "}
        <code className="font-mono text-[11px] text-ink">bronze</code>, seasons 2011–2025). All
        endpoints are GET; list endpoints share the same filter set as{" "}
        <code className="font-mono text-[11px] text-ink">/results</code>.
      </p>

      {GROUPS.map((g) => (
        <section key={g.title} className="mt-8">
          <h2 className="text-[13px] font-semibold text-ink">{g.title}</h2>
          <p className="mt-0.5 text-xs text-sub">{g.blurb}</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-stroke bg-surface">
            <table className="w-full border-collapse text-left">
              <tbody>
                {g.endpoints.map((e) => (
                  <tr key={e.path} className="border-b border-stroke/60 last:border-0">
                    <td className="w-8 py-2 pl-3 align-top">
                      <span className="rounded border border-stroke px-1 font-mono text-[8px] font-semibold uppercase tracking-wider text-pos">
                        GET
                      </span>
                    </td>
                    <td className="py-2 pl-2 pr-3 align-top font-mono text-[11px] text-ink">
                      {e.path}
                    </td>
                    <td className="py-2 pr-3 align-top text-xs text-sub">{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

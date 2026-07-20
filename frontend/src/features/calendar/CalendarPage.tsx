/** Race Calendar — revolving 3D earth (or flat 2D map) of the selected
 *  season's circuits, with a season selector + round schedule (top left),
 *  a 3D/2D view toggle (top right), and previous/upcoming/next race cards
 *  (bottom center). Cards + panels follow the frosted-glass tooltip language. */
import { useMemo, useState } from "react";
import { GlassSelect, Segmented } from "@/components/ui/controls";
import { useFilters } from "@/state/filters";
import { useCircuits, useSeasonRounds } from "@/lib/queries";
import { shortRoundName } from "@/lib/format";
import type { Circuit, Round } from "@/lib/types";
import "flag-icons/css/flag-icons.min.css";
import { ChevronDown } from "lucide-react";
import { Globe3D, type GlobeFocus } from "@/features/calendar/Globe3D";
import { Map2D } from "@/features/calendar/Map2D";
import { buildCircuitMeta, GLOBE_PALETTE as P, type CircuitDot, type RoutePoint } from "@/features/calendar/geo";
import { circuitIso2 } from "@/features/calendar/flags";

/* Frosted-glass surface in the calendar palette (fixed panel colors). */
const GLASS =
  "rounded-md border border-[#292E36] bg-[#101216]/85 shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-sm";

const fmtDate = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    : "TBD";

export function CalendarPage() {
  const { years } = useFilters();
  const latestYear = years.length ? years[years.length - 1] : new Date().getFullYear();
  const [year, setYear] = useState<number | null>(null);
  const effYear = year ?? latestYear;
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [focus, setFocus] = useState<GlobeFocus | null>(null);

  const roundsQ = useSeasonRounds(effYear);
  const circuitsQ = useCircuits();

  const { rounds, circuitById, prev, upcoming, next } = useMemo(() => {
    const rounds = (roundsQ.data?.items ?? [])
      .filter((r) => !r.is_cancelled)
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const circuitById = new Map<number, Circuit>(
      (circuitsQ.data?.items ?? []).map((c) => [c.id, c]),
    );
    const today = new Date().toISOString().slice(0, 10);
    const dated = rounds.filter((r) => r.date != null);
    const upIdx = dated.findIndex((r) => r.date! >= today);
    const prev = upIdx === -1 ? dated[dated.length - 1] ?? null : dated[upIdx - 1] ?? null;
    const upcoming = upIdx === -1 ? null : dated[upIdx];
    const next = upIdx === -1 ? null : dated[upIdx + 1] ?? null;
    return { rounds, circuitById, prev, upcoming, next };
  }, [roundsQ.data, circuitsQ.data]);

  const dots = useMemo<CircuitDot[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const seen = new Set<number>();
    const out: CircuitDot[] = [];
    for (const r of rounds) {
      const c = circuitById.get(r.circuit_id);
      if (!c || c.latitude == null || c.longitude == null || seen.has(c.id)) continue;
      seen.add(c.id);
      const isCurrent = upcoming?.circuit_id === c.id;
      out.push({
        circuitId: c.id,
        apiId: c.api_id ?? null,
        name: c.name,
        label: r.number != null ? `R${r.number}` : "R—",
        lat: c.latitude,
        lon: c.longitude,
        emphasis: isCurrent,
        status: isCurrent ? "current" : r.date != null && r.date < today ? "completed" : "future",
        meta: buildCircuitMeta(c),
      });
    }
    return out;
  }, [rounds, circuitById, upcoming]);

  // season flight path — circuit coordinates + race dates in round order
  const route = useMemo(() => {
    const out: RoutePoint[] = [];
    for (const r of rounds) {
      const c = circuitById.get(r.circuit_id);
      if (c?.latitude == null || c.longitude == null) continue;
      const last = out[out.length - 1];
      if (last && last.lat === c.latitude && last.lon === c.longitude) continue;
      out.push({ lat: c.latitude, lon: c.longitude, date: r.date });
    }
    return out;
  }, [rounds, circuitById]);

  const snapToRound = (r: Round) => {
    const c = circuitById.get(r.circuit_id);
    if (c?.latitude == null || c.longitude == null) return;
    setFocus({ circuitId: c.id, lat: c.latitude, lon: c.longitude, token: Date.now() });
  };

  return (
    <div className="relative h-full overflow-hidden" style={{ background: P.page }}>
      {view === "3d" ? (
        <Globe3D dots={dots} route={route} focus={focus} />
      ) : (
        <Map2D dots={dots} route={route} focus={focus} />
      )}

      {/* season query + schedule — top left */}
      <div className="absolute left-4 top-4 z-10 w-64 space-y-2">
        <GlassSelect
          label="Season"
          value={effYear}
          options={[...years].reverse().map((y) => ({ value: y, label: String(y) }))}
          onChange={(y) => setYear(y)}
        />
        <div className={`${GLASS} p-2`}>
          <button
            onClick={() => setScheduleOpen((v) => !v)}
            aria-expanded={scheduleOpen}
            className="flex w-full items-center justify-between px-1.5 pb-0.5 font-mono text-[10px] uppercase tracking-wider text-sub transition-colors hover:text-ink"
          >
            {effYear} Schedule
            <ChevronDown
              size={12}
              className={`transition-transform ${scheduleOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {scheduleOpen && (
            <div className="mt-1 max-h-[42vh] overflow-y-auto">
              {rounds.length === 0 && (
                <p className="px-1.5 pb-1 font-mono text-[11px] text-mut">
                  {roundsQ.isLoading ? "Loading…" : "No rounds ingested."}
                </p>
              )}
              {rounds.map((r) => (
                <button
                  key={r.id}
                  onClick={() => snapToRound(r)}
                  title="Snap the globe to this circuit"
                  className={`flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left font-mono text-[11px] tabular-nums transition-colors hover:bg-ink/[0.08] ${
                    upcoming?.id === r.id ? "bg-ink/[0.06]" : ""
                  }`}
                >
                  <span className="w-7 flex-none text-mut">R{r.number ?? "—"}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {shortRoundName(r.name) || r.circuit_name}
                  </span>
                  {upcoming?.id === r.id && (
                    <span
                      className="h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: P.markerCurrent }}
                      aria-label="Next race"
                    />
                  )}
                  <span className="flex-none text-sub">{fmtDate(r.date)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3D / 2D view toggle — top right */}
      <div className="absolute right-4 top-4 z-10">
        <Segmented
          ariaLabel="Map view"
          value={view}
          options={[
            { value: "3d", label: "3D" },
            { value: "2d", label: "2D" },
          ]}
          onChange={setView}
        />
      </div>

      {/* race cards — bottom center */}
      <div className="absolute bottom-6 left-1/2 z-10 flex w-max max-w-[92vw] -translate-x-1/2 flex-wrap justify-center gap-3 px-4">
        <RaceCard label="Previous Race" round={prev} circuit={prev ? circuitById.get(prev.circuit_id) : undefined} />
        <RaceCard label="Upcoming Race" round={upcoming} circuit={upcoming ? circuitById.get(upcoming.circuit_id) : undefined} />
        <RaceCard label="Next Race" round={next} circuit={next ? circuitById.get(next.circuit_id) : undefined} />
      </div>
    </div>
  );
}

function RaceCard(props: { label: string; round: Round | null; circuit?: Circuit }) {
  const { label, round, circuit } = props;
  const iso = circuitIso2(circuit);
  return (
    <div
      className={`${GLASS} w-[250px] p-3.5 transition-transform duration-150 ease-out hover:-translate-y-2 hover:scale-[1.06]`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-sub">{label}</p>
      {round ? (
        <div className="mt-2 flex items-center gap-2.5">
          {iso ? (
            <span
              className={`fi fi-${iso} flex-none rounded-[1px]`}
              style={{ width: 28, height: 21, borderColor: P.panelBorder }}
              role="img"
              aria-label={circuit?.country ?? "Country flag"}
            />
          ) : (
            <span className="grid h-5 w-7 flex-none place-items-center rounded-[1px] border border-ink/20 bg-ink/[0.08] font-mono text-[8px] uppercase text-mut">
              ??
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-mono text-[11px] text-ink">
              {circuit?.name ?? round.circuit_name}
            </span>
            <span className="block truncate font-mono text-[10px] tabular-nums text-sub">
              {shortRoundName(round.name) || `Round ${round.number}`} · {fmtDate(round.date)}
            </span>
          </span>
        </div>
      ) : (
        <p className="mt-2 font-mono text-[11px] text-mut">—</p>
      )}
    </div>
  );
}

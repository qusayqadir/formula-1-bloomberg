import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { GlassSelect, Segmented } from "@/components/ui/controls";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { teamColor, withAlpha } from "@/lib/colors";
import { driverCode, formatLapTime, shortRoundName } from "@/lib/format";
import { useLapPositions, usePitStops, useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, roundsFromResults } from "@/features/dashboard/selectors";

type Speed = "0.5" | "1" | "2" | "4";
const SPEED_MS: Record<Speed, number> = { "0.5": 1200, "1": 600, "2": 300, "4": 150 };

interface StandingRow {
  driverId: number;
  code: string;
  surname: string;
  teamName: string;
  color: string;
  position: number | null;
  lapTimeSec: number | null;
  delta: number | null; // positions gained vs the previous lap (+ = moved up)
  netDelta: number | null; // positions gained vs the starting grid slot (+ = moved up)
  gapToAheadSec: number | null; // this driver's lap time minus the car ahead's, same lap
  gapToLeaderSec: number | null; // cumulative race time minus the leader's, same lap
  pitted: boolean;
  pitDurationSec: number | null;
  retired: boolean;
  /** Results-dataset status (Finished/Lapped/Retired/…) — only present on
   *  grid rows, used to tell a genuine DNF apart from a merely lapped car
   *  whose lap-position data happens to end a lap short too. */
  finalStatus?: string | null;
  /** True for a ghost row with zero recorded laps for the whole race — takes
   *  priority over finalStatus in the tag, since "never started" is more
   *  useful to a lap-by-lap viewer than the specific results-dataset cause
   *  (Withdrew/Injury/Did not start/…), which all mean the same thing here. */
  neverStarted?: boolean;
}

interface DriverSeries {
  code: string;
  color: string;
  dash: "solid" | "dashed";
  points: { lap: number; position: number }[];
}

function formatGap(sec: number | null): string {
  if (sec == null) return "—";
  if (Math.abs(sec) < 0.0005) return "0.000s";
  return `${sec > 0 ? "+" : "-"}${Math.abs(sec).toFixed(3)}s`;
}

export function RaceReplayPage() {
  const { filters, years, set } = useFilters();
  const C = useChartTheme();
  const { t } = C;

  // Rounds come from actual race results, not the scheduled calendar, so a
  // mid-season year (e.g. 2026) offers only completed rounds — never a future
  // race with no data yet — and focusRound defaults to the latest completed
  // round instead of an empty calendar slot.
  const resultsQuery = useSeasonResults(filters.year, "Race");
  const rounds = useMemo(() => roundsFromResults(resultsQuery.data?.items), [resultsQuery.data]);
  const round = focusRound(rounds, filters);
  const roundName = rounds.find((r) => r.number === round)?.name ?? null;

  const lapsQuery = useLapPositions(filters.year, round);
  const stopsQuery = usePitStops(filters.year, round);

  // Lap 0 — the starting grid, no lap time yet. Sourced from the results
  // dataset's `grid` column rather than bronze.laps (which only starts at
  // lap 1), so it's the same shape as every other StandingRow.
  const gridRows = useMemo<StandingRow[]>(() => {
    const rows = (resultsQuery.data?.items ?? []).filter((r) => r.round_number === round);
    return rows
      .map((r) => ({
        driverId: r.driver_id,
        code: driverCode({ abbreviation: r.driver_abbreviation, surname: r.driver_surname }),
        surname: r.driver_surname,
        teamName: r.team_name ?? "—",
        color: teamColor({ id: r.team_id, name: r.team_name, primary_color: null }),
        position: r.grid && r.grid > 0 ? r.grid : null,
        lapTimeSec: null,
        delta: null,
        netDelta: 0,
        gapToAheadSec: null,
        gapToLeaderSec: null,
        pitted: false,
        pitDurationSec: null,
        retired: false,
        finalStatus: r.status ?? null,
      }))
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  }, [resultsQuery.data, round]);

  const { byLap, maxLap, seriesByDriver, pitDurations, retiredLastLap, retiredReason } = useMemo(() => {
    const gridByDriver = new Map<number, number>();
    for (const g of gridRows) if (g.position != null) gridByDriver.set(g.driverId, g.position);

    const rows = lapsQuery.data?.rows ?? [];
    const byLapNumber = new Map<number, typeof rows>();
    const lastLap = new Map<number, number>();
    let observedMax = 0;
    for (const r of rows) {
      observedMax = Math.max(observedMax, r.lap_number);
      let bucket = byLapNumber.get(r.lap_number);
      if (!bucket) {
        bucket = [];
        byLapNumber.set(r.lap_number, bucket);
      }
      bucket.push(r);
      if ((lastLap.get(r.driver.id) ?? 0) < r.lap_number) lastLap.set(r.driver.id, r.lap_number);
    }
    const totalLaps = (lapsQuery.data?.metadata.total_laps as number | null) ?? observedMax;

    const gridRowById = new Map<number, StandingRow>();
    for (const g of gridRows) gridRowById.set(g.driverId, g);

    // Ground truth for "did this driver actually retire" is the results
    // dataset's status, NOT a gap in lap-position data — a "Lapped" car is
    // fully classified but, being a lap down, its recorded lap data
    // legitimately stops one lap short of the leader's total. Relying on the
    // data gap alone would mislabel every lapped car as a DNF.
    //
    // Matched by exclusion, not a whitelist: `status` is "Finished" for
    // on-lead-lap finishers, "Lapped" or "+N Lap(s)" for classified-but-lapped
    // finishers, and one of ~70 specific-cause strings otherwise. Pre-2023
    // seasons carry the specific cause (Collision, Engine, Wheel nut…); only
    // 2023+ mostly collapses to the generic "Retired" (see CLAUDE.md's bronze
    // gap notes). A whitelist of just the generic strings would miss every
    // pre-2023 retirement, rendering a crashed-out driver as a normal,
    // still-competing row frozen at a stale position instead of being
    // dimmed and labeled RETIRED — which is exactly what produced duplicate
    // position numbers once the field renumbered around them (e.g. 2012 R5).
    const CLASSIFIED_NOT_RETIRED = /^(Finished|Lapped|\+\d+\s+Laps?)$/;
    const retiredDriverIds = new Set<number>();
    for (const g of gridRows) {
      if (g.finalStatus && !CLASSIFIED_NOT_RETIRED.test(g.finalStatus)) retiredDriverIds.add(g.driverId);
    }

    // A driver can retire before completing a single lap (formation-lap or
    // lap-1 crash) — they'd never appear in `rows` at all, so track known
    // drivers from the grid too, or they'd silently vanish the instant lap 1
    // starts instead of showing up as a retirement.
    const allDriverIds = new Set<number>([...lastLap.keys(), ...gridRowById.keys()]);
    // Any driver whose recorded lap data stops short of the final lap needs
    // to be frozen there instead of vanishing — covers real DNFs *and*
    // lapped classified cars. Only the DNF subset gets flagged `retired`.
    const dataEndLap = new Map<number, number>(); // driverId -> last completed lap, only set if short of totalLaps
    for (const id of allDriverIds) {
      const last = lastLap.get(id) ?? 0;
      if (last < totalLaps) dataEndLap.set(id, last);
    }
    const retiredLastLap = new Map<number, number>(); // subset of dataEndLap — true DNFs only, drives the red chart styling
    // driverId -> label for the chart's DNF marker/tooltip. Zero recorded laps
    // always reads "Never started" — more useful to a lap-by-lap viewer than
    // the specific results-dataset cause (Withdrew/Injury/Did not start/…),
    // which all mean the same thing here — matching the standings tag.
    const retiredReason = new Map<number, string>();
    for (const [id, last] of dataEndLap) {
      if (retiredDriverIds.has(id)) {
        retiredLastLap.set(id, last);
        if (last === 0) {
          retiredReason.set(id, "Never started");
        } else {
          const status = gridRowById.get(id)?.finalStatus;
          if (status) retiredReason.set(id, status);
        }
      }
    }

    const pitDurations = new Map<number, Map<number, number>>(); // driverId -> lap -> duration
    for (const s of stopsQuery.data?.rows ?? []) {
      if (s.lap_number == null) continue;
      let byLapDur = pitDurations.get(s.driver.id);
      if (!byLapDur) {
        byLapDur = new Map();
        pitDurations.set(s.driver.id, byLapDur);
      }
      byLapDur.set(s.lap_number, s.duration_sec ?? -1);
    }

    // Solid for the first-seen seat on a team, dashed for the second — the
    // only cheap way to tell teammates apart on the chart without pulling
    // in the full dashboard SeasonEntities pipeline for this page.
    const teamSeatDash = new Map<number, "solid" | "dashed">();
    const seenTeams = new Set<number>();
    const seriesByDriver = new Map<number, DriverSeries>();
    for (const r of rows) {
      if (r.position == null) continue;
      let series = seriesByDriver.get(r.driver.id);
      if (!series) {
        const teamId = r.team?.id ?? -1;
        if (!teamSeatDash.has(r.driver.id)) {
          teamSeatDash.set(r.driver.id, seenTeams.has(teamId) ? "dashed" : "solid");
          seenTeams.add(teamId);
        }
        series = {
          code: driverCode(r.driver),
          color: r.team ? teamColor(r.team) : t.neutral,
          dash: teamSeatDash.get(r.driver.id) ?? "solid",
          points: [],
        };
        seriesByDriver.set(r.driver.id, series);
      }
      series.points.push({ lap: r.lap_number, position: r.position });
    }
    for (const series of seriesByDriver.values()) series.points.sort((a, b) => a.lap - b.lap);

    const lastPosition = new Map<number, number>();
    const cumulativeTime = new Map<number, number>(); // driverId -> race time so far, laps 1..totalLaps
    // driverId -> most recent real lap row seen so far, updated as the loop
    // below walks forward — NOT the same as "their absolute last row for the
    // whole race". A driver's lap coverage can have a mid-race hole (a real
    // bronze-data gap, not just an end-of-race retirement — e.g. 2014 R1
    // Vettel has laps 1-3 then nothing until a lap 26 row, Bianchi has a
    // 50-54 hole). Using the driver's overall-last row as every gap lap's
    // ghost source made them vanish entirely for the gap instead of freezing
    // at their true most-recent position — this carry-forward map fixes
    // that by only ever looking backward from the lap currently being built.
    const mostRecentRow = new Map<number, (typeof rows)[number]>();
    const built = new Map<number, StandingRow[]>();
    for (let lap = 1; lap <= totalLaps; lap++) {
      const bucket = byLapNumber.get(lap) ?? [];
      const curCum = new Map<number, number>(); // driverId -> cumulative time through THIS lap
      const active: StandingRow[] = bucket.map((r) => {
        const prev = lastPosition.get(r.driver.id) ?? null;
        if (r.position != null) lastPosition.set(r.driver.id, r.position);
        const pitSec = pitDurations.get(r.driver.id)?.get(lap) ?? null;
        if (r.lap_time_sec != null) {
          const next = (cumulativeTime.get(r.driver.id) ?? 0) + r.lap_time_sec;
          cumulativeTime.set(r.driver.id, next);
          curCum.set(r.driver.id, next);
        } else if (cumulativeTime.has(r.driver.id)) {
          curCum.set(r.driver.id, cumulativeTime.get(r.driver.id) as number);
        }
        return {
          driverId: r.driver.id,
          code: driverCode(r.driver),
          surname: r.driver.surname,
          teamName: r.team?.name ?? "—",
          color: r.team ? teamColor(r.team) : t.neutral,
          position: r.position,
          lapTimeSec: r.lap_time_sec,
          delta: prev != null && r.position != null ? prev - r.position : null,
          netDelta:
            gridByDriver.has(r.driver.id) && r.position != null
              ? (gridByDriver.get(r.driver.id) as number) - r.position
              : null,
          gapToAheadSec: null, // filled in below, once sorted
          gapToLeaderSec: null, // filled in below, once sorted
          pitted: pitSec != null,
          pitDurationSec: pitSec != null && pitSec >= 0 ? pitSec : null,
          retired: false,
        };
      });

      // Every known entrant not in this lap's real data — keep them visible,
      // frozen at their most recent known position, instead of letting them
      // silently vanish from the list. Covers real DNFs (incl. lap-0/lap-1
      // retirements with zero laps recorded, e.g. a formation-lap crash),
      // lapped classified cars whose data legitimately ends a lap early (see
      // `retired` below, sourced from race-result status, not this gap), AND
      // a genuine mid-race hole in bronze.laps for an otherwise-still-racing
      // driver — freezing at `mostRecentRow` (not the driver's absolute last
      // row for the whole race) means they reappear live the moment their
      // real data resumes instead of staying frozen through it.
      const ghosts: StandingRow[] = [];
      for (const driverId of allDriverIds) {
        if (bucket.some((b) => b.driver.id === driverId)) continue;
        const r = mostRecentRow.get(driverId);
        const grid = gridRowById.get(driverId);
        if (!r && !grid) continue;
        const position = r ? r.position : (grid as StandingRow).position;
        ghosts.push({
          driverId,
          code: r ? driverCode(r.driver) : (grid as StandingRow).code,
          surname: r ? r.driver.surname : (grid as StandingRow).surname,
          teamName: r ? (r.team?.name ?? "—") : (grid as StandingRow).teamName,
          color: r ? (r.team ? teamColor(r.team) : t.neutral) : (grid as StandingRow).color,
          position,
          lapTimeSec: null,
          delta: null,
          netDelta:
            gridByDriver.has(driverId) && position != null
              ? (gridByDriver.get(driverId) as number) - position
              : null,
          gapToAheadSec: null,
          gapToLeaderSec: null,
          pitted: false,
          pitDurationSec: null,
          retired: retiredDriverIds.has(driverId),
          finalStatus: gridRowById.get(driverId)?.finalStatus ?? null,
          neverStarted: (lastLap.get(driverId) ?? 0) === 0,
        });
      }
      for (const r of bucket) mostRecentRow.set(r.driver.id, r);

      const entries = [...active, ...ghosts].sort((a, b) => {
        const ka = a.retired ? 1000 + (a.position ?? 999) : (a.position ?? 999);
        const kb = b.retired ? 1000 + (b.position ?? 999) : (b.position ?? 999);
        return ka - kb;
      });

      for (let i = 1; i < entries.length; i++) {
        const cur = entries[i];
        const ahead = entries[i - 1];
        if (cur.retired || ahead.retired || cur.lapTimeSec == null || ahead.lapTimeSec == null) continue;
        cur.gapToAheadSec = cur.lapTimeSec - ahead.lapTimeSec;
      }

      const leaderEntry = entries.find((e) => !e.retired);
      const leaderCum = leaderEntry ? curCum.get(leaderEntry.driverId) : undefined;
      if (leaderEntry && leaderCum != null) {
        for (const e of entries) {
          if (e.retired) continue;
          const myCum = curCum.get(e.driverId);
          if (myCum == null) continue;
          e.gapToLeaderSec = e.driverId === leaderEntry.driverId ? 0 : myCum - leaderCum;
        }
      }

      built.set(lap, entries);
    }
    return { byLap: built, maxLap: totalLaps, seriesByDriver, pitDurations, retiredLastLap, retiredReason };
  }, [lapsQuery.data, stopsQuery.data, gridRows, t.neutral]);

  const [currentLap, setCurrentLap] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // new round loaded — snap back to the grid rather than replaying stale progress
  useEffect(() => {
    setCurrentLap(0);
    setPlaying(false);
  }, [round]);

  useEffect(() => {
    if (!playing || maxLap === 0) return;
    timerRef.current = setInterval(() => {
      setCurrentLap((lap) => {
        if (lap >= maxLap) {
          setPlaying(false);
          return lap;
        }
        return lap + 1;
      });
    }, SPEED_MS[speed]);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, maxLap]);

  const standings = currentLap === 0 ? gridRows : byLap.get(currentLap) ?? [];
  const loading = lapsQuery.isPending || resultsQuery.isPending;
  const empty = !loading && !lapsQuery.error && maxLap === 0;

  // Grid slot becomes each driver's lap-0 anchor point on the chart, so the
  // line grows from where they actually started rather than jumping in at
  // lap 1. Drivers with zero recorded laps (e.g. a lap-1 DNS/crash) still
  // get a single point rather than being dropped from the chart entirely.
  const seriesByDriverWithGrid = useMemo(() => {
    const merged = new Map<number, DriverSeries>();
    for (const [id, s] of seriesByDriver) merged.set(id, { ...s, points: [...s.points] });
    for (const g of gridRows) {
      if (g.position == null) continue;
      let s = merged.get(g.driverId);
      if (!s) {
        s = { code: g.code, color: g.color, dash: "solid", points: [] };
        merged.set(g.driverId, s);
      }
      s.points = [{ lap: 0, position: g.position }, ...s.points];
    }
    return merged;
  }, [seriesByDriver, gridRows]);

  const chartOption = useMemo<EChartsOption | null>(() => {
    if (!seriesByDriverWithGrid.size || maxLap === 0) return null;
    const maxPosition = Math.max(
      ...[...seriesByDriverWithGrid.values()].flatMap((s) => s.points.map((p) => p.position)),
    );
    const series: LineSeriesOption[] = [...seriesByDriverWithGrid.entries()].map(([driverId, d], i) => {
      const visible = d.points.filter((p) => p.lap <= currentLap);
      const pits = pitDurations.get(driverId);
      const retiredLap = retiredLastLap.get(driverId);
      // Only flag DNF once the scrub has actually reached the lap they
      // dropped out on — before that (or at the lap-0 grid view) their line
      // is still legitimately growing, same as everyone else's.
      const isDnf = currentLap > 0 && retiredLap != null && currentLap >= retiredLap;
      const reason = retiredReason.get(driverId);
      const lastVisibleIndex = visible.length - 1;
      return {
        name: d.code,
        type: "line",
        symbol: "circle",
        symbolSize: 0,
        lineStyle: { width: 1.75, type: d.dash, opacity: 0.85, color: d.color },
        itemStyle: { color: d.color, borderColor: t.surface, borderWidth: 1.5 },
        emphasis: { focus: "series", lineStyle: { width: 3, opacity: 1 } },
        blur: { lineStyle: { opacity: 0.08 }, itemStyle: { opacity: 0.08 }, label: { show: false } },
        endLabel: {
          show: true,
          formatter: isDnf ? `${d.code} ${(reason ?? "Retired").toUpperCase()}` : d.code,
          color: isDnf ? t.neg : t.labelBright,
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: isDnf ? 700 : 400,
          distance: isDnf ? 10 : 8,
          // A DNF's line stops mid-plot, right where the field is busiest —
          // a padded pill keeps the label legible over crossing lines
          // instead of dissolving into them (mirrors PositionsAroundPits).
          backgroundColor: isDnf ? withAlpha(t.surface, 0.88) : undefined,
          padding: isDnf ? [1, 4] : undefined,
          borderRadius: isDnf ? 3 : undefined,
        },
        labelLayout: { moveOverlap: "shiftY", hideOverlap: false },
        markLine:
          i === 0
            ? {
                silent: true,
                symbol: "none",
                animation: false,
                lineStyle: { color: t.inkSub, width: 1, type: "dashed", opacity: 0.6 },
                label: { show: false },
                data: [{ xAxis: currentLap }],
              }
            : undefined,
        data: visible.map((v, vi) => {
          const isPit = v.lap > 0 && (pits?.has(v.lap) ?? false);
          const isDnfMarker = isDnf && vi === lastVisibleIndex;
          return {
            value: [v.lap, v.position],
            symbol: isDnfMarker ? "circle" : isPit ? "diamond" : "circle",
            symbolSize: isDnfMarker ? 10 : isPit ? 9 : 0,
            itemStyle: isDnfMarker ? { color: t.neg, borderColor: t.surface, borderWidth: 2 } : undefined,
          };
        }),
        tooltip: {
          formatter: (p: unknown) => {
            const { value, dataIndex } = p as { value: [number, number]; dataIndex: number };
            const isPit = value[0] > 0 && (pits?.has(value[0]) ?? false);
            const isDnfPoint = isDnf && dataIndex === lastVisibleIndex;
            return C.tip(d.code, [
              C.tipRow("LAP", value[0] === 0 ? "Grid" : `${value[0]}`),
              C.tipRow("POSITION", `P${value[1]}`),
              ...(isPit ? [C.tipRow("PIT STOP", "yes", { swatch: d.color })] : []),
              ...(isDnfPoint ? [C.tipRow("STATUS", (reason ?? "Retired").toUpperCase(), { swatch: t.neg })] : []),
            ]);
          },
        },
      };
    });

    return {
      animation: false,
      grid: { ...C.baseGrid, right: 30, top: 10, bottom: 4 },
      tooltip: { ...C.baseTooltip, trigger: "item" },
      xAxis: C.valueAxis({ min: 0, max: maxLap, minInterval: 1 }),
      yAxis: {
        type: "value",
        inverse: true,
        min: 1,
        max: maxPosition,
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...C.axisLabel, formatter: "P{value}" },
        splitLine: { lineStyle: { color: t.gridLine, width: 1, type: "solid" } },
      },
      series,
    };
  }, [seriesByDriverWithGrid, pitDurations, retiredLastLap, retiredReason, currentLap, maxLap, C, t]);

  return (
    <div className="px-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-2 py-4">
        <div>
          <p className="eyebrow">Home / Terminal / Race Replay</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-ink">
            Race Replay
            <span className="ml-2 font-mono text-sm font-medium text-sub">{filters.year} Season</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <GlassSelect
            label="Season"
            value={filters.year}
            options={[...years].reverse().map((y) => ({ value: y, label: String(y) }))}
            onChange={(y) => set({ year: y })}
          />
          <GlassSelect
            label="Round"
            value={filters.round ?? 0}
            align="right"
            options={[
              { value: 0, label: "Latest" },
              ...rounds.map((r) => ({
                value: r.number,
                label: `R${r.number} · ${shortRoundName(r.name) || r.number}`,
              })),
            ]}
            onChange={(n) => set({ round: n === 0 ? null : n })}
          />
        </div>
      </header>

      {!empty && (
        <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl border border-stroke bg-surface px-3 py-2.5">
          <div className="flex flex-none items-center gap-1">
            <button
              onClick={() => setCurrentLap(0)}
              aria-label="Restart"
              disabled={loading}
              className="rounded-md p-1.5 text-mut transition-colors hover:bg-raised hover:text-ink disabled:opacity-40"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => setCurrentLap((l) => Math.max(0, l - 1))}
              aria-label="Previous lap"
              disabled={loading}
              className="rounded-md p-1.5 text-mut transition-colors hover:bg-raised hover:text-ink disabled:opacity-40"
            >
              <SkipBack size={13} />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              disabled={loading || maxLap === 0}
              className="rounded-md border border-stroke bg-raised p-1.5 text-ink transition-colors hover:border-stroke-strong disabled:opacity-40"
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              onClick={() => setCurrentLap((l) => Math.min(maxLap, l + 1))}
              aria-label="Next lap"
              disabled={loading}
              className="rounded-md p-1.5 text-mut transition-colors hover:bg-raised hover:text-ink disabled:opacity-40"
            >
              <SkipForward size={13} />
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(1, maxLap)}
            value={currentLap}
            disabled={loading || maxLap === 0}
            onChange={(e) => setCurrentLap(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer accent-accent disabled:cursor-not-allowed"
          />

          <span className="flex-none whitespace-nowrap font-mono text-[11px] tabular-nums text-sub">
            LAP {currentLap} / {maxLap || "—"}
          </span>

          <Segmented
            ariaLabel="Playback speed"
            value={speed}
            onChange={setSpeed}
            options={[
              { value: "0.5", label: "0.5×" },
              { value: "1", label: "1×" },
              { value: "2", label: "2×" },
              { value: "4", label: "4×" },
            ]}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
        <AnalyticsCard
          eyebrow="Race · Replay"
          title="Lap-by-lap standings"
          subtitle={
            round
              ? `R${round} ${shortRoundName(roundName)} · lap ${currentLap}/${maxLap || "—"} · Race sessions`
              : String(filters.year)
          }
          loading={loading}
          error={(lapsQuery.error as Error | null) ?? (stopsQuery.error as Error | null)}
          onRetry={() => lapsQuery.refetch()}
          empty={empty}
          emptyText="No lap-by-lap data for this round yet — lap timing isn't ingested for every round; try another round or season."
          className="min-h-[420px] xl:col-span-5"
          bodyClassName="p-2"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-stroke px-2.5 py-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">
              <span className="w-7">POS</span>
              <span className="w-3" />
              <span className="flex-1">DRIVER</span>
              <span className="w-11 text-right">+/−</span>
              <span className="w-11 text-right">NET</span>
              <span className="w-16 text-right">AHEAD</span>
              <span className="w-16 text-right">LEADER</span>
              <span className="w-16 text-right">LAP TIME</span>
            </div>
            <AnimatePresence initial={false}>
              {standings.map((row) => (
                <motion.div
                  key={row.driverId}
                  layout
                  layoutId={`replay-row-${row.driverId}`}
                  transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.6 }}
                  className={`flex items-center gap-2 border-b border-stroke/60 px-2.5 py-2 last:border-0 ${
                    row.retired ? "opacity-55" : ""
                  }`}
                >
                  <span
                    className={`w-7 font-mono text-[12px] font-semibold tabular-nums ${
                      row.retired ? "text-mut" : row.position === 1 ? "text-accent" : "text-ink"
                    }`}
                  >
                    {row.retired ? "—" : (row.position ?? "—")}
                  </span>
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 flex-none rounded-[2px]"
                    style={{ background: row.color }}
                  />
                  <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                    <span className="font-sans text-[12px] font-medium text-ink">{row.code}</span>
                    <span className="truncate font-sans text-[11px] text-sub">
                      {row.surname}
                      {row.teamName && row.teamName !== "—" && <span className="text-mut"> · {row.teamName}</span>}
                    </span>
                    {row.pitted && (
                      <span className="flex-none rounded-sm bg-amber/15 px-1 font-mono text-[9px] font-semibold text-amber">
                        PIT {row.pitDurationSec != null ? `${row.pitDurationSec.toFixed(1)}s` : ""}
                      </span>
                    )}
                    {row.retired && (
                      <span className="flex-none whitespace-nowrap rounded-sm bg-neg/15 px-1 font-mono text-[9px] font-semibold uppercase text-neg">
                        {row.neverStarted ? "Never started" : row.finalStatus || "Retired"}
                      </span>
                    )}
                  </span>
                  <span
                    className={`w-11 text-right font-mono text-[11px] font-semibold tabular-nums ${
                      row.delta == null ? "text-mut" : row.delta > 0 ? "text-pos" : row.delta < 0 ? "text-neg" : "text-mut"
                    }`}
                  >
                    {row.delta == null ? "—" : row.delta > 0 ? `▲${row.delta}` : row.delta < 0 ? `▼${-row.delta}` : "="}
                  </span>
                  <span
                    className={`w-11 text-right font-mono text-[11px] font-semibold tabular-nums ${
                      row.netDelta == null
                        ? "text-mut"
                        : row.netDelta > 0
                          ? "text-pos"
                          : row.netDelta < 0
                            ? "text-neg"
                            : "text-mut"
                    }`}
                  >
                    {row.netDelta == null
                      ? "—"
                      : row.netDelta > 0
                        ? `▲${row.netDelta}`
                        : row.netDelta < 0
                          ? `▼${-row.netDelta}`
                          : "="}
                  </span>
                  <span
                    className={`w-16 text-right font-mono text-[11px] tabular-nums ${
                      row.gapToAheadSec == null
                        ? "text-mut"
                        : row.gapToAheadSec > 0
                          ? "text-neg"
                          : row.gapToAheadSec < 0
                            ? "text-pos"
                            : "text-mut"
                    }`}
                  >
                    {formatGap(row.gapToAheadSec)}
                  </span>
                  <span
                    className={`w-16 text-right font-mono text-[11px] tabular-nums ${
                      row.gapToLeaderSec == null
                        ? "text-mut"
                        : row.gapToLeaderSec > 0
                          ? "text-neg"
                          : row.gapToLeaderSec < 0
                            ? "text-pos"
                            : "text-mut"
                    }`}
                  >
                    {formatGap(row.gapToLeaderSec)}
                  </span>
                  <span className="w-16 text-right font-mono text-[11px] tabular-nums text-sub">
                    {formatLapTime(row.lapTimeSec)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          eyebrow="Race · Replay"
          title="Position trace"
          subtitle={round ? `R${round} ${shortRoundName(roundName)} · through lap ${currentLap}` : String(filters.year)}
          loading={loading}
          error={lapsQuery.error as Error | null}
          onRetry={() => lapsQuery.refetch()}
          empty={empty}
          emptyText="No lap-by-lap data for this round yet."
          className="min-h-[420px] xl:col-span-7"
          bodyClassName="p-2"
        >
          {chartOption && <EChart option={chartOption} />}
        </AnalyticsCard>
      </div>
    </div>
  );
}

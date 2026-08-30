/** TanStack Query hooks — one hook per reusable analytical dataset.
 *  Historical data never changes, so staleTime is Infinity and refetches are
 *  filter-key driven. keepPreviousData avoids skeleton flashes on refetch. */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import type {
  ChampionshipProgression,
  Circuit,
  CircuitRacecraftRow,
  CircuitSummaryRow,
  Driver,
  DriverAgeRow,
  DriverRef,
  DriverSummaryRow,
  GridFinishDensityRow,
  HeadToHead,
  LapPositionRow,
  Page,
  PitStopRow,
  PolymarketMarketsResponse,
  QualifyingSegmentsResponse,
  Round,
  SessionResult,
  SessionType,
  SummaryResponse,
  Team,
  TeamDriver,
  TeamHeadToHead,
  TeamRef,
  TeamSummaryRow,
  TrackTypeIndexRow,
} from "@/lib/types";

const FOREVER = { staleTime: Infinity, placeholderData: keepPreviousData } as const;

/** Season × session-type slice of the session-results dataset.
 *  Max ~480 rows (24 rounds × 20 cars) — powers the results table,
 *  grid→finish, fastest-lap gap, heatmap and points-by-round client-side. */
export function useSeasonResults(year: number, sessionType: SessionType) {
  return useQuery({
    queryKey: ["results", year, sessionType],
    queryFn: () =>
      fetchJson<Page<SessionResult>>("/results", {
        year,
        session_type: sessionType,
        limit: 500,
      }),
    ...FOREVER,
  });
}

export function useDriverProgression(year: number) {
  return useQuery({
    queryKey: ["champ-drivers", year],
    queryFn: () =>
      fetchJson<ChampionshipProgression<DriverRef>>(
        "/analytics/championships/drivers/progression",
        { year },
      ),
    retry: false,
    ...FOREVER,
  });
}

export function useTeamProgression(year: number) {
  return useQuery({
    queryKey: ["champ-teams", year],
    queryFn: () =>
      fetchJson<ChampionshipProgression<TeamRef>>(
        "/analytics/championships/teams/progression",
        { year },
      ),
    retry: false,
    ...FOREVER,
  });
}

/** Season seat map: team↔driver pairs + season aggregates + contribution.
 *  Single source for entity dropdowns, identity colors, and H2H defaults. */
export function useSeatMap(year: number) {
  return useQuery({
    queryKey: ["seat-map", year],
    queryFn: () =>
      fetchJson<SummaryResponse<TeamSummaryRow>>("/analytics/teams/summary", {
        year,
        group_by: "team_driver",
      }),
    ...FOREVER,
  });
}

export function useHeadToHead(
  a: number | null,
  b: number | null,
  year: number,
  sessionType: SessionType,
) {
  return useQuery({
    queryKey: ["h2h", a, b, year, sessionType],
    queryFn: () =>
      fetchJson<HeadToHead>("/analytics/comparisons/drivers", {
        driver_a: a,
        driver_b: b,
        year,
        session_type: sessionType,
      }),
    enabled: a != null && b != null && a !== b,
    ...FOREVER,
  });
}

/** Circuit aggregates for one season (map markers + geo tooltips). */
export function useCircuitPerformance(year: number) {
  return useQuery({
    queryKey: ["circuit-perf", year],
    queryFn: () =>
      fetchJson<SummaryResponse<CircuitSummaryRow>>("/analytics/circuits/performance", {
        year,
      }),
    ...FOREVER,
  });
}

/** Circuit racecraft (pole conversion, order shuffle) over a fixed
 *  multi-season window — deliberately independent of the season filter. */
export function useCircuitRacecraft(yearFrom: number, yearTo: number) {
  return useQuery({
    queryKey: ["circuit-racecraft", yearFrom, yearTo],
    queryFn: () =>
      fetchJson<SummaryResponse<CircuitRacecraftRow>>("/analytics/circuits/racecraft", {
        year_from: yearFrom,
        year_to: yearTo,
      }),
    ...FOREVER,
  });
}

/** Start→finish density field over a fixed multi-season window
 *  (classified finishers, pre-aggregated per grid×position cell). */
export function useGridFinishDensity(yearFrom: number, yearTo: number) {
  return useQuery({
    queryKey: ["grid-finish-density", yearFrom, yearTo],
    queryFn: () =>
      fetchJson<SummaryResponse<GridFinishDensityRow>>("/analytics/results/grid-finish-density", {
        year_from: yearFrom,
        year_to: yearTo,
      }),
    ...FOREVER,
  });
}

/** Circuit × driver aggregates over a multi-season window (matrix). */
export function useCircuitDriverMatrix(yearFrom: number, yearTo: number, driverIds: number[]) {
  return useQuery({
    queryKey: ["circuit-matrix", yearFrom, yearTo, [...driverIds].sort((x, y) => x - y)],
    queryFn: () =>
      fetchJson<SummaryResponse<CircuitSummaryRow>>("/analytics/circuits/performance", {
        year_from: yearFrom,
        year_to: yearTo,
        group_by: "circuit_driver",
        driver_ids: driverIds.length ? driverIds : undefined,
      }),
    ...FOREVER,
  });
}

/** Season race calendar — all rounds of a year in order. */
export function useSeasonRounds(year: number) {
  return useQuery({
    queryKey: ["rounds", year],
    queryFn: () => fetchJson<Page<Round>>("/rounds", { year, limit: 100 }),
    ...FOREVER,
  });
}

/** Full circuit reference table (coords power the calendar globe). */
export function useCircuits() {
  return useQuery({
    queryKey: ["circuits"],
    queryFn: () => fetchJson<Page<Circuit>>("/circuits", { limit: 500 }),
    ...FOREVER,
  });
}

/** Teams that entered a given season — the Team Profiles selector strip. */
export function useTeams(year: number) {
  return useQuery({
    queryKey: ["teams", year],
    queryFn: () => fetchJson<Page<Team>>("/teams", { year, limit: 50 }),
    ...FOREVER,
  });
}

/** A team's driver line-up for one season (expected: 2 seats). */
export function useTeamRoster(teamId: number | null, year: number) {
  return useQuery({
    queryKey: ["team-roster", teamId, year],
    queryFn: () => fetchJson<TeamDriver[]>(`/teams/${teamId}/drivers`, { year }),
    enabled: teamId != null,
    ...FOREVER,
  });
}

/** Q1/Q2/Q3 times + final position for every driver in one round, pivoted
 *  from the three synthetic Quali_Q1/Q2/Q3 sessions into one row per driver. */
export function useQualifyingSegments(year: number, roundNumber: number | null) {
  return useQuery({
    queryKey: ["quali-segments", year, roundNumber],
    queryFn: () =>
      fetchJson<QualifyingSegmentsResponse>("/analytics/qualifying/segments", {
        year,
        round_number: roundNumber!,
      }),
    enabled: roundNumber != null,
    ...FOREVER,
  });
}

/** Career (all-time, no year filter) aggregate for one driver — wins/starts/podiums. */
export function useDriverCareer(driverId: number | null) {
  return useQuery({
    queryKey: ["driver-career", driverId],
    queryFn: () =>
      fetchJson<SummaryResponse<DriverSummaryRow>>("/analytics/drivers/summary", {
        driver_id: driverId!,
        group_by: "driver",
      }),
    enabled: driverId != null,
    ...FOREVER,
  });
}

/** Every seat a driver has held, ordered by year — first/current team. */
export function useDriverSeasons(driverId: number | null) {
  return useQuery({
    queryKey: ["driver-seasons", driverId],
    queryFn: () => fetchJson<TeamDriver[]>(`/drivers/${driverId}/seasons`),
    enabled: driverId != null,
    ...FOREVER,
  });
}

/** Driver bio (name, DOB, nationality) for the Team Profiles driver card. */
export function useDriver(driverId: number | null) {
  return useQuery({
    queryKey: ["driver", driverId],
    queryFn: () => fetchJson<Driver>(`/drivers/${driverId}`),
    enabled: driverId != null,
    ...FOREVER,
  });
}

/** Every individual stop for one round — which lap, how long. Metadata
 *  carries total_laps for the round (2025-only ingest). */
export function usePitStops(year: number, roundNumber: number | null) {
  return useQuery({
    queryKey: ["pitstops", year, roundNumber],
    queryFn: () =>
      fetchJson<SummaryResponse<PitStopRow>>("/analytics/pitstops/stops", {
        year,
        round_number: roundNumber!,
      }),
    enabled: roundNumber != null,
    ...FOREVER,
  });
}

/** Running position for every driver on every lap of one round — the
 *  substrate for lap-by-lap position charts and stint-length derivation. */
export function useLapPositions(year: number, roundNumber: number | null) {
  return useQuery({
    queryKey: ["lap-positions", year, roundNumber],
    queryFn: () =>
      fetchJson<SummaryResponse<LapPositionRow>>("/analytics/pitstops/laps", {
        year,
        round_number: roundNumber!,
      }),
    enabled: roundNumber != null,
    ...FOREVER,
  });
}

/** Career-wide performance by age-at-race for a set of drivers — independent
 *  of the season filter (spans 2011–2025). Omit driverIds for the full grid. */
export function useDriverAgeCurve(driverIds?: number[]) {
  return useQuery({
    queryKey: ["driver-age-curve", driverIds ? [...driverIds].sort((a, b) => a - b) : null],
    queryFn: () =>
      fetchJson<SummaryResponse<DriverAgeRow>>("/analytics/drivers/age-curve", {
        driver_ids: driverIds?.length ? driverIds : undefined,
      }),
    ...FOREVER,
  });
}

/** Driver/team points-per-start at each track_type vs their own overall
 *  average, over a multi-season window (default: full history). */
export function useTrackTypeIndex(
  groupBy: "driver" | "team",
  yearFrom?: number,
  yearTo?: number,
) {
  return useQuery({
    queryKey: ["track-type-index", groupBy, yearFrom, yearTo],
    queryFn: () =>
      fetchJson<SummaryResponse<TrackTypeIndexRow>>("/analytics/track-type/index", {
        group_by: groupBy,
        year_from: yearFrom,
        year_to: yearTo,
      }),
    ...FOREVER,
  });
}

/** Live F1 event odds from Polymarket — unlike the historical datasets
 *  above, this moves, so it's not cached forever. But it only refetches on
 *  mount (i.e. navigating to /prediction-markets), no background interval —
 *  staleTime:0 just means a revisit always gets a fresh snapshot rather
 *  than a possibly-minutes-old cached one. */
export function usePolymarketMarkets() {
  return useQuery({
    queryKey: ["polymarket-markets"],
    queryFn: () =>
      fetchJson<PolymarketMarketsResponse>("/markets/polymarket", {
        event_limit: 20,
        markets_per_event: 4,
      }),
    staleTime: 0,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export function useTeamHeadToHead(
  a: number | null,
  b: number | null,
  year: number,
  sessionType: SessionType,
) {
  return useQuery({
    queryKey: ["team-h2h", a, b, year, sessionType],
    queryFn: () =>
      fetchJson<TeamHeadToHead>("/analytics/comparisons/teams", {
        team_a: a,
        team_b: b,
        year,
        session_type: sessionType,
      }),
    enabled: a != null && b != null && a !== b,
    ...FOREVER,
  });
}

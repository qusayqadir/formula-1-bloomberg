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
  DriverRef,
  GridFinishDensityRow,
  HeadToHead,
  Page,
  Round,
  SessionResult,
  SessionType,
  SummaryResponse,
  TeamRef,
  TeamSummaryRow,
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

/** Typed mirror of the backend response DTOs (app/router/schemas.py +
 *  app/router/analytics/schemas.py). Fields map 1:1 to the API. */

export type SessionType =
  | "FP1"
  | "FP2"
  | "FP3"
  | "Qualifying"
  | "Race"
  | "Sprint"
  | "SprintQualifying";

export interface Page<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export interface FilterOptions {
  years: number[];
  session_types: string[];
  driver_nationalities: string[];
  team_nationalities: string[];
  circuit_countries: string[];
}

export interface DriverRef {
  id: number;
  forename: string;
  surname: string;
  abbreviation: string | null;
}

export interface TeamRef {
  id: number;
  name: string;
  primary_color: string | null;
}

export interface Round {
  id: number;
  season_id: number;
  year: number;
  circuit_id: number;
  circuit_name: string;
  number: number | null;
  name: string | null;
  date: string | null;
  is_cancelled: boolean | null;
}

/** GET /results — one row per session entry (the core analytical dataset). */
export interface SessionResult {
  id: number;
  session_id: number;
  session_type: string | null;
  round_id: number;
  round_name: string | null;
  year: number;
  round_number: number | null;
  circuit_id: number;
  circuit_name: string;
  driver_id: number;
  driver_forename: string;
  driver_surname: string;
  driver_abbreviation: string | null;
  team_id: number;
  team_name: string;
  car_number: number | null;
  position: number | null;
  position_text: string | null;
  is_classified: boolean | null;
  status: string | null;
  points: number | null;
  is_eligible_for_points: boolean | null;
  grid: number | null;
  fastest_lap_time: string | null; // ISO 8601 duration
  fastest_lap_rank: number | null;
  laps_completed: number | null;
  positions_gained: number | null;
  fastest_lap_gap: string | null; // ISO 8601 duration vs session best
}

/** GET /analytics/championships/{drivers|teams}/progression */
export interface ChampionshipPoint {
  round_id: number | null;
  round_number: number;
  round_name: string | null;
  position: number | null;
  points: number;
  win_count: number;
  highest_finish: number | null;
  is_eligible: boolean | null;
  points_gained: number;
  gap_to_leader: number;
}

export interface ChampionshipProgression<E> {
  metadata: Record<string, unknown>;
  series: { entity: E; values: ChampionshipPoint[] }[];
}

/** Shared aggregate block for the summary datasets. */
export interface ResultAggregates {
  starts: number;
  total_points: number | null;
  avg_points: number | null;
  wins: number;
  podiums: number;
  avg_finish: number | null;
  median_finish: number | null;
  best_finish: number | null;
  worst_finish: number | null;
  finish_stddev: number | null;
  avg_grid: number | null;
  best_grid: number | null;
  avg_positions_gained: number | null;
  avg_fastest_lap_rank: number | null;
  total_laps_completed: number | null;
  avg_laps_completed: number | null;
  classification_rate: number | null;
}

export interface TeamSummaryRow extends ResultAggregates {
  team: TeamRef;
  year: number | null;
  circuit_id: number | null;
  circuit_name: string | null;
  driver: DriverRef | null;
  share_of_team_points: number | null;
}

export interface CircuitSummaryRow extends ResultAggregates {
  circuit_id: number;
  circuit_name: string;
  country: string | null;
  country_code: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  events: number;
  driver: DriverRef | null;
  team: TeamRef | null;
}

export interface SummaryResponse<Row> {
  metadata: Record<string, unknown>;
  rows: Row[];
}

/** GET /analytics/circuits/racecraft — pole conversion / processionality. */
export interface CircuitRacecraftRow {
  circuit_id: number;
  circuit_name: string;
  country_code: string | null;
  races: number;
  pole_starts: number;
  pole_wins: number;
  pole_win_rate: number | null;
  front_row_wins: number;
  front_row_win_rate: number | null;
  winner_avg_grid: number | null;
  avg_abs_position_change: number | null;
}

/** GET /analytics/results/grid-finish-density — hex-binned start/finish field. */
export interface GridFinishDensityRow {
  grid: number;
  position: number;
  count: number;
}

/** GET /analytics/comparisons/drivers */
export interface HeadToHeadRow {
  session_id: number;
  session_type: string | null;
  year: number;
  round_number: number | null;
  round_name: string | null;
  circuit_name: string | null;
  a_position: number | null;
  b_position: number | null;
  a_grid: number | null;
  b_grid: number | null;
  a_points: number | null;
  b_points: number | null;
  a_fastest_lap_rank: number | null;
  b_fastest_lap_rank: number | null;
  a_fastest_lap_time: string | null;
  b_fastest_lap_time: string | null;
  a_is_classified: boolean | null;
  b_is_classified: boolean | null;
}

export interface HeadToHead {
  metadata: Record<string, unknown>;
  driver_a: DriverRef;
  driver_b: DriverRef;
  summary: {
    shared_sessions: number;
    position: { a: number; b: number };
    grid: { a: number; b: number };
    fastest_lap_rank: { a: number; b: number };
    a_total_points: number;
    b_total_points: number;
    a_wins: number;
    b_wins: number;
    a_avg_finish: number | null;
    b_avg_finish: number | null;
    a_avg_grid: number | null;
    b_avg_grid: number | null;
  };
  rows: HeadToHeadRow[];
}

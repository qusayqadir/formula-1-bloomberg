/** Typed mirror of the backend response DTOs (app/router/schemas.py +
 *  app/router/analytics/schemas.py). Fields map 1:1 to the API. */

export type SessionType =
  | "FP1"
  | "FP2"
  | "FP3"
  | "Qualifying"
  | "Quali_Q1"
  | "Quali_Q2"
  | "Quali_Q3"
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

/** GET /teams, GET /teams/{id} */
export interface Team {
  id: number;
  api_id: string;
  name: string;
  nationality: string | null;
  country_code: string | null;
  primary_color: string | null;
  wikipedia: string | null;
}

/** GET /drivers, GET /drivers/{id} */
export interface Driver {
  id: number;
  api_id: string;
  reference: string | null;
  forename: string;
  surname: string;
  abbreviation: string | null;
  permanent_car_number: number | null;
  date_of_birth: string | null;
  nationality: string | null;
  country_code: string | null;
  wikipedia: string | null;
}

/** GET /teams/{id}/drivers, GET /drivers/{id}/seasons — a seat held for one season. */
export interface TeamDriver {
  id: number;
  api_id: string;
  season_id: number;
  year: number;
  team_id: number;
  team_name: string;
  driver_id: number;
  driver_forename: string;
  driver_surname: string;
}

export interface Circuit {
  id: number;
  api_id: string;
  reference: string | null;
  name: string;
  locality: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  wikipedia: string | null;
  track_length: number | null;
  turns: number | null;
  race_laps: number | null;
  lap_record_s: number | null;
  record_holder: string | null;
  track_type: string | null;
  drs_zones: number | null;
  elevation_gain: number | null;
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

export interface DriverSummaryRow extends ResultAggregates {
  driver: DriverRef;
  year: number | null;
  circuit_id: number | null;
  circuit_name: string | null;
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

/** GET /analytics/comparisons/teams */
export interface TeamHeadToHeadRow {
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
}

export interface TeamHeadToHead {
  metadata: Record<string, unknown>;
  team_a: TeamRef;
  team_b: TeamRef;
  summary: {
    shared_sessions: number;
    position: { a: number; b: number };
    grid: { a: number; b: number };
    a_total_points: number;
    b_total_points: number;
    a_wins: number;
    b_wins: number;
    a_avg_finish: number | null;
    b_avg_finish: number | null;
    a_avg_grid: number | null;
    b_avg_grid: number | null;
  };
  rows: TeamHeadToHeadRow[];
}

export interface QualifyingSegmentRow {
  driver: DriverRef;
  team: TeamRef;
  final_position: number | null;
  q1_time: string | null;
  q2_time: string | null;
  q3_time: string | null;
}

export interface QualifyingSegmentsResponse {
  metadata: Record<string, unknown>;
  rows: QualifyingSegmentRow[];
}

/** GET /analytics/pitstops/stops — one row per stop, one focused round;
 *  duration_sec is the full pit-lane time (entry to exit). Coverage is partial
 *  (bronze gap: pit-stop rows are ingested for a subset of seasons only). */
export interface PitStopRow {
  round_id: number;
  year: number;
  round_number: number | null;
  round_name: string | null;
  driver: DriverRef;
  team: TeamRef | null;
  pitstop_number: number | null;
  lap_number: number | null;
  duration_sec: number | null;
}

/** GET /analytics/pitstops/laps — one row per driver per lap (running
 *  position), one focused round. Substrate for lap-by-lap position charts
 *  and stint-length derivation. */
export interface LapPositionRow {
  round_id: number;
  year: number;
  round_number: number | null;
  round_name: string | null;
  driver: DriverRef;
  team: TeamRef | null;
  lap_number: number;
  position: number | null;
  lap_time_sec: number | null;
}

/** GET /analytics/drivers/age-curve — one row per driver per age-year,
 *  career-wide (2011 → latest season, independent of the season filter). */
export interface DriverAgeRow {
  driver: DriverRef;
  age: number;
  starts: number;
  avg_points: number | null;
  avg_finish: number | null;
  total_points: number;
}

/** GET /analytics/track-type/index — driver/team points-per-start at each
 *  track_type vs their own overall average. */
export interface TrackTypeIndexRow {
  driver: DriverRef | null;
  team: TeamRef | null;
  track_type: string;
  starts: number;
  avg_points: number;
  avg_points_overall: number;
  index: number;
}

/** GET /markets/polymarket — live F1 event odds from Polymarket's public
 *  API (not backed by Postgres). An "event" (e.g. "F1 Drivers' Champion")
 *  bundles several candidate markets, one Yes/No pair per outcome; each
 *  carries its own price history so a single card can chart every
 *  candidate as its own line, mirroring Polymarket's own event chart.
 *  Prices are 0-100; `no_price` is always `100 - yes_price` since every
 *  underlying market is binary Yes/No. */
export interface PolymarketPricePoint {
  t: number; // unix seconds
  yes_price: number;
}

export interface PolymarketMarketSeries {
  market_id: string;
  outcome_label: string; // candidate name (e.g. "Lando Norris"), or "Yes" for a plain binary event
  yes_price: number;
  no_price: number;
  volume: number;
  liquidity: number;
  price_history: PolymarketPricePoint[];
}

export interface PolymarketEvent {
  event_id: string;
  event_title: string;
  event_volume: number;
  event_liquidity: number;
  expiry: string | null;
  // "closed" when backfilled — there weren't enough live events to fill
  // the page, so the most recently expired ones fill the remaining slots.
  status: "active" | "closed";
  markets: PolymarketMarketSeries[];
}

export interface PolymarketMarketsResponse {
  events: PolymarketEvent[];
}

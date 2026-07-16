# 01 — Historical Results Dashboard

## Goal
Data-dense dashboard over the existing DB: race results, podiums, driver
championship standings, constructor (team) championship standings, season
comparisons. 100% powered by existing tables — no external APIs.

## Data mapping (existing schema only)
- Race results: `session` (filter type = race) → `session_entry` (position,
  points, status, grid, fastest_lap_time, laps_completed) → `round_entry` →
  `team_driver` → `drivers`/`team`.
- Driver standings: `driver_championship` (per round: position, points,
  win_count, highest_finish) — round_number gives progression within a season.
- Constructor standings: `team_championship` (same shape).
- Podiums: session_entry.position ≤ 3 on race sessions, is_classified true.

## API (src/api/routers/historical.py)
- GET /api/seasons → list 2011–2025
- GET /api/seasons/{year}/rounds
- GET /api/rounds/{round_id}/results?session_type=race|qualifying|...
- GET /api/seasons/{year}/standings/drivers?through_round=N
- GET /api/seasons/{year}/standings/teams?through_round=N
- GET /api/drivers/{id}/summary?season=YYYY (podiums, wins, avg finish, points)

## UI (route: /results)
- Left rail: season selector (2011–2025) + round list with country codes.
- Main grid: results table (POS, NO, DRIVER, TEAM, GRID, +/- grid delta
  colored, TIME/STATUS, PTS, FL marker); standings panel with championship
  progression line chart (one line per driver/team, stroked in team.primary_color);
  podium strip; points-delta column with green/red tick flash on data change.
- Standings chart supports driver vs constructor toggle and round scrubbing.

## Acceptance criteria
1. `curl /api/seasons` returns exactly the years present in `season` (2011–2025), nothing else.
2. Results for a known round match the DB: evaluator picks one round, runs the
   SQL by hand, and diffs against the API response (positions, points, status).
3. Standings endpoint at through_round=final equals the last
   driver_championship/team_championship rows for that season.
4. Requesting a season outside 2011–2025 returns 404 with a JSON error body.
5. No query reads from a non-existent table (no sprint tables referenced anywhere).
6. /results renders with data, has loading/empty states, passes design-reviewer.
7. p95 of each endpoint < 300ms locally (simple `time curl` evidence is fine).

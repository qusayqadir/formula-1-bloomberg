# 06 — Team Profiles (2011–2026)

## Goal
Per-team, per-year profile: pit wall personnel (name, photo, role, tenure),
drivers (names + photos), and car (name/designation + photo). Year range
2011–2026.

## Data reality
Pit wall personnel and car designations are NOT in the DB or any public API.
This spec adds NEW app-schema tables (alembic branch `app`, in
src/api/models.py — ingest schema untouched):
- `team_personnel`: id, team_id (FK→team.id), year, name, role,
  photo_url, joined_year, ingested_at. Unique (team_id, year, name, role).
- `team_car`: id, team_id, year, car_name, photo_url. Unique (team_id, year).
- `driver_photo`: id, driver_id (FK→drivers.id), year, photo_url.
- scripts/scaffold_personnel.py inserts stub rows (name='TODO') for every
  team×year combo found in `team_driver` (2011–2025) + 2026 stubs for teams
  present in 2025, so the human fills real data incrementally — via SQL, a
  CSV import path in the same script, or later an admin form.
- Drivers/teams/stats come from the existing DB; new tables only add
  personnel, car designations, and photos. Photo fields hold URLs or
  /public/img paths the human supplies — never auto-scrape copyrighted images.
- Tenure = computed: `year - joined_year` rendered as "12 YRS".

## API (src/api/routers/teams.py)
- GET /api/teams?season=YYYY
- GET /api/teams/{reference}/profile?year=YYYY → { team, pit_wall[], car,
  drivers[] (with that-season stats from DB) }

## UI (route: /teams and /teams/{reference}?year=YYYY)
- /teams: grid of team cards (current season), team primary_color edge strip.
- Team page: year scrubber 2011–2026 (years with no DB presence dimmed);
  PIT WALL section (photo, NAME, ROLE microlabel, tenure); DRIVERS section
  (photo, name, car number, that-season stats pulled from DB: points, podiums);
  CAR section. Missing seed data renders structured "AWAITING DATA" placeholders
  (mono silhouette block), never broken images.

## Acceptance criteria
1. New tables exist ONLY under the `app` alembic branch; `alembic upgrade head`
   applies cleanly; ingest schema diff is empty.
2. Every team×season pairing in `team_driver` (2011–2025) is reachable via the
   year scrubber; counts match a SQL check against the new tables' stub rows.
3. Driver season stats on the page match the DB (evaluator spot-checks one
   driver-season against session_entry/driver_championship).
4. With only stub rows ('TODO'): pages render fully with AWAITING DATA states
   (no 'TODO' text leaks into the UI).
5. scaffold_personnel.py is idempotent and never overwrites rows where
   name != 'TODO' (human-filled data is safe). CSV import path round-trips.
6. 2026 renders from stubs without DB stats (clearly marked) and nothing 500s.
7. Theme compliance (design-reviewer PASS).

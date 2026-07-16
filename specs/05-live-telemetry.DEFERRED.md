> STATUS: DEFERRED — do not implement. Kept for future re-activation.

# 05 — Live Race Telemetry Dashboard (live + replay fallback)

## Goal
Real-time race dashboard: live lap positions, race alerts (team radio,
penalties, pit stops), win odds, lap counter, track/air temp, wind, and
per-driver telemetry (tyre age/compound, throttle, brake, DRS, speed, gear,
sector times). Works any day via replay of a recorded session.

## Architecture
- Source: OpenF1 API (OPENF1_BASE_URL). Endpoints used: sessions, drivers,
  position, intervals, laps, pit, race_control, team_radio, weather, car_data,
  stints.
- `src/api/live/` service with two providers behind one interface:
  - LiveProvider — polls OpenF1 during an active session (respect rate limits).
  - ReplayProvider — streams a recorded session (REPLAY_SESSION_KEY) at 1× wall
    clock from cached JSONL in `data/replays/` (scripts/record_session.py
    downloads + normalizes one session for offline demo use; commit one sample).
  - LIVE_MODE=auto picks Live when OpenF1 reports a session in progress, else Replay.
- FastAPI WebSocket `/ws/live` broadcasting typed events:
  position_update, interval_update, lap_complete, pit, race_control, radio,
  weather, car_data, stint. Frontend consumes via a single useLiveFeed hook.
- Win odds: if ODDS_API_KEY set, live odds panel; otherwise compute a simple
  in-house win probability (position + interval + laps remaining heuristic),
  labelled "MODEL" vs "MARKET".

## UI (route: /live)
- Timing tower (left): POS, driver tag in team color, interval/gap, last lap,
  best lap, sector micro-bars (green/purple), tyre compound + age, pit count.
- Center: track map (reuse spec 03 geometry) with live dot positions if
  car position data available; else lap-progress bars.
- Right rail: RACE CONTROL feed (flags, penalties, investigations — red
  accents), TEAM RADIO feed (driver tag + transcript snippet), WEATHER panel
  (track temp, air temp, wind speed/direction, rainfall), WIN ODDS panel.
- Header strip: lap N/TOTAL, session clock, flag status banner (full-width
  color strip on SC/VSC/red).

## Acceptance criteria
1. `LIVE_MODE=replay` with the committed sample: dashboard plays the session —
   positions change, radio/race-control items append, weather updates. Evaluator
   watches ≥60s of feed via `websocat`/script and confirms event flow.
2. WebSocket events validate against the typed schema (pydantic models +
   generated TS types) — no `any` payloads.
3. Kill the feed mid-stream: UI shows STALE state with last-update timestamp;
   reconnects automatically when feed returns.
4. LIVE_MODE=auto with no active session and no replay file: in-theme
   "NO ACTIVE SESSION" state, no crash.
5. Timing tower sorts by position in real time; interval math (gap to leader vs
   gap ahead) spot-checked against raw feed values.
6. OpenF1 polling respects a configurable interval (≥ the documented limit) and
   backs off on 429s (evidence in logs).

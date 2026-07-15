# 02 — Sentiment & Betting Odds (display only)

## Goal
Historical + current sentiment around drivers/teams/races, and bookmaker odds
display. STRICTLY display/analytics — no wagering, no bet placement, no
account/money features.

## Sources (.env-gated, graceful offline states)
- Sentiment: Reddit API (r/formula1 et al.) — fetch recent posts/comments
  mentioning driver/team aliases; score with a local model (VADER or a small
  transformers pipeline) so no extra key is needed for scoring. Store scored
  aggregates in app tables (`src/api/models.py`: sentiment_snapshot —
  entity_type, entity_id, window_start, score, volume, source).
- Odds: The Odds API (ODDS_API_KEY) — outright winner + race winner markets.
  Cache responses in app table odds_snapshot to build history over time.
- "Historical" sentiment = whatever we accumulate from snapshots + an optional
  one-off backfill script. Be honest in the UI about coverage start date.

## API
- GET /api/sentiment/{entity_type}/{id}?window=7d|30d|season
- GET /api/sentiment/leaderboard?season=YYYY
- GET /api/odds/next-race  ·  GET /api/odds/championship
- POST /api/admin/refresh (manual pull; also a cron-able script scripts/pull_feeds.py)

## UI (route: /sentiment)
- Sentiment heat table: drivers × rolling windows, green/red scale, volume column.
- Time-series panel: sentiment line vs. championship position (dual axis) for a
  selected driver — the "narrative vs. results" view.
- Odds board: bookmaker-style grid, implied probability column, movement arrows
  vs. previous snapshot. Disclaimer microlabel: "DISPLAY ONLY — NOT A WAGERING SERVICE".

## Acceptance criteria
1. With no keys set: page renders, both panels show FEATURE OFFLINE state, zero
   uncaught errors in server logs or browser console.
2. With keys set (or fixtures): refresh pulls data, snapshots persist to app
   tables, and a second refresh is idempotent (no duplicate rows for same window).
3. Sentiment scores bounded [-1, 1]; leaderboard sums match snapshot rows (SQL check).
4. Odds panel converts decimal odds → implied probability correctly (evaluator
   spot-checks math).
5. New tables exist only under the app alembic branch; ingest schema untouched.
6. No wagering affordances anywhere (no "place bet", no stake inputs).

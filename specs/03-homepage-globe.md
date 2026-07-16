# 03 — Homepage: 3D Globe Calendar + Track Pages

> Track walk is NOT in scope here — see specs/07-track-walk-spike.md.

## Goal
Homepage shows the current season's race calendar on a 3D globe
(react-three-fiber), toggleable to a 2D map. Each circuit is a dot; clicking
opens a track panel: metadata, related news, up to 10 photos.

## Data
- Dots & calendar: `round` (current season) joined to `circuits`
  (latitude/longitude, name, locality, country, altitude, wikipedia).
- News: NEWS_API_KEY, query "<circuit name> OR <grand prix name>", cap 8 items.
- Photos: UNSPLASH_ACCESS_KEY, query circuit/locality, hard cap 10, lazy-loaded.

## UI
- `/` : 3D globe (drei + three-globe or custom points), amber dots, next race
  pulsing; bottom strip = horizontal calendar timeline with round numbers,
  dates, completed rounds dimmed. Button toggles 3D ⇄ 2D (equirectangular or
  Mapbox dark if token present; offline-capable 2D fallback must exist).
- Track panel (drawer): NAME / LOCALITY / COUNTRY / ALT / coords mono block,
  news list (timestamp + source), photo grid (≤10). Reserve a disabled
  "TRACK WALK — COMING SOON" button slot (wired later by spec 07).

## Acceptance criteria
1. Globe renders one dot per round of the current season from the DB — count
   equals `SELECT count(*) FROM round WHERE season = current` (evaluator checks).
2. 2D toggle works; with no MAPBOX_TOKEN the offline 2D fallback renders.
3. Track panel: with no news/photo keys, those sub-panels show FEATURE OFFLINE;
   metadata (from DB) always renders. Photo grid never exceeds 10.
4. prefers-reduced-motion disables auto-rotation and pulsing.
5. Theme compliance (design-reviewer PASS) — globe scene uses token colors.

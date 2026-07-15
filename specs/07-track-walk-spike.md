# 07 — Track Walk SPIKE (explore options, then decide)

> This is an EXPLORATION spec, not a build spec. Output = working mini-prototypes
> + a written comparison. The human picks the direction; a build spec follows.

## Question
What is the best way to deliver an interactive "track walk" experience that
fits the terminal aesthetic, works for all ~24 circuits, and doesn't require
hand-made 3D assets per track?

## Options to prototype (one circuit each, e.g. Monza — timebox each)
A. **Procedural neon ribbon (pure three.js)** — extrude a track ribbon from an
   OSM/Overpass centerline (scripts/fetch_track_geometry.py), camera follows
   the spline at eye height. Stylized Tron-on-black. Add elevation from an
   open DEM if cheap. Cost: free, offline. Risk: "abstract" feel.
B. **Mapbox GL 3D flyover** — Mapbox dark style + 3D terrain + free camera
   animated along the track line (MAPBOX_TOKEN). Real satellite/terrain
   context. Cost: token + usage. Risk: photoreal map may clash with theme;
   styling discipline needed (dark style, amber line).
C. **Cesium/Google Photorealistic 3D Tiles** — true photoreal city/track
   geometry where coverage exists. Highest wow. Cost: API key, heavier
   runtime, uneven circuit coverage. Risk: theme clash, perf.
D. **2.5D schematic walk** — SVG/canvas track map with a moving position
   cursor + synced data strip (corner names, DRS zones, elevation profile
   chart). Cheapest, most "terminal" of all. Risk: not really 3D.

## Deliverables
1. /labs/track-walk route with a switcher between the prototypes built
   (minimum: A and D; B if a token is provided; C is research-only unless keys exist).
2. DECISION.md comparing options on: asset pipeline per-circuit effort,
   perf (fps on mid hardware), theme fit, key/cost requirements, coverage of
   all 2026-calendar circuits, and a recommendation.
3. Reusable regardless of choice: fetch_track_geometry.py producing committed
   GeoJSON centerlines for all current circuits (used by options A/B/D and by
   future features).

## Acceptance criteria
1. Geometry script outputs valid GeoJSON for ≥ 20 of the current circuits;
   failures listed with reasons.
2. Prototype A: camera traverses the full Monza ribbon without clipping; runs
   ≥ 50fps locally (frame counter evidence).
3. Prototype D: position cursor + data strip stay in sync while scrubbing.
4. DECISION.md exists, is honest about tradeoffs, and ends with one
   recommendation + the build-spec outline for it.
5. Nothing from /labs leaks into main navigation; main app builds unaffected.

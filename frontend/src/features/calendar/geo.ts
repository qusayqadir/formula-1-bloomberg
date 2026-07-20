/** Land geometry for the calendar globe/map — world-atlas 110m topojson,
 *  decoded once at module load. 110m keeps the vertex count low enough to
 *  render + auto-rotate without latency. */
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import { formatLapTime } from "@/lib/format";
import type { Circuit } from "@/lib/types";

export type LonLat = [number, number];
/** One polygon = [outer ring, ...hole rings]. */
export type LandPolygon = LonLat[][];

function decode(): LandPolygon[] {
  // world-atlas objects.land is a single MultiPolygon geometry
  const topo = land110 as any;
  const geo = feature(topo, topo.objects.land) as any;
  const geoms = geo.type === "FeatureCollection" ? geo.features.map((f: any) => f.geometry) : [geo.geometry];
  const polys: LandPolygon[] = [];
  for (const g of geoms) {
    if (g.type === "Polygon") polys.push(g.coordinates);
    else if (g.type === "MultiPolygon") polys.push(...g.coordinates);
  }
  return polys;
}

export const LAND_POLYGONS: LandPolygon[] = decode();
export const LAND_RINGS: LonLat[][] = LAND_POLYGONS.flat();

/** Circuit metadata for the hover card, pre-formatted for display. */
export interface CircuitMeta {
  length: string;
  recordLap: string;
  recordHolder: string;
  turns: string;
  drsZones: string;
  trackType: string;
  elevationGain: string;
}

export function buildCircuitMeta(c: Circuit | undefined): CircuitMeta {
  return {
    length: c?.track_length != null ? `${c.track_length.toFixed(3)} km` : "— km",
    recordLap: formatLapTime(c?.lap_record_s ?? null),
    recordHolder: c?.record_holder ?? "—",
    turns: c?.turns != null ? String(c.turns) : "—",
    drsZones: c?.drs_zones != null ? String(c.drs_zones) : "—",
    trackType: c?.track_type ?? "—",
    elevationGain: c?.elevation_gain != null ? `${c.elevation_gain} m` : "— m",
  };
}

export type RaceStatus = "completed" | "current" | "future";

/** Calendar visualization palette (user-specified, theme-fixed). */
export const GLOBE_PALETTE = {
  page: "#050608",
  ocean: "#10141C",
  land: "#232936",
  coast: "#3C4658",
  grid: "#2B3442",
  atmosphere: "#245CFF",
  routeCompleted: "#5C6472",
  routeFuture: "#8B6A19",
  routeActive: "#FFCC33",
  markerCompleted: "#687386",
  markerFuture: "#4D8DFF",
  markerCurrent: "#F5F7FA",
  textPrimary: "#E8EBF0",
  textSecondary: "#858D9A",
  panelBg: "#101216",
  panelBorder: "#292E36",
} as const;

export const ROUTE_STYLES: Record<RaceStatus, { color: string; opacity: number; width: number }> = {
  completed: { color: GLOBE_PALETTE.routeCompleted, opacity: 0.16, width: 0.8 },
  future: { color: GLOBE_PALETTE.routeFuture, opacity: 0.36, width: 1.1 },
  current: { color: GLOBE_PALETTE.routeActive, opacity: 1, width: 2.2 }, // active leg
};

/** One stop of the season route, in round order. */
export interface RoutePoint {
  lat: number;
  lon: number;
  date: string | null; // race date — drives completed/active/future styling
}

/** A race location to plot, colored by status; `current` is the next race. */
export interface CircuitDot {
  circuitId: number;
  /** stable circuit slug (bronze api_id) — keys the track-layout image map */
  apiId: string | null;
  name: string;
  /** round label rendered beside the dot, e.g. "R3" */
  label: string;
  lat: number;
  lon: number;
  emphasis: boolean;
  status: RaceStatus;
  meta: CircuitMeta;
}

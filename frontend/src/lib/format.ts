/** Formatting helpers — lap times arrive as ISO 8601 durations (pydantic v2). */

const ISO_DURATION =
  /^(-?)P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

/** ISO 8601 duration → seconds (null on missing/unparseable). */
export function durationToSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = ISO_DURATION.exec(iso);
  if (!m) return null;
  const [, sign, d, h, min, s] = m;
  const total =
    (Number(d) || 0) * 86400 + (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
  return sign === "-" ? -total : total;
}

/** Known bronze-layer data defect (documented, not fixable client-side):
 *  some session entries store the race TOTAL time (>1h) or a gap (<30s) in
 *  fastest_lap_time. Treat anything outside a plausible F1 lap as missing. */
export function sanitizeLapSeconds(seconds: number | null): number | null {
  if (seconds == null || seconds < 40 || seconds > 900) return null;
  return seconds;
}

/** 91.234 → "1:31.234" (lap-time style). */
export function formatLapTime(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const rest = seconds - mins * 60;
  const restStr = rest.toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${restStr}` : rest.toFixed(3);
}

/** 0.167 → "+0.167"; 0 → "0.000". */
export function formatGap(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds)) return "—";
  return seconds === 0 ? "0.000" : `+${seconds.toFixed(3)}`;
}

export function formatNumber(v: number | null | undefined, dp = 1): string {
  if (v == null || !isFinite(v)) return "—";
  return Number(v).toFixed(dp).replace(/\.0+$/, (m) => (dp === 0 ? m : m === ".0".padEnd(dp + 1, "0") ? "" : m));
}

export function formatPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  return `${Math.round(v * 100)}%`;
}

export function formatPoints(v: number | null | undefined): string {
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Position for display: 1 → "P1"; unclassified rows fall back to position_text. */
export function formatPosition(position: number | null, positionText?: string | null): string {
  if (position != null) return `P${position}`;
  return positionText ?? "—";
}

export function driverCode(d: { abbreviation?: string | null; surname: string }): string {
  return (d.abbreviation ?? d.surname.slice(0, 3)).toUpperCase();
}

export function driverName(d: { forename: string; surname: string }): string {
  return `${d.forename} ${d.surname}`;
}

const SESSION_LABELS: Record<string, string> = {
  Quali_Q1: "Qualifying (Q1)",
  Quali_Q2: "Qualifying (Q2)",
  Quali_Q3: "Qualifying (Q3)",
};

/** Display label for a session type — segment sessions get a readable form. */
export function sessionLabel(sessionType: string): string {
  return SESSION_LABELS[sessionType] ?? sessionType;
}

/** "Bahrain Grand Prix" → "Bahrain" (dense axis labels). */
export function shortRoundName(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/\s+Grand Prix$/i, "");
}

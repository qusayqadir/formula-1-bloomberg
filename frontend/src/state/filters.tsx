/** Global dashboard filter state, backed by URL search params so analytical
 *  views are shareable/bookmarkable. The URL is the single source of truth. */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api";
import type { FilterOptions, SessionType } from "@/lib/types";

export interface DashboardFilters {
  year: number;
  /** Selected round number for session-level widgets (null = latest). */
  round: number | null;
  roundFrom: number | null;
  roundTo: number | null;
  sessionType: SessionType;
  driverIds: number[];
  teamIds: number[];
}

interface FiltersApi {
  filters: DashboardFilters;
  years: number[];
  /** Newest season we hold data for (max of `years`). Career-wide widgets use
   *  this as their upper bound so a freshly-ingested season is included without
   *  hunting down hardcoded year constants. */
  latestYear: number;
  set: (patch: Partial<DashboardFilters>) => void;
  toggleDriver: (id: number) => void;
  toggleTeam: (id: number) => void;
  reset: () => void;
  isDefault: boolean;
}

const FALLBACK_YEAR = 2026;
const FiltersContext = createContext<FiltersApi | null>(null);

function parseIds(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

function parseIntOrNull(value: string | null): number | null {
  const n = Number(value);
  return value != null && Number.isInteger(n) && n > 0 ? n : null;
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const meta = useQuery({
    queryKey: ["meta"],
    queryFn: () => fetchJson<FilterOptions>("/meta/filters"),
    staleTime: Infinity,
  });
  const years = meta.data?.years ?? [];
  const latestYear = years.length ? years[years.length - 1] : FALLBACK_YEAR;

  const filters = useMemo<DashboardFilters>(() => {
    const y = parseIntOrNull(params.get("y"));
    const st = params.get("st");
    return {
      year: y && (years.length === 0 || years.includes(y)) ? y : latestYear,
      round: parseIntOrNull(params.get("r")),
      roundFrom: parseIntOrNull(params.get("rf")),
      roundTo: parseIntOrNull(params.get("rt")),
      sessionType: (st as SessionType) || "Race",
      driverIds: parseIds(params.get("d")),
      teamIds: parseIds(params.get("t")),
    };
  }, [params, years, latestYear]);

  const set = useCallback(
    (patch: Partial<DashboardFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const merged = { ...filters, ...patch };
          // changing season invalidates round/driver/team selections
          if (patch.year !== undefined && patch.year !== filters.year) {
            merged.round = null;
            merged.roundFrom = null;
            merged.roundTo = null;
            merged.driverIds = [];
            merged.teamIds = [];
          }
          const write = (key: string, v: string | null) =>
            v == null || v === "" ? next.delete(key) : next.set(key, v);
          write("y", String(merged.year));
          write("r", merged.round ? String(merged.round) : null);
          write("rf", merged.roundFrom ? String(merged.roundFrom) : null);
          write("rt", merged.roundTo ? String(merged.roundTo) : null);
          write("st", merged.sessionType !== "Race" ? merged.sessionType : null);
          write("d", merged.driverIds.length ? merged.driverIds.join(",") : null);
          write("t", merged.teamIds.length ? merged.teamIds.join(",") : null);
          return next;
        },
        { replace: true },
      );
    },
    [filters, setParams],
  );

  const toggleDriver = useCallback(
    (id: number) =>
      set({
        driverIds: filters.driverIds.includes(id)
          ? filters.driverIds.filter((d) => d !== id)
          : [...filters.driverIds, id],
      }),
    [filters.driverIds, set],
  );

  const toggleTeam = useCallback(
    (id: number) =>
      set({
        teamIds: filters.teamIds.includes(id)
          ? filters.teamIds.filter((t) => t !== id)
          : [...filters.teamIds, id],
      }),
    [filters.teamIds, set],
  );

  const isDefault =
    filters.round == null &&
    filters.roundFrom == null &&
    filters.roundTo == null &&
    filters.sessionType === "Race" &&
    filters.driverIds.length === 0 &&
    filters.teamIds.length === 0;

  const reset = useCallback(() => {
    set({
      round: null,
      roundFrom: null,
      roundTo: null,
      sessionType: "Race",
      driverIds: [],
      teamIds: [],
    });
  }, [set]);

  const value = useMemo(
    () => ({ filters, years, latestYear, set, toggleDriver, toggleTeam, reset, isDefault }),
    [filters, years, latestYear, set, toggleDriver, toggleTeam, reset, isDefault],
  );
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersApi {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
}

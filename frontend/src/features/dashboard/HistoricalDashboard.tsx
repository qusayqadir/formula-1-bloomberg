import { useMemo } from "react";
import { useFilters } from "@/state/filters";
import { useSeasonResults, useSeatMap } from "@/lib/queries";
import { buildEntities } from "@/features/dashboard/entities";
import { roundsFromResults } from "@/features/dashboard/selectors";
import { FilterBar } from "@/features/dashboard/FilterBar";
import { ChampionshipProgression } from "@/features/dashboard/widgets/ChampionshipProgression";
import { BumpChart } from "@/features/dashboard/widgets/BumpChart";
import { SessionResultsTable } from "@/features/dashboard/widgets/SessionResultsTable";
import { GridFinishSlope } from "@/features/dashboard/widgets/GridFinishSlope";
import { FastestLapGap } from "@/features/dashboard/widgets/FastestLapGap";
import { ResultsHeatmap } from "@/features/dashboard/widgets/ResultsHeatmap";
import { HeadToHead } from "@/features/dashboard/widgets/HeadToHead";
import { ConsistencyBox } from "@/features/dashboard/widgets/ConsistencyBox";
import { ReliabilityMatrix } from "@/features/dashboard/widgets/ReliabilityMatrix";
import { TeammateDelta } from "@/features/dashboard/widgets/TeammateDelta";
import { CircuitRacecraft } from "@/features/dashboard/widgets/CircuitRacecraft";
import { CircuitMap } from "@/features/dashboard/widgets/CircuitMap";
import { CircuitMatrix } from "@/features/dashboard/widgets/CircuitMatrix";

export function HistoricalDashboard() {
  const { filters } = useFilters();
  const seatMap = useSeatMap(filters.year);
  const results = useSeasonResults(filters.year, filters.sessionType);
  const entities = useMemo(() => buildEntities(seatMap.data?.rows), [seatMap.data]);
  const rounds = useMemo(() => roundsFromResults(results.data?.items), [results.data]);

  return (
    <div className="px-4 pb-6">
      {/* compact workspace header */}
      <header className="flex flex-wrap items-end justify-between gap-2 py-3">
        <div>
          <p className="eyebrow">Home / Analytics / Historical</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-ink">
            Historical Analytics
            <span className="ml-2 font-mono text-sm font-medium text-sub">{filters.year} Season</span>
          </h1>
        </div>
        <dl className="flex gap-4 font-mono text-[10px] uppercase tracking-wider text-mut">
          <div>
            <dt className="inline">Rounds </dt>
            <dd className="inline font-semibold text-sub">{rounds.length || "—"}</dd>
          </div>
          <div>
            <dt className="inline">Drivers </dt>
            <dd className="inline font-semibold text-sub">{entities.drivers.length || "—"}</dd>
          </div>
          <div>
            <dt className="inline">Teams </dt>
            <dd className="inline font-semibold text-sub">{entities.teams.length || "—"}</dd>
          </div>
          <div>
            <dt className="inline">Entries </dt>
            <dd className="inline font-semibold text-sub">{results.data?.total ?? "—"}</dd>
          </div>
        </dl>
      </header>

      <FilterBar rounds={rounds} entities={entities} />

      {/* bento grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
        <ChampionshipProgression kind="drivers" entities={entities} className="h-[360px] md:col-span-1 xl:col-span-7" />
        <ChampionshipProgression kind="teams" entities={entities} className="h-[360px] md:col-span-1 xl:col-span-5" />

        <BumpChart entities={entities} className="h-[440px] md:col-span-2 xl:col-span-12" />

        <SessionResultsTable entities={entities} className="h-[400px] md:col-span-2 xl:col-span-5" />
        <GridFinishSlope entities={entities} className="h-[400px] md:col-span-1 xl:col-span-4" />
        <FastestLapGap entities={entities} className="h-[400px] md:col-span-1 xl:col-span-3" />

        <ResultsHeatmap entities={entities} className="h-[460px] md:col-span-2 xl:col-span-8" />
        <HeadToHead entities={entities} className="h-[460px] md:col-span-2 xl:col-span-4" />

        <ConsistencyBox entities={entities} className="h-[400px] md:col-span-2 xl:col-span-7" />
        <ReliabilityMatrix entities={entities} className="h-[400px] md:col-span-2 xl:col-span-5" />

        <TeammateDelta entities={entities} className="h-[380px] md:col-span-2 xl:col-span-7" />
        <CircuitRacecraft className="h-[380px] md:col-span-2 xl:col-span-5" />

        <CircuitMap className="h-[380px] md:col-span-2 xl:col-span-7" />
        <CircuitMatrix entities={entities} className="h-[380px] md:col-span-2 xl:col-span-5" />
      </div>

      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-mut">
        Historical data 2011–2025 · race classifications, championship snapshots, circuits ·
        no lap-by-lap timing, telemetry, tyre or weather data in source schema
      </p>
    </div>
  );
}

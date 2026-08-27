import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { GlassSelect } from "@/components/ui/controls";
import { CarBox } from "@/features/team-profiles/CarBox";
import { DriverCard } from "@/features/team-profiles/DriverCard";
import { FactoryMap } from "@/features/team-profiles/FactoryMap";
import { MomentsCarousel } from "@/features/team-profiles/MomentsCarousel";
import { PitWallGrid } from "@/features/team-profiles/PitWallGrid";
import { teamColor } from "@/lib/colors";
import { useTeamRoster, useTeams } from "@/lib/queries";
import { useFilters } from "@/state/filters";

export function TeamProfilesPage() {
  const { filters, years, set } = useFilters();
  const teams = useTeams(filters.year);
  const [params, setParams] = useSearchParams();

  const teamList = teams.data?.items ?? [];
  const paramTeamId = Number(params.get("team"));
  const selectedTeamId =
    teamList.find((t) => t.id === paramTeamId)?.id ?? teamList[0]?.id ?? null;

  // keep the URL in sync once the roster loads, without fighting user clicks
  useEffect(() => {
    if (selectedTeamId != null && String(selectedTeamId) !== params.get("team")) {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("team", String(selectedTeamId));
        return next;
      }, { replace: true });
    }
  }, [selectedTeamId, params, setParams]);

  const selectedTeam = teamList.find((t) => t.id === selectedTeamId) ?? null;
  const roster = useTeamRoster(selectedTeamId, filters.year);
  const seats = useMemo(() => (roster.data ?? []).slice(0, 2), [roster.data]);

  return (
    <div className="px-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-2 py-4">
        <div>
          <p className="eyebrow">Home / Terminal / Team Profiles</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-ink">
            Team Profiles
            <span className="ml-2 font-mono text-sm font-medium text-sub">{filters.year} Season</span>
          </h1>
        </div>
        <GlassSelect
          label="Season"
          value={filters.year}
          options={years.map((y) => ({ value: y, label: String(y) }))}
          onChange={(y) => set({ year: y })}
        />
      </header>

      {/* season team strip */}
      <nav
        aria-label="Teams"
        className="flex gap-1.5 overflow-x-auto border-b border-stroke pb-3"
      >
        {teams.isPending && (
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-7 w-28 flex-none rounded-md" />
            ))}
          </div>
        )}
        {teamList.map((team) => {
          const active = team.id === selectedTeamId;
          const color = teamColor(team);
          return (
            <button
              key={team.id}
              onClick={() =>
                setParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("team", String(team.id));
                  return next;
                })
              }
              className={`flex-none whitespace-nowrap border-b-2 px-3 pb-2 font-mono text-[11px] font-medium transition-colors ${
                active ? "text-ink" : "border-transparent text-mut hover:text-sub"
              }`}
              style={active ? { borderColor: color } : undefined}
            >
              {team.name}
            </button>
          );
        })}
      </nav>

      {selectedTeam && (
        <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-12">
          {seats[0] ? (
            <DriverCard driverId={seats[0].driver_id} className="h-[340px] xl:col-span-4" />
          ) : (
            <div className="h-[340px] rounded-xl border border-stroke bg-surface xl:col-span-4" />
          )}
          <CarBox team={selectedTeam} className="h-[340px] xl:col-span-4" />
          {seats[1] ? (
            <DriverCard driverId={seats[1].driver_id} className="h-[340px] xl:col-span-4" />
          ) : (
            <div className="h-[340px] rounded-xl border border-stroke bg-surface xl:col-span-4" />
          )}

          <FactoryMap className="h-[380px] xl:col-span-3" />
          <PitWallGrid className="h-[380px] xl:col-span-9" />

          <MomentsCarousel className="h-[340px] xl:col-span-12" />
        </div>
      )}

      {!teams.isPending && teamList.length === 0 && (
        <p className="mt-6 text-center text-xs text-mut">No teams entered the {filters.year} season.</p>
      )}
    </div>
  );
}

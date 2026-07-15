import { RotateCcw } from "lucide-react";
import { Chip, MultiSelect, Select } from "@/components/ui/controls";
import { useFilters } from "@/state/filters";
import type { SessionType } from "@/lib/types";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { shortRoundName } from "@/lib/format";

export interface RoundOption {
  number: number;
  name: string | null;
}

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "Race", label: "Race" },
  { value: "Qualifying", label: "Qualifying" },
  { value: "Sprint", label: "Sprint" },
  { value: "SprintQualifying", label: "Sprint Quali" },
  { value: "FP1", label: "FP1" },
  { value: "FP2", label: "FP2" },
  { value: "FP3", label: "FP3" },
];

/** Sticky global filter row — every widget below re-renders against this
 *  slice. Chart interactions that commit filters surface here as chips. */
export function FilterBar(props: { rounds: RoundOption[]; entities: SeasonEntities }) {
  const { filters, years, set, toggleDriver, toggleTeam, reset, isDefault } = useFilters();
  const { rounds, entities } = props;

  const roundLabel = (n: number) =>
    shortRoundName(rounds.find((r) => r.number === n)?.name) || `Round ${n}`;

  const chips: { key: string; label: string; swatch?: string; onRemove: () => void }[] = [];
  if (filters.round != null)
    chips.push({
      key: "round",
      label: `Round: R${filters.round} ${roundLabel(filters.round)}`,
      onRemove: () => set({ round: null }),
    });
  if (filters.roundFrom != null || filters.roundTo != null)
    chips.push({
      key: "range",
      label: `Rounds ${filters.roundFrom ?? 1}–${filters.roundTo ?? rounds.length}`,
      onRemove: () => set({ roundFrom: null, roundTo: null }),
    });
  for (const id of filters.driverIds) {
    const d = entities.driverById.get(id);
    chips.push({
      key: `d${id}`,
      label: d ? d.code : `Driver ${id}`,
      swatch: d?.color,
      onRemove: () => toggleDriver(id),
    });
  }
  for (const id of filters.teamIds) {
    const t = entities.teamById.get(id);
    chips.push({
      key: `t${id}`,
      label: t ? t.name : `Team ${id}`,
      swatch: t?.color,
      onRemove: () => toggleTeam(id),
    });
  }

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-stroke bg-bg/90 px-4 py-2 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          label="Season"
          value={filters.year}
          numeric
          options={[...years].reverse().map((y) => ({ value: y, label: String(y) }))}
          onChange={(year) => set({ year })}
        />
        <Select
          label="Round"
          value={filters.round ?? 0}
          numeric
          options={[
            { value: 0, label: "Latest" },
            ...rounds.map((r) => ({
              value: r.number,
              label: `R${r.number} · ${shortRoundName(r.name) || r.number}`,
            })),
          ]}
          onChange={(n) => set({ round: n === 0 ? null : n })}
        />
        <Select
          label="Session"
          value={filters.sessionType}
          options={SESSION_TYPES}
          onChange={(sessionType) => set({ sessionType: sessionType as SessionType })}
        />
        <MultiSelect
          label="Drivers"
          placeholder="All drivers"
          options={entities.drivers.map((d) => ({
            value: d.id,
            label: `${d.code} · ${d.surname}`,
            hint: d.teamName.split(" ")[0],
            swatch: d.color,
          }))}
          selected={filters.driverIds}
          onToggle={toggleDriver}
          onClear={() => set({ driverIds: [] })}
        />
        <MultiSelect
          label="Teams"
          placeholder="All teams"
          options={entities.teams.map((t) => ({ value: t.id, label: t.name, swatch: t.color }))}
          selected={filters.teamIds}
          onToggle={toggleTeam}
          onClear={() => set({ teamIds: [] })}
        />
        {!isDefault && (
          <button
            onClick={reset}
            className="flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2 font-mono text-[10px] uppercase tracking-wider text-sub transition-colors hover:border-stroke hover:text-ink"
          >
            <RotateCcw size={10} /> Reset
          </button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} swatch={c.swatch} onRemove={c.onRemove} />
          ))}
          <button
            onClick={reset}
            className="h-6 rounded-full px-2 font-mono text-[10px] uppercase tracking-wider text-mut transition-colors hover:text-accent"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

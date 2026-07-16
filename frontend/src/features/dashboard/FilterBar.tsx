import { RotateCcw } from "lucide-react";
import { Chip, GlassSelect, MultiSelect } from "@/components/ui/controls";
import { DitherButton } from "@/components/dither-kit";
import { useFilters } from "@/state/filters";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { shortRoundName } from "@/lib/format";

export interface RoundOption {
  number: number;
  name: string | null;
}

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
    <div className="sticky top-0 z-30 -mx-5 border-b border-stroke bg-bg/90 px-5 py-2 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <GlassSelect
          label="Season"
          value={filters.year}
          options={[...years].reverse().map((y) => ({ value: y, label: String(y) }))}
          onChange={(y) => set({ year: y })}
        />
        <GlassSelect
          label="Round"
          value={filters.round ?? 0}
          options={[
            { value: 0, label: "Latest" },
            ...rounds.map((r) => ({
              value: r.number,
              label: `R${r.number} · ${shortRoundName(r.name) || r.number}`,
            })),
          ]}
          onChange={(n) => set({ round: n === 0 ? null : n })}
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
          <DitherButton
            onClick={reset}
            color="blue"
            variant="gradient"
            className="flex h-7 items-center gap-1.5 rounded-md px-2.5 font-mono text-[10px] uppercase tracking-wider"
          >
            <RotateCcw size={10} /> Reset
          </DitherButton>
        )}
      </div>
      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} swatch={c.swatch} onRemove={c.onRemove} />
          ))}
          <DitherButton
            onClick={reset}
            color="blue"
            variant="dotted"
            className="flex h-6 items-center rounded-full px-2.5 font-mono text-[10px] uppercase tracking-wider"
          >
            Clear all
          </DitherButton>
        </div>
      )}
    </div>
  );
}

import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Silhouette } from "@/components/ui/Silhouette";
import { PIT_WALL_PLACEHOLDER, RESERVE_DRIVER_PLACEHOLDER } from "@/features/team-profiles/placeholders";

function PersonTile(props: { role: string }) {
  return (
    <div className="flex h-full flex-col items-center gap-2 rounded-md border border-stroke bg-inset p-2 text-center">
      <Silhouette variant="person" className="w-full flex-1" iconSize={32} />
      <div className="min-w-0 flex-none pb-0.5">
        <p className="font-mono text-[11px] text-mut">—</p>
        <p className="text-wrap font-mono text-[9.5px] uppercase leading-tight tracking-wider text-sub">
          {props.role}
        </p>
      </div>
    </div>
  );
}

/** No async data — pit-wall personnel aren't in the bronze schema yet, so
 *  this is honest placeholder scaffolding (see CLAUDE.md bronze data gaps). */
export function PitWallGrid(props: { className?: string }) {
  return (
    <AnalyticsCard eyebrow="Team · Personnel" title="Pit wall" className={props.className} bodyClassName="p-3">
      <div className="flex h-full flex-col gap-2">
        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-2">
          {PIT_WALL_PLACEHOLDER.map((p, i) => (
            <PersonTile key={i} role={p.role} />
          ))}
        </div>
        <div className="flex flex-none items-center gap-3 rounded-md border border-stroke bg-inset p-2.5">
          <Silhouette variant="person" className="h-14 w-14" iconSize={22} />
          <div className="min-w-0">
            <p className="font-mono text-xs text-mut">—</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-sub">
              {RESERVE_DRIVER_PLACEHOLDER.role}
            </p>
          </div>
        </div>
      </div>
    </AnalyticsCard>
  );
}

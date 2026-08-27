import { Silhouette } from "@/components/ui/Silhouette";
import { teamColor, withAlpha } from "@/lib/colors";
import type { Team } from "@/lib/types";

/** No AnalyticsCard here — there's no async data, just the season livery
 *  silhouette on an ink-washed team-color background. */
export function CarBox(props: { team: Team; className?: string }) {
  const color = teamColor(props.team);
  return (
    <section
      className={`flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-stroke bg-surface p-4 shadow-[var(--shadow-card)] ${props.className ?? ""}`}
      style={{ background: `linear-gradient(180deg, ${withAlpha(color, 0.12)}, transparent 60%)` }}
    >
      <Silhouette variant="car" className="w-full flex-1" iconSize={64} />
      <p className="eyebrow" style={{ color }}>
        {props.team.name}
      </p>
    </section>
  );
}

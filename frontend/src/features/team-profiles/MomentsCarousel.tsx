import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Silhouette } from "@/components/ui/Silhouette";
import { CAROUSEL_PLACEHOLDER_COUNT } from "@/features/team-profiles/placeholders";

/* Frosted-glass control, matching the tooltip/dropdown treatment used
 * across the app (GLASS_PANEL in components/ui/controls.tsx). */
const GLASS_BUTTON =
  "grid h-7 w-7 flex-none place-items-center rounded-full border border-ink/20 bg-raised/75 text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-colors hover:bg-raised/90 disabled:opacity-30";

/** Hand-rolled scroll-snap carousel — no carousel library installed, and one
 *  small custom component keeps the exact glass/mono design language. Images
 *  will come from S3; every tile is a silhouette placeholder for now. */
export function MomentsCarousel(props: { className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const tiles = Array.from({ length: CAROUSEL_PLACEHOLDER_COUNT }, (_, i) => i);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(tiles.length - 1, i));
    const tile = track.children[clamped] as HTMLElement | undefined;
    tile?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActive(clamped);
  };

  return (
    <AnalyticsCard
      eyebrow="Team · Archive"
      title="Factory & moments"
      subtitle="factory floor, launches, and team-defining moments"
      controls={
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous"
            onClick={() => scrollToIndex(active - 1)}
            disabled={active === 0}
            className={GLASS_BUTTON}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            aria-label="Next"
            onClick={() => scrollToIndex(active + 1)}
            disabled={active === tiles.length - 1}
            className={GLASS_BUTTON}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      }
      className={props.className}
      bodyClassName="p-3"
    >
      <div className="flex h-full flex-col gap-2">
        <div
          ref={trackRef}
          className="flex h-full snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth"
        >
          {tiles.map((i) => (
            <Silhouette
              key={i}
              variant="photo"
              className="h-full w-64 flex-none snap-start"
              iconSize={36}
            />
          ))}
        </div>
        <div className="flex flex-none items-center justify-center gap-1.5">
          {tiles.map((i) => (
            <button
              key={i}
              aria-label={`Go to image ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-4 bg-accent" : "w-1.5 bg-stroke-strong"
              }`}
            />
          ))}
        </div>
      </div>
    </AnalyticsCard>
  );
}

/** Frosted-glass circuit metadata card shared by the 3D globe and 2D map —
 *  tooltip visual language in the calendar's fixed panel palette. Positioned
 *  at a pointer location inside a relatively/absolutely positioned host. */
import { circuitMeta, GLOBE_PALETTE as P, type CircuitDot } from "@/features/calendar/geo";

export interface DotHit {
  dot: CircuitDot;
  x: number;
  y: number;
}

export function MetaCard(props: { hit: DotHit; hostWidth: number }) {
  const { hit } = props;
  const meta = circuitMeta(hit.dot.circuitId);
  const flipX = hit.x > props.hostWidth - 260;
  return (
    <div
      className="pointer-events-none absolute z-20 w-56 rounded-md border p-2.5 backdrop-blur-sm"
      style={{
        left: hit.x + (flipX ? -14 : 14),
        top: hit.y + 14,
        transform: flipX ? "translateX(-100%)" : undefined,
        background: `${P.panelBg}d9`, // ~85% alpha
        borderColor: P.panelBorder,
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      <p className="mb-1 font-mono text-[10px]" style={{ color: P.textSecondary }}>
        {hit.dot.label} · {hit.dot.name}
      </p>
      {/* circuit layout placeholder — swap for a real track outline image */}
      <div
        className="mb-2 grid aspect-video place-items-center rounded-[3px] border border-dashed"
        style={{ borderColor: P.panelBorder, background: `${P.ocean}99` }}
      >
        <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: P.textSecondary }}>
          Track Layout
        </span>
      </div>
      <div className="space-y-0.5 font-mono text-[11px] tabular-nums">
        {[
          ["Length", meta.length],
          ["Record Lap", meta.recordLap],
          ["Turns", meta.turns],
          ["DRS Zones", meta.drsZones],
          ["Track Type", meta.trackType],
          ["Elev. Gain", meta.elevationGain],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <span style={{ color: P.textSecondary }}>{label}</span>
            <span style={{ color: P.textPrimary }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

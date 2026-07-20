/** Frosted-glass circuit metadata card shared by the 3D globe and 2D map —
 *  tooltip visual language in the calendar's fixed panel palette. Anchored to
 *  a marker position inside a relatively/absolutely positioned host; flips
 *  side/above as needed and clamps fully inside the host on both axes. */
import { useLayoutEffect, useRef, useState } from "react";
import { GLOBE_PALETTE as P, type CircuitDot } from "@/features/calendar/geo";
import { circuitImage } from "@/features/calendar/circuitImages";

export interface DotHit {
  dot: CircuitDot;
  x: number;
  y: number;
}

const GAP = 16; // offset from the anchor point
const PAD = 8; // minimum clearance from the host edges

export function MetaCard(props: { hit: DotHit; hostWidth: number; hostHeight: number }) {
  const { hit, hostWidth, hostHeight } = props;
  const meta = hit.dot.meta;
  const layout = circuitImage(hit.dot.apiId);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
  }, [hit.dot.circuitId, layout]);

  // prefer right-of/below the anchor; flip to the other side when that would
  // overflow, then clamp — the card never leaves the host
  const w = size?.w ?? 336;
  const h = size?.h ?? 320;
  let left = hit.x + GAP;
  if (left + w > hostWidth - PAD) left = hit.x - GAP - w;
  left = Math.min(Math.max(left, PAD), Math.max(hostWidth - w - PAD, PAD));
  let top = hit.y + GAP;
  if (top + h > hostHeight - PAD) top = hit.y - GAP - h;
  top = Math.min(Math.max(top, PAD), Math.max(hostHeight - h - PAD, PAD));

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-20 w-[336px] rounded-md border p-3.5 backdrop-blur-sm"
      style={{
        left,
        top,
        visibility: size ? "visible" : "hidden", // measure before first paint
        background: `${P.panelBg}d9`, // ~85% alpha
        borderColor: P.panelBorder,
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      <p className="mb-1.5 font-mono text-[11px]" style={{ color: P.textSecondary }}>
        {hit.dot.label} · {hit.dot.name}
      </p>
      {layout ? (
        <div
          className="mb-3 grid aspect-video place-items-center overflow-hidden rounded-[3px] border"
          style={{ borderColor: P.panelBorder, background: `${P.ocean}99` }}
        >
          <img
            src={layout}
            alt={`${hit.dot.name} track layout`}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        </div>
      ) : (
        <div
          className="mb-3 grid aspect-video place-items-center rounded-[3px] border border-dashed"
          style={{ borderColor: P.panelBorder, background: `${P.ocean}99` }}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: P.textSecondary }}>
            Track Layout
          </span>
        </div>
      )}
      <div className="space-y-1 font-mono text-[12px] tabular-nums">
        {[
          ["Length", meta.length],
          ["Record Lap", meta.recordLap],
          ["Record Holder", meta.recordHolder],
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

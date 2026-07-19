/** Flat 2D view of the same calendar data: equirectangular land fill, blue
 *  circuit dots with round labels, the yellow season flight path with a
 *  moving comet, and the same hover/click frosted-glass metadata card as the
 *  globe. Rendered in a rAF loop (land is a cached Path2D, so per-frame cost
 *  is tiny). */
import { useEffect, useRef, useState } from "react";
import { useChartTheme, MONO } from "@/components/charts/theme";
import {
  GLOBE_PALETTE as P,
  ROUTE_STYLES,
  LAND_POLYGONS,
  type CircuitDot,
  type RaceStatus,
  type RoutePoint,
} from "@/features/calendar/geo";
import { MetaCard, type DotHit } from "@/features/calendar/MetaCard";
import type { GlobeFocus } from "@/features/calendar/Globe3D";

const MARKER_COLOR: Record<RaceStatus, string> = {
  completed: P.markerCompleted,
  future: P.markerFuture,
  current: P.markerCurrent,
};

export function Map2D(props: {
  dots: CircuitDot[];
  route: RoutePoint[];
  focus: GlobeFocus | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const C = useChartTheme();
  const { dots, route } = props;
  const [hover, setHover] = useState<DotHit | null>(null);
  // set only by schedule-list clicks; forgotten as soon as any other dot is hovered
  const [pinned, setPinned] = useState<DotHit | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const projectRef = useRef<((lon: number, lat: number) => { x: number; y: number }) | null>(null);
  const dirtyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let w = 0;
    let h = 0;
    let offX = 0;
    let offY = 0;
    let landPath: Path2D | null = null;
    let hovered: CircuitDot | null = null;

    const px = (lon: number) => ((lon + 180) / 360) * w;
    const py = (lat: number) => ((90 - lat) / 180) * h;

    // route polyline with unwrapped longitudes + cumulative lengths for the comet
    const routeXY: { x: number; y: number }[] = [];
    let lonPrev = route[0]?.lon ?? 0;
    for (const p of route) {
      let lon = p.lon;
      while (lon - lonPrev > 180) lon -= 360;
      while (lon - lonPrev < -180) lon += 360;
      lonPrev = lon;
      routeXY.push({ x: lon, y: p.lat }); // stored in degrees, projected later
    }

    const layout = () => {
      const availW = host.clientWidth - 48;
      const availH = host.clientHeight - 160; // leave air for the overlay cards
      if (availW <= 0 || availH <= 0) return false;
      w = Math.min(availW, availH * 2);
      h = w / 2;
      offX = (host.clientWidth - w) / 2;
      offY = (host.clientHeight - h) / 2;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // land fill+stroke path with unwrapped longitudes (drawn at ±360°
      // offsets under a clip so antimeridian rings don't streak)
      landPath = new Path2D();
      for (const poly of LAND_POLYGONS)
        for (const ring of poly) {
          let prev = ring[0][0];
          for (let i = 0; i < ring.length; i++) {
            let [lon, lat] = ring[i];
            while (lon - prev > 180) lon -= 360;
            while (lon - prev < -180) lon += 360;
            prev = lon;
            if (i === 0) landPath.moveTo(px(lon), py(lat));
            else landPath.lineTo(px(lon), py(lat));
          }
          landPath.closePath();
        }
      return true;
    };

    // comet parameterization over the projected polyline
    const segLen: number[] = [];
    let totalLen = 0;
    const computeLengths = () => {
      segLen.length = 0;
      totalLen = 0;
      for (let i = 0; i < routeXY.length - 1; i++) {
        const dx = px(routeXY[i + 1].x) - px(routeXY[i].x);
        const dy = py(routeXY[i + 1].y) - py(routeXY[i].y);
        const l = Math.hypot(dx, dy);
        segLen.push(l);
        totalLen += l;
      }
    };
    const pointAt = (s: number): { x: number; y: number } => {
      let acc = 0;
      for (let i = 0; i < segLen.length; i++) {
        if (acc + segLen[i] >= s) {
          const f = segLen[i] === 0 ? 0 : (s - acc) / segLen[i];
          return {
            x: px(routeXY[i].x) + (px(routeXY[i + 1].x) - px(routeXY[i].x)) * f,
            y: py(routeXY[i].y) + (py(routeXY[i + 1].y) - py(routeXY[i].y)) * f,
          };
        }
        acc += segLen[i];
      }
      const last = routeXY[routeXY.length - 1];
      return { x: px(last.x), y: py(last.y) };
    };

    // static layer (land + routes + dots + labels) cached in an offscreen
    // canvas — rebuilt only on layout/hover/selection change; the per-frame
    // work is a single blit plus the comet stroke
    const staticCanvas = document.createElement("canvas");
    let staticDirty = true;
    const today = new Date().toISOString().slice(0, 10);
    const renderStatic = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      staticCanvas.width = w * dpr;
      staticCanvas.height = h * dpr;
      const ctx = staticCanvas.getContext("2d");
      if (!ctx || !landPath) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      ctx.fillStyle = P.ocean;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = P.land;
      ctx.strokeStyle = P.coast;
      ctx.lineWidth = 1;
      for (const dx of [-w, 0, w]) {
        ctx.save();
        ctx.translate(dx, 0);
        ctx.fill(landPath, "evenodd");
        ctx.stroke(landPath);
        ctx.restore();
      }

      // flight path — unwrapped lons can run past a map edge, so legs are
      // drawn at ±map-width offsets (same trick as the land)
      if (routeXY.length > 1) {
        for (const dx of [-w, 0, w]) {
          ctx.save();
          ctx.translate(dx, 0);
          for (let i = 0; i < routeXY.length - 1; i++) {
            const a = route[i];
            const b = route[i + 1];
            const status: RaceStatus =
              b.date != null && b.date < today
                ? "completed"
                : a.date != null && a.date < today
                  ? "current"
                  : "future";
            const style = ROUTE_STYLES[status];
            ctx.strokeStyle = style.color;
            ctx.globalAlpha = style.opacity;
            ctx.lineWidth = style.width;
            ctx.beginPath();
            ctx.moveTo(px(routeXY[i].x), py(routeXY[i].y));
            ctx.lineTo(px(routeXY[i + 1].x), py(routeXY[i + 1].y));
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // dots + round labels
      for (const d of dots) {
        const grown =
          hovered?.circuitId === d.circuitId || selectedIdRef.current === d.circuitId;
        const r = (d.emphasis ? 6 : 4) * (grown ? 1.6 : 1);
        ctx.beginPath();
        ctx.arc(px(d.lon), py(d.lat), r, 0, Math.PI * 2);
        ctx.fillStyle = MARKER_COLOR[d.status];
        ctx.fill();
        ctx.strokeStyle = P.page;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = `600 10px ${MONO}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = d.status === "current" ? P.textPrimary : P.textSecondary;
        ctx.fillText(d.label, px(d.lon), py(d.lat) - r - 3);
      }
    };

    const start = performance.now();
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !landPath) return;
      if (staticDirty) {
        renderStatic();
        staticDirty = false;
      }
      const dpr = Math.min(window.devicePixelRatio, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(staticCanvas, 0, 0, w, h);

      // moving comet in the active yellow (the only per-frame drawing)
      if (routeXY.length > 1 && totalLen > 0) {
        const u = (((performance.now() - start) / 1000) * 0.018) % 1;
        const sHead = u * totalLen;
        const sTail = Math.max(0, sHead - totalLen * 0.02);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();
        for (const dx of [-w, 0, w]) {
          ctx.save();
          ctx.translate(dx, 0);
          ctx.strokeStyle = P.routeActive;
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          const steps = 12;
          for (let k = 0; k <= steps; k++) {
            const p = pointAt(sTail + ((sHead - sTail) * k) / steps);
            if (k === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
    };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      draw();
    };
    const relayout = () => {
      if (layout()) {
        computeLengths();
        staticDirty = true;
      }
    };
    relayout();
    loop();
    const ro = new ResizeObserver(relayout);
    ro.observe(host);
    dirtyRef.current = () => {
      staticDirty = true;
    };

    // don't burn frames while the tab is hidden
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) loop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // hover / click hit-testing (canvas-local coords → host coords for the card)
    const pick = (e: MouseEvent): DotHit | null => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let best: DotHit | null = null;
      let bestD = 10; // px hit radius
      for (const d of dots) {
        const dist = Math.hypot(px(d.lon) - x, py(d.lat) - y);
        if (dist < bestD) {
          bestD = dist;
          best = { dot: d, x: x + offX, y: y + offY };
        }
      }
      return best;
    };
    const onMove = (e: MouseEvent) => {
      const hit = pick(e);
      if ((hit?.dot ?? null) !== hovered) staticDirty = true; // dot growth changed
      hovered = hit?.dot ?? null;
      canvas.style.cursor = hit ? "pointer" : "default";
      // hovering a different dot forgets the clicked one for good
      if (hit) setPinned((p) => (p && p.dot.circuitId !== hit.dot.circuitId ? null : p));
      setHover(hit);
    };
    const onClick = (e: MouseEvent) => {
      if (!pick(e)) {
        selectedIdRef.current = null; // clear focus growth
        setPinned(null);
      }
      staticDirty = true;
    };
    projectRef.current = (lon, lat) => ({ x: px(lon) + offX, y: py(lat) + offY });
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      ro.disconnect();
      dirtyRef.current = null;
      setHover(null);
      setPinned(null);
      projectRef.current = null;
    };
  }, [C, dots, route]);

  // schedule-list clicks → grow that dot and reveal its metadata card
  const { focus } = props;
  useEffect(() => {
    if (!focus) return;
    selectedIdRef.current = focus.circuitId;
    dirtyRef.current?.();
    const d = dots.find((x) => x.circuitId === focus.circuitId);
    const project = projectRef.current;
    if (d && project) {
      const p = project(d.lon, d.lat);
      setPinned({ dot: d, x: p.x, y: p.y });
    }
  }, [focus, dots]);

  const card = hover ?? pinned;
  return (
    <div ref={hostRef} className="absolute inset-0" aria-label="Race calendar map">
      <canvas ref={canvasRef} className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />
      {card && <MetaCard hit={card} hostWidth={hostRef.current?.clientWidth ?? 0} />}
    </div>
  );
}

/** Grid → finish density, 2011–2025: a hex-binned field of every classified
 *  finish. Hex fill rides the validated sequential ramp on a √ scale (the
 *  pole→win cell would otherwise flatten everything); exact counts live in
 *  the tooltip. The dashed diagonal is "finished where you started" —
 *  above it (P1 is top) means places gained. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { seqColor } from "@/lib/colors";
import { useGridFinishDensity } from "@/lib/queries";

const YEAR_FROM = 2011;
const YEAR_TO = 2025;

export function GridFinishHexbin(props: { className?: string }) {
  const C = useChartTheme();
  const { t, axisLabel, baseTooltip, valueAxis } = C;
  const query = useGridFinishDensity(YEAR_FROM, YEAR_TO);

  const built = useMemo(() => {
    const rows = query.data?.rows ?? [];
    if (!rows.length) return null;
    const maxCount = Math.max(...rows.map((r) => r.count));
    const maxAxis = Math.max(...rows.map((r) => Math.max(r.grid, r.position)));
    const gridTotals = new Map<number, number>();
    for (const r of rows) gridTotals.set(r.grid, (gridTotals.get(r.grid) ?? 0) + r.count);

    const option: EChartsOption = {
      animationDuration: 300,
      grid: { left: 8, right: 12, top: 20, bottom: 30, containLabel: true },
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (p: any) => {
          if (!Array.isArray(p.value)) return "";
          const [g, pos, count] = p.value as [number, number, number];
          const share = ((count / (gridTotals.get(g) ?? 1)) * 100).toFixed(0);
          return C.tip(`GRID P${g} → FIN P${pos}`, [
            C.tipRow("RACES", `${count}`),
            C.tipRow(`OF P${g} STARTS`, `${share}%`),
          ]);
        },
      },
      xAxis: valueAxis({
        min: 0.5,
        max: maxAxis + 0.5,
        minInterval: 1,
        splitLine: { show: false },
        name: "GRID",
        nameLocation: "middle",
        nameGap: 20,
        nameTextStyle: { color: t.inkMut, fontFamily: MONO, fontSize: 8 },
        axisLabel: { ...axisLabel, formatter: (v: number) => (Number.isInteger(v) ? `${v}` : "") },
      }),
      yAxis: valueAxis({
        min: 0.5,
        max: maxAxis + 0.5,
        inverse: true,
        minInterval: 1,
        splitLine: { show: false },
        name: "FINISH",
        nameTextStyle: { color: t.inkMut, fontFamily: MONO, fontSize: 8 },
        axisLabel: { ...axisLabel, formatter: (v: number) => (Number.isInteger(v) ? `${v}` : "") },
      }),
      series: [
        {
          type: "line",
          silent: true,
          symbol: "none",
          lineStyle: { color: t.axisLine, type: "dashed", width: 1 },
          data: [
            [0.5, 0.5],
            [maxAxis + 0.5, maxAxis + 0.5],
          ],
          z: 1,
        },
        {
          type: "custom",
          z: 2,
          renderItem: (_params: any, api: any) => {
            const g = api.value(0) as number;
            const pos = api.value(1) as number;
            const count = api.value(2) as number;
            const [cx, cy] = api.coord([g, pos]) as [number, number];
            const cellW = (api.size([1, 0]) as number[])[0];
            const cellH = (api.size([0, 1]) as number[])[1];
            const r = Math.min(cellH / 2, cellW / 1.732) * 0.94;
            const points: [number, number][] = [];
            for (let k = 0; k < 6; k++) {
              const angle = Math.PI / 2 + (k * Math.PI) / 3;
              points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
            }
            return {
              type: "polygon",
              shape: { points },
              style: {
                fill: seqColor(Math.sqrt(count / maxCount), t.seqRamp),
                stroke: t.surface,
                lineWidth: 1,
              },
            };
          },
          data: rows.map((r) => [r.grid, r.position, r.count]),
        },
      ],
    };
    return { option, maxCount };
  }, [query.data, C]);

  return (
    <AnalyticsCard
      eyebrow="Field · Start → Finish"
      title="Grid → finish density"
      subtitle={`${YEAR_FROM}–${YEAR_TO} · classified finishes · above diagonal = gained`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !built}
      emptyText="No grid/finish pairs available for the window."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {built && (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <EChart option={built.option} />
          </div>
          <div className="flex flex-none items-center justify-end gap-1.5 px-1 pt-1 font-mono text-[8px] uppercase tracking-wider text-mut">
            <span>1</span>
            <span
              aria-hidden
              className="h-1.5 w-24 rounded-sm"
              style={{ background: `linear-gradient(to right, ${t.seqRamp.join(", ")})` }}
            />
            <span>{built.maxCount}</span>
            <span>· √ scale</span>
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}

/** Horizon chart of positions gained/lost per round, one 3-place-band row
 *  per driver. Both signs fold upward: blue = gained, red = lost (the
 *  validated diverging pair), deeper opacity = one more band of 3 places.
 *  Driver identity lives in an HTML rail (code + team chip), never in the
 *  band color. Classified finishes only — DNF rounds stay flat. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { useChartTheme } from "@/components/charts/theme";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import {
  filteredSeasonRows,
  inRoundRange,
  roundsFromResults,
  statusBucket,
} from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";

const BAND = 3; // places per fold
const LAYERS = 3;
const LAYER_OPACITY = [0.32, 0.55, 0.8];
const AXIS_STRIP = 7; // % of chart height reserved for the shared x labels

interface Cell {
  delta: number;
  grid: number;
  position: number;
}

export function HorizonDeltas(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t, axisLabel, baseTooltip } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);

  const built = useMemo(() => {
    const rows = filteredSeasonRows(query.data?.items, props.entities, filters);
    const rounds = roundsFromResults(rows)
      .map((r) => r.number)
      .filter((rn) => inRoundRange(rn, filters));
    if (!rounds.length) return null;

    const cells = new Map<number, Map<number, Cell>>();
    for (const r of rows) {
      if (
        r.round_number == null ||
        r.positions_gained == null ||
        r.grid == null ||
        r.position == null ||
        statusBucket(r.status) !== "finish"
      )
        continue;
      let m = cells.get(r.driver_id);
      if (!m) {
        m = new Map();
        cells.set(r.driver_id, m);
      }
      m.set(r.round_number, { delta: r.positions_gained, grid: r.grid, position: r.position });
    }
    const drivers = props.entities.drivers.filter((d) => cells.get(d.id)?.size);
    if (!drivers.length) return null;

    const n = drivers.length;
    const rowSpan = (100 - AXIS_STRIP) / n;
    const grids: any[] = [];
    const xAxes: any[] = [];
    const yAxes: any[] = [];
    const series: any[] = [];
    drivers.forEach((d, i) => {
      grids.push({
        left: 6,
        right: 8,
        top: `${(i * rowSpan).toFixed(3)}%`,
        height: `${(rowSpan * 0.8).toFixed(3)}%`,
      });
      xAxes.push({
        type: "category",
        gridIndex: i,
        data: rounds.map((rn) => `R${rn}`),
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: i === n - 1 ? { ...axisLabel, fontSize: 8, interval: 1, margin: 6 } : { show: false },
      });
      yAxes.push({ type: "value", gridIndex: i, min: 0, max: BAND, show: false });
      const m = cells.get(d.id)!;
      for (const [sign, color] of [
        [1, t.gained],
        [-1, t.lost],
      ] as const) {
        for (let k = 0; k < LAYERS; k++) {
          series.push({
            type: "line",
            xAxisIndex: i,
            yAxisIndex: i,
            step: "middle",
            symbol: "none",
            lineStyle: { width: 0, opacity: 0 },
            areaStyle: { color, opacity: LAYER_OPACITY[k] },
            emphasis: { disabled: true },
            data: rounds.map((rn) => {
              const cell = m.get(rn);
              if (!cell || Math.sign(cell.delta) !== sign) return 0;
              return Math.max(0, Math.min(BAND, Math.abs(cell.delta) - k * BAND));
            }),
          });
        }
      }
    });

    const option: EChartsOption = {
      animationDuration: 200,
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (p: any) => {
          const d = drivers[Math.floor(p.seriesIndex / (LAYERS * 2))];
          const rn = rounds[p.dataIndex];
          const cell = d && cells.get(d.id)?.get(rn);
          if (!d || !cell) return "";
          const sign = cell.delta > 0 ? `+${cell.delta}` : `${cell.delta}`;
          return C.tip(`${d.code} — ${d.teamName}`, [
            C.tipRow(`R${rn}`, `${sign} PLACES (P${cell.grid} → P${cell.position})`),
          ]);
        },
      },
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
    };
    return { option, drivers, key: `${n}-${rounds.length}-${C.mode}` };
  }, [query.data, filters, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Season · Racecraft"
      title="Gained / lost horizon"
      subtitle={`${filters.year} · places per round vs grid · classified finishes`}
      controls={
        <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-mut">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-[1px]" style={{ background: t.gained }} /> gained
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-[1px]" style={{ background: t.lost }} /> lost
          </span>
          <span>band = {BAND}</span>
        </span>
      }
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !built}
      emptyText="No classified finishes with grid data in the current selection."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {built && (
        <div className="flex h-full">
          <div
            className="flex w-12 flex-none flex-col"
            style={{ paddingBottom: `${AXIS_STRIP}%` }}
          >
            {built.drivers.map((d) => (
              <span
                key={d.id}
                className="flex flex-1 items-center gap-1 font-mono text-[9px] text-sub"
              >
                <span
                  aria-hidden
                  className="h-2 w-[3px] rounded-[1px]"
                  style={{ background: d.color }}
                />
                {d.code}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <EChart option={built.option} chartKey={built.key} />
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}

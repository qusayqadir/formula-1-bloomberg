/** Finish-position distribution per driver — boxplots over classified
 *  finishes only (retirement classification order is excluded), best median
 *  first. Boxes wear the team identity hue: translucent fill, solid border.
 *  DNF counts live in the tooltip, never in the distribution. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { withAlpha } from "@/lib/colors";
import { useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { filteredSeasonRows, quantileSorted, statusBucket } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";
import { driverCode } from "@/lib/format";

interface DriverBox {
  code: string;
  teamName: string;
  color: string;
  five: [number, number, number, number, number]; // min q1 median q3 max
  n: number;
  dnfs: number;
}

export function ConsistencyBox(props: { entities: SeasonEntities; className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t, axisLabel, baseGrid, baseTooltip, valueAxis } = C;
  const query = useSeasonResults(filters.year, filters.sessionType);

  const boxes = useMemo<DriverBox[]>(() => {
    const rows = filteredSeasonRows(query.data?.items, props.entities, filters);
    const byDriver = new Map<
      number,
      { code: string; teamName: string; finishes: number[]; dnfs: number }
    >();
    for (const r of rows) {
      let d = byDriver.get(r.driver_id);
      if (!d) {
        d = {
          code: driverCode({ abbreviation: r.driver_abbreviation, surname: r.driver_surname }),
          teamName: r.team_name,
          finishes: [],
          dnfs: 0,
        };
        byDriver.set(r.driver_id, d);
      }
      if (statusBucket(r.status) === "finish" && r.position != null) {
        d.finishes.push(r.position);
      } else {
        d.dnfs += 1;
      }
    }
    const result: DriverBox[] = [];
    for (const [id, d] of byDriver) {
      if (d.finishes.length < 3) continue;
      const sorted = [...d.finishes].sort((a, b) => a - b);
      result.push({
        code: d.code,
        teamName: d.teamName,
        color: props.entities.driverById.get(id)?.color ?? t.blue,
        five: [
          sorted[0],
          quantileSorted(sorted, 0.25),
          quantileSorted(sorted, 0.5),
          quantileSorted(sorted, 0.75),
          sorted[sorted.length - 1],
        ],
        n: sorted.length,
        dnfs: d.dnfs,
      });
    }
    return result.sort((a, b) => a.five[2] - b.five[2] || a.five[1] - b.five[1]);
  }, [query.data, filters, props.entities, t.blue]);

  const option = useMemo<EChartsOption | null>(() => {
    if (!boxes.length) return null;
    return {
      animationDuration: 300,
      grid: { ...baseGrid, top: 14 },
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (p: any) => {
          const b = boxes[p.dataIndex];
          if (!b) return "";
          const [min, q1, med, q3, max] = b.five;
          return (
            `<b>${b.code}</b> — ${b.teamName}<br/>` +
            `<span style="font-family:${MONO};font-size:10px">` +
            `MED P${med.toFixed(1)} · IQR P${q1.toFixed(1)}–P${q3.toFixed(1)} · RANGE P${min}–P${max}<br/>` +
            `${b.n} CLASSIFIED · ${b.dnfs} DNF</span>`
          );
        },
      },
      xAxis: {
        type: "category",
        data: boxes.map((b) => b.code),
        axisLine: { lineStyle: { color: t.axisLine } },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, fontSize: 9, interval: 0, rotate: boxes.length > 14 ? 45 : 0 },
      },
      yAxis: valueAxis({
        inverse: true,
        min: 1,
        minInterval: 1,
        axisLabel: { ...axisLabel, formatter: (v: number) => `P${v}` },
      }),
      series: [
        {
          type: "boxplot",
          boxWidth: [6, 16],
          data: boxes.map((b) => ({
            value: b.five,
            itemStyle: {
              color: withAlpha(b.color, 0.22),
              borderColor: b.color,
              borderWidth: 1.5,
            },
          })),
          emphasis: { itemStyle: { borderWidth: 2.5 } },
        },
      ],
    };
  }, [boxes, C]);

  return (
    <AnalyticsCard
      eyebrow="Season · Consistency"
      title="Finish distribution"
      subtitle={`${filters.year} · classified finishes · median-sorted`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No driver has 3+ classified finishes in the current selection."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

/** Performance vs. age at time of race — career-wide (2011 → latest season),
 *  independent of the season filter. A bold field-average line (starts-weighted) sits
 *  behind individual driver curves so a driver's arc reads against the
 *  typical career trajectory, not in isolation. */
import { useMemo } from "react";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useDriverAgeCurve } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { visibleDriverIds } from "@/features/dashboard/selectors";
import { driverCode } from "@/lib/format";
import type { SeasonEntities } from "@/features/dashboard/entities";

const TOP_N = 6;

export function DriverAgeCurve(props: { entities: SeasonEntities; className?: string }) {
  const { filters, latestYear } = useFilters();
  const C = useChartTheme();
  const { t, baseGrid, baseTooltip, valueAxis } = C;
  const query = useDriverAgeCurve();

  const option = useMemo<EChartsOption | null>(() => {
    const rows = query.data?.rows ?? [];
    if (!rows.length) return null;

    const byDriver = new Map<number, { code: string; total: number; points: { age: number; avg: number; starts: number }[] }>();
    for (const r of rows) {
      if (r.avg_points == null) continue;
      let d = byDriver.get(r.driver.id);
      if (!d) {
        d = { code: driverCode(r.driver), total: 0, points: [] };
        byDriver.set(r.driver.id, d);
      }
      d.total += r.total_points;
      d.points.push({ age: r.age, avg: r.avg_points, starts: r.starts });
    }

    // Field average per age, weighted by starts across every driver.
    const byAge = new Map<number, { sum: number; starts: number }>();
    for (const d of byDriver.values()) {
      for (const p of d.points) {
        const bucket = byAge.get(p.age) ?? { sum: 0, starts: 0 };
        bucket.sum += p.avg * p.starts;
        bucket.starts += p.starts;
        byAge.set(p.age, bucket);
      }
    }
    const fieldAges = [...byAge.keys()].sort((a, b) => a - b);
    const fieldData = fieldAges.map((age) => {
      const b = byAge.get(age)!;
      return [age, b.starts ? b.sum / b.starts : null];
    });

    const visible = visibleDriverIds(props.entities, filters);
    const selected = visible !== null
      ? [...byDriver.entries()].filter(([id]) => visible.has(id))
      : [...byDriver.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, TOP_N);

    const series: LineSeriesOption[] = [
      {
        name: "Field average",
        type: "line",
        smooth: 0.3,
        symbol: "none",
        z: 1,
        lineStyle: { width: 3, color: t.inkMut, opacity: 0.55, type: "dashed" },
        emphasis: { disabled: true },
        data: fieldData,
        tooltip: {
          formatter: (p: unknown) => {
            const { value } = p as { value: [number, number] };
            return C.tip("Field average", [C.tipRow("AGE", `${value[0]}`), C.tipRow("AVG PTS", value[1]?.toFixed(2) ?? "—")]);
          },
        },
      },
      ...selected.map(([id, d]) => {
        const entity = props.entities.driverById.get(id);
        const color = entity?.color ?? t.blue;
        const sorted = [...d.points].sort((a, b) => a.age - b.age);
        return {
          name: d.code,
          type: "line" as const,
          smooth: 0.25,
          symbol: "circle",
          symbolSize: 5,
          z: 2,
          lineStyle: { width: 2, color, opacity: 0.9 },
          itemStyle: { color, borderColor: t.surface, borderWidth: 1.5 },
          emphasis: { focus: "series" as const, lineStyle: { width: 3 } },
          blur: { lineStyle: { opacity: 0.08 }, itemStyle: { opacity: 0.08 }, label: { show: false } },
          endLabel: {
            show: true,
            formatter: d.code,
            color: t.labelBright,
            fontFamily: MONO,
            fontSize: 9,
            distance: 6,
          },
          labelLayout: { moveOverlap: "shiftY" as const },
          data: sorted.map((p) => [p.age, p.avg]),
          tooltip: {
            formatter: (p: unknown) => {
              const { value } = p as { value: [number, number] };
              return C.tip(d.code, [C.tipRow("AGE", `${value[0]}`), C.tipRow("AVG PTS", value[1].toFixed(2))]);
            },
          },
        };
      }),
    ];

    return {
      animationDuration: 300,
      grid: { ...baseGrid, right: 56, top: 14, bottom: 6 },
      tooltip: { ...baseTooltip, trigger: "item" },
      xAxis: valueAxis({
        name: "Age",
        nameLocation: "middle",
        nameGap: 22,
        nameTextStyle: { color: t.inkSub, fontSize: 9, fontFamily: MONO },
        minInterval: 1,
      }),
      yAxis: valueAxis({ name: "Avg points / start", nameTextStyle: { color: t.inkSub, fontSize: 9, fontFamily: MONO } }),
      series,
    };
  }, [query.data, filters, props.entities, C]);

  return (
    <AnalyticsCard
      eyebrow="Drivers · Career"
      title="Age / experience curve"
      subtitle={`2011–${latestYear} · performance vs. age at time of race · dashed = field average`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No age-curve data available."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

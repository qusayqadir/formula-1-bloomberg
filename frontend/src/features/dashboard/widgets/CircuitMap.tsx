/** Season calendar on a dark world map (ECharts geo + bundled Natural Earth
 *  topology — no tile server, no network). Clicking a circuit focuses its
 *  round in the session widgets. */
import { useMemo } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useCircuitPerformance, useSeasonResults } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { focusRound, roundsFromResults } from "@/features/dashboard/selectors";
import { formatNumber } from "@/lib/format";

const world = worldData as unknown as Topology<{ countries: GeometryCollection }>;
echarts.registerMap("world", feature(world, world.objects.countries) as any);

export function CircuitMap(props: { className?: string }) {
  const { filters, set } = useFilters();
  const C = useChartTheme();
  const { t, baseTooltip } = C;
  const query = useCircuitPerformance(filters.year);
  const resultsQ = useSeasonResults(filters.year, filters.sessionType);

  // circuit → round number for the season (map click cross-filters the round)
  const circuitRound = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of resultsQ.data?.items ?? []) {
      if (r.round_number != null && !m.has(r.circuit_id)) m.set(r.circuit_id, r.round_number);
    }
    return m;
  }, [resultsQ.data]);
  const focused = focusRound(roundsFromResults(resultsQ.data?.items), filters);

  const option = useMemo<EChartsOption | null>(() => {
    const rows = (query.data?.rows ?? []).filter((r) => r.latitude != null && r.longitude != null);
    if (!rows.length) return null;
    return {
      animation: false,
      tooltip: {
        ...baseTooltip,
        formatter: (p: any) => {
          const r = rows[p.dataIndex];
          const round = circuitRound.get(r.circuit_id);
          return (
            `<b>${r.circuit_name}</b><br/>` +
            `<span style="font-family:${MONO};font-size:10px;color:${t.inkSub}">${[r.locality, r.country].filter(Boolean).join(", ")}${r.altitude != null ? ` · ${Math.round(r.altitude)}m` : ""}</span><br/>` +
            `<span style="font-family:${MONO};font-size:10px">${round != null ? `R${round} · ` : ""}${r.events} event${r.events === 1 ? "" : "s"} · avg pts ${formatNumber(r.avg_points)}</span>`
          );
        },
      },
      geo: {
        map: "world",
        roam: true,
        scaleLimit: { min: 1, max: 8 },
        silent: true,
        top: 6,
        bottom: 6,
        itemStyle: { areaColor: t.geoLand, borderColor: t.geoBorder, borderWidth: 0.6 },
        emphasis: { disabled: true },
      },
      series: [
        {
          type: "scatter",
          coordinateSystem: "geo",
          symbolSize: (val: number[]) => (circuitRound.get(val[3]) === focused ? 13 : 8),
          itemStyle: {
            color: (p: any) =>
              circuitRound.get(rows[p.dataIndex].circuit_id) === focused ? t.accent : t.blue,
            borderColor: t.geoPinBorder,
            borderWidth: 1.5,
          },
          emphasis: { scale: 1.6 },
          data: rows.map((r) => ({
            name: r.circuit_name,
            value: [r.longitude, r.latitude, r.events, r.circuit_id],
          })),
        },
      ],
    };
  }, [query.data, circuitRound, focused, C]);

  const events = {
    click: (params: any) => {
      if (params.componentType !== "series") return;
      const circuitId = params.value?.[3];
      const round = circuitRound.get(circuitId);
      if (round != null) set({ round });
    },
  };

  return (
    <AnalyticsCard
      eyebrow="Circuits · Geography"
      title="Calendar map"
      subtitle={`${filters.year} · click a marker to focus its round · drag to pan`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      expandable
      className={props.className}
    >
      {option && <EChart option={option} events={events} />}
    </AnalyticsCard>
  );
}

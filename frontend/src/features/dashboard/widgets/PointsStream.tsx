/** Scoring stream — a streamgraph of championship points gained per round by
 *  team. Built as a stacked area riding an invisible offset base (−total/2),
 *  so the river stays centered while band thickness carries the flow. The
 *  vertical axis is deliberately hidden: only thickness means anything. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { teamColor, withAlpha } from "@/lib/colors";
import { useTeamProgression } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { sliceProgression } from "@/features/dashboard/selectors";

const BASE = "__offset__";

export function PointsStream(props: { className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { baseGrid, baseTooltip, categoryAxis, legendStyle } = C;
  const query = useTeamProgression(filters.year);

  const option = useMemo<EChartsOption | null>(() => {
    const all = (query.data?.series ?? [])
      .filter((s) => filters.teamIds.length === 0 || filters.teamIds.includes(s.entity.id))
      .map((s) => ({ entity: s.entity, values: sliceProgression(s.values, filters) }))
      .filter((s) => s.values.length > 0);
    if (!all.length) return null;

    const rounds = [...new Set(all.flatMap((s) => s.values.map((v) => v.round_number)))].sort(
      (a, b) => a - b,
    );
    const teams = all
      .map((s) => {
        const byRound = new Map(s.values.map((v) => [v.round_number, v.points_gained]));
        const gained = rounds.map((rn) => byRound.get(rn) ?? 0);
        return { entity: s.entity, gained, total: gained.reduce((a, b) => a + b, 0) };
      })
      .sort((a, b) => b.total - a.total);
    if (!teams.some((t) => t.total > 0)) return null;
    const offsets = rounds.map(
      (_, i) => -teams.reduce((sum, t) => sum + t.gained[i], 0) / 2,
    );

    return {
      animationDuration: 300,
      grid: { ...baseGrid, top: 8, bottom: 22 },
      legend: { ...legendStyle, data: teams.map((t) => t.entity.name) },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        formatter: (ps: any[]) => {
          const i = ps[0]?.dataIndex ?? 0;
          const lines = teams
            .map((t) => ({ t, pts: t.gained[i] }))
            .sort((a, b) => b.pts - a.pts)
            .filter(({ pts }) => pts > 0)
            .map(
              ({ t, pts }) =>
                `<span style="display:inline-block;width:7px;height:7px;border-radius:2px;` +
                `background:${teamColor(t.entity)};margin-right:5px"></span>` +
                `${t.entity.name} <span style="font-family:${MONO};font-size:10px">+${pts}</span>`,
            );
          return `<b>R${rounds[i]}</b><br/>${lines.join("<br/>") || "no points scored"}`;
        },
      },
      xAxis: categoryAxis(rounds.map((rn) => `R${rn}`), { boundaryGap: false }),
      yAxis: { type: "value", show: false },
      series: [
        {
          name: BASE,
          type: "line" as const,
          stack: "river",
          symbol: "none",
          silent: true,
          smooth: 0.35,
          lineStyle: { width: 0, opacity: 0 },
          areaStyle: { opacity: 0 },
          tooltip: { show: false },
          data: offsets,
        },
        ...teams.map((t) => {
          const color = teamColor(t.entity);
          return {
            name: t.entity.name,
            type: "line" as const,
            stack: "river",
            symbol: "none",
            smooth: 0.35,
            lineStyle: { width: 1, color, opacity: 0.9 },
            itemStyle: { color },
            areaStyle: { color: withAlpha(color, 0.6) },
            emphasis: { focus: "series" as const },
            data: t.gained,
          };
        }),
      ],
    };
  }, [query.data, filters, C]);

  return (
    <AnalyticsCard
      eyebrow="Championship · Flow"
      title="Scoring stream"
      subtitle={`${filters.year} · championship points gained per round`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No championship snapshots for the current selection."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

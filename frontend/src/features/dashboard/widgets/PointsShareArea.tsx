/** Championship composition — 100% stacked area of cumulative points share
 *  by team across the season. Bands stack biggest-first (bottom), wear team
 *  identity colors, and the tooltip re-ranks per round. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { teamColor, withAlpha } from "@/lib/colors";
import { useTeamProgression } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { sliceProgression } from "@/features/dashboard/selectors";

export function PointsShareArea(props: { className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { axisLabel, baseGrid, baseTooltip, categoryAxis, legendStyle, valueAxis } = C;
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
    // Cumulative points per round with carry-forward, biggest team at the bottom.
    const teams = all
      .map((s) => {
        const byRound = new Map(s.values.map((v) => [v.round_number, v.points]));
        let last = 0;
        const cumulative = rounds.map((rn) => (byRound.has(rn) ? (last = byRound.get(rn)!) : last));
        return { entity: s.entity, cumulative, final: cumulative[cumulative.length - 1] ?? 0 };
      })
      .sort((a, b) => b.final - a.final);
    const totals = rounds.map((_, i) => teams.reduce((sum, t) => sum + t.cumulative[i], 0));
    const shares = teams.map((t) =>
      t.cumulative.map((v, i) => (totals[i] > 0 ? (v / totals[i]) * 100 : 0)),
    );

    return {
      animationDuration: 300,
      grid: { ...baseGrid, top: 14, bottom: 22 },
      legend: { ...legendStyle, data: teams.map((t) => t.entity.name) },
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        formatter: (ps: any[]) => {
          const i = ps[0]?.dataIndex ?? 0;
          const lines = teams
            .map((t, ti) => ({ t, share: shares[ti][i], pts: t.cumulative[i] }))
            .sort((a, b) => b.share - a.share)
            .map(
              ({ t, share, pts }) =>
                `<span style="display:inline-block;width:7px;height:7px;border-radius:2px;` +
                `background:${teamColor(t.entity)};margin-right:5px"></span>` +
                `${t.entity.name} <span style="font-family:${MONO};font-size:10px">` +
                `${share.toFixed(1)}% · ${pts} PTS</span>`,
            );
          return `<b>R${rounds[i]}</b><br/>${lines.join("<br/>")}`;
        },
      },
      xAxis: categoryAxis(rounds.map((rn) => `R${rn}`)),
      yAxis: valueAxis({
        max: 100,
        axisLabel: { ...axisLabel, formatter: (v: number) => `${v}%` },
      }),
      series: teams.map((t, ti) => {
        const color = teamColor(t.entity);
        return {
          name: t.entity.name,
          type: "line" as const,
          stack: "share",
          symbol: "none",
          lineStyle: { width: 1, color },
          itemStyle: { color },
          areaStyle: { color: withAlpha(color, 0.55) },
          emphasis: { focus: "series" as const },
          data: shares[ti],
        };
      }),
    };
  }, [query.data, filters, C]);

  return (
    <AnalyticsCard
      eyebrow="Championship · Composition"
      title="Points share"
      subtitle={`${filters.year} · cumulative championship points, 100% stacked`}
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

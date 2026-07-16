/** Points sunburst — the season's one true hierarchy: total → team → seat.
 *  Inner ring teams in identity color, outer ring driver seats in the same
 *  hue stepped by opacity (mid-season swaps appear under both teams, which
 *  is the honest attribution). Labels hide below a minimum slice angle. */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { teamColor, withAlpha } from "@/lib/colors";
import { useSeatMap } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { driverCode } from "@/lib/format";

const SEAT_ALPHA = [0.95, 0.7, 0.5, 0.35];

export function SeasonSunburst(props: { className?: string }) {
  const { filters } = useFilters();
  const C = useChartTheme();
  const { t, baseTooltip } = C;
  const query = useSeatMap(filters.year);

  const option = useMemo<EChartsOption | null>(() => {
    const seats = (query.data?.rows ?? []).filter(
      (r) =>
        r.driver != null &&
        (filters.teamIds.length === 0 || filters.teamIds.includes(r.team.id)) &&
        (filters.driverIds.length === 0 || filters.driverIds.includes(r.driver.id)),
    );
    if (!seats.length) return null;

    const teams = new Map<
      number,
      { name: string; color: string; value: number; children: { name: string; value: number }[] }
    >();
    for (const seat of seats) {
      let team = teams.get(seat.team.id);
      if (!team) {
        team = { name: seat.team.name, color: teamColor(seat.team), value: 0, children: [] };
        teams.set(seat.team.id, team);
      }
      const points = seat.total_points ?? 0;
      team.value += points;
      team.children.push({ name: driverCode(seat.driver!), value: points });
    }
    const seasonTotal = [...teams.values()].reduce((sum, t) => sum + t.value, 0);
    if (seasonTotal <= 0) return null;

    const data = [...teams.values()]
      .sort((a, b) => b.value - a.value)
      .map((team) => ({
        name: team.name,
        value: team.value,
        itemStyle: { color: team.color },
        children: team.children
          .sort((a, b) => b.value - a.value)
          .map((seat, i) => ({
            name: seat.name,
            value: seat.value,
            itemStyle: { color: withAlpha(team.color, SEAT_ALPHA[Math.min(i, SEAT_ALPHA.length - 1)]) },
          })),
      }));

    return {
      animationDuration: 300,
      tooltip: {
        ...baseTooltip,
        formatter: (p: any) => {
          const pct = ((p.value / seasonTotal) * 100).toFixed(1);
          return (
            `<b>${p.name}</b><br/>` +
            `<span style="font-family:${MONO};font-size:10px">${p.value} PTS · ${pct}% OF SEASON</span>`
          );
        },
      },
      series: [
        {
          type: "sunburst",
          radius: ["16%", "92%"],
          nodeClick: false,
          sort: undefined,
          emphasis: { focus: "ancestor" },
          itemStyle: { borderColor: t.surface, borderWidth: 2 },
          levels: [
            {},
            {
              r0: "16%",
              r: "56%",
              label: {
                rotate: "tangential",
                fontSize: 9,
                fontFamily: MONO,
                color: t.heatLabel,
                textBorderColor: t.heatLabelBorder,
                textBorderWidth: 1.5,
                minAngle: 9,
              },
            },
            {
              r0: "56%",
              r: "88%",
              label: {
                rotate: "radial",
                fontSize: 8,
                fontFamily: MONO,
                color: t.heatLabel,
                textBorderColor: t.heatLabelBorder,
                textBorderWidth: 1.5,
                minAngle: 5,
              },
            },
          ],
          data,
        },
      ],
    };
  }, [query.data, filters, C]);

  return (
    <AnalyticsCard
      eyebrow="Season · Hierarchy"
      title="Points sunburst"
      subtitle={`${filters.year} · season total → team → seat`}
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      emptyText="No points scored in the current selection."
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} />}
    </AnalyticsCard>
  );
}

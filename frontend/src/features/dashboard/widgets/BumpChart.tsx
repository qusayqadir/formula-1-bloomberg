/** Championship position bump chart — the page's centrepiece. Same
 *  progression dataset as the line charts; entity toggle switches between
 *  driver and constructor snapshots. Unselected series are muted; hover
 *  focuses one series and blurs the field. */
import { useMemo, useState } from "react";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Segmented } from "@/components/ui/controls";
import { EChart } from "@/components/charts/EChart";
import { MONO, useChartTheme } from "@/components/charts/theme";
import { useDriverProgression, useTeamProgression } from "@/lib/queries";
import { useFilters } from "@/state/filters";
import { sliceProgression, visibleDriverIds } from "@/features/dashboard/selectors";
import type { SeasonEntities } from "@/features/dashboard/entities";

type Entity = "drivers" | "teams";

export function BumpChart(props: { entities: SeasonEntities; className?: string }) {
  const { filters, toggleDriver, toggleTeam } = useFilters();
  const [entity, setEntity] = useState<Entity>("drivers");
  const C = useChartTheme();
  const { t, axisLabel, baseGrid, baseTooltip, categoryAxis } = C;
  const driversQ = useDriverProgression(filters.year);
  const teamsQ = useTeamProgression(filters.year);
  const query = entity === "drivers" ? driversQ : teamsQ;

  const option = useMemo<EChartsOption | null>(() => {
    const data = query.data;
    if (!data) return null;
    const visible = entity === "drivers" ? visibleDriverIds(props.entities, filters) : null;
    const teamSel = entity === "teams" && filters.teamIds.length ? new Set(filters.teamIds) : null;
    const hasSelection = entity === "drivers" ? visible !== null : teamSel !== null;

    const roundNumbers = new Set<number>();
    let maxPosition = 0;
    const series: LineSeriesOption[] = [];

    for (const s of data.series) {
      const id = (s.entity as { id: number }).id;
      const values = sliceProgression(s.values, filters).filter((v) => v.position != null);
      if (!values.length) continue;
      for (const v of values) roundNumbers.add(v.round_number);
      maxPosition = Math.max(maxPosition, ...values.map((v) => v.position ?? 0));

      let label: string, color: string, dash: "solid" | "dashed" | "dotted" = "solid";
      if (entity === "drivers") {
        const d = props.entities.driverById.get(id);
        label = d?.code ?? String(id);
        color = d?.color ?? t.neutral;
        dash = d?.lineStyle ?? "solid";
      } else {
        const team = props.entities.teamById.get(id);
        label = team?.name?.split(" ")[0] ?? String(id);
        color = team?.color ?? t.neutral;
      }
      const selected = entity === "drivers" ? (visible?.has(id) ?? false) : (teamSel?.has(id) ?? false);
      const dimmed = hasSelection && !selected;

      series.push({
        name: label,
        id: `${entity}-${id}`,
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: selected ? 3 : 2, type: dash, opacity: dimmed ? 0.16 : 0.9 },
        itemStyle: {
          color,
          opacity: dimmed ? 0.16 : 1,
          borderColor: t.surface,
          borderWidth: 1.5,
        },
        color,
        emphasis: { focus: "series", lineStyle: { width: 3, opacity: 1 } },
        blur: { lineStyle: { opacity: 0.08 }, itemStyle: { opacity: 0.08 }, label: { show: false } },
        endLabel: {
          show: true,
          formatter: label,
          color: dimmed ? t.labelDim : t.labelBright,
          fontFamily: MONO,
          fontSize: 9,
          distance: 6,
        },
        labelLayout: { moveOverlap: "shiftY" },
        data: values.map((v) => ({
          name: v.round_name ?? `R${v.round_number}`,
          value: [`R${v.round_number}`, v.position],
        })),
        triggerLineEvent: true,
      });
    }
    if (!series.length) return null;
    const rounds = [...roundNumbers].sort((a, b) => a - b).map((n) => `R${n}`);

    return {
      animationDuration: 300,
      grid: { ...baseGrid, right: 64, top: 14, bottom: 6 },
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (p: any) =>
          C.tip(p.data.name, [C.tipRow(p.seriesName, `P${p.value[1]}`, { swatch: p.color })]),
      },
      xAxis: categoryAxis(rounds, { boundaryGap: false }),
      yAxis: {
        type: "value",
        inverse: true,
        min: 1,
        max: maxPosition,
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisLabel, formatter: "P{value}" },
        splitLine: { lineStyle: { color: t.gridLine, width: 1, type: "solid" } },
      },
      series,
    };
  }, [query.data, entity, filters, props.entities, C]);

  const onSeriesClick = (params: any) => {
    const id = Number(String(params.seriesId ?? "").split("-")[1]);
    if (!Number.isInteger(id)) return;
    if (entity === "drivers") toggleDriver(id);
    else toggleTeam(id);
  };

  return (
    <AnalyticsCard
      eyebrow="Championship · Position flow"
      title="Bump chart"
      subtitle={`${filters.year} · click a line to pin it as a filter`}
      controls={
        <Segmented
          ariaLabel="Bump chart entity"
          value={entity}
          options={[
            { value: "drivers", label: "DRIVERS" },
            { value: "teams", label: "TEAMS" },
          ]}
          onChange={setEntity}
        />
      }
      loading={query.isPending}
      refreshing={query.isFetching && !query.isPending}
      error={query.error as Error | null}
      onRetry={() => query.refetch()}
      empty={!query.isPending && !query.error && !option}
      expandable
      className={props.className}
      bodyClassName="p-2"
    >
      {option && <EChart option={option} events={{ click: onSeriesClick }} chartKey={entity} />}
    </AnalyticsCard>
  );
}

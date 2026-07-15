import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

export type EChartEvents = Record<string, (params: any) => void>;

interface Props {
  option: EChartsOption;
  events?: EChartEvents;
  className?: string;
  /** re-created (dispose+init) when this changes — for structural swaps */
  chartKey?: string;
}

/** Owning wrapper for an ECharts instance: init once, ResizeObserver-driven
 *  resize (cards + fullscreen just work), notMerge option updates. */
export function EChart({ option, events, className, chartKey }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const eventsRef = useRef<EChartEvents | undefined>(events);
  eventsRef.current = events;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const chart = echarts.init(node, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const proxyHandlers: [string, (p: any) => void][] = [];
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(node);
    // stable proxy handlers so option updates never rebind
    const bind = (name: string) => {
      const handler = (params: any) => eventsRef.current?.[name]?.(params);
      chart.on(name, handler);
      proxyHandlers.push([name, handler]);
    };
    for (const name of Object.keys(eventsRef.current ?? {})) bind(name);
    return () => {
      observer.disconnect();
      for (const [name, handler] of proxyHandlers) chart.off(name, handler);
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartKey]);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option, chartKey]);

  return <div ref={nodeRef} className={className ?? "h-full w-full"} />;
}

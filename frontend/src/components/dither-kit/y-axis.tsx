"use client"

import { useChartPart } from "./chart-context"

export function YAxis({
  tickFormatter,
  tickCount = 4,
  tickMargin = 8,
  dataKey,
  maxTicks = 8,
}: {
  tickFormatter?: (value: number) => string
  tickCount?: number
  tickMargin?: number
  /** Horizontal-orientation bars only: which row field to label categories with. */
  dataKey?: string
  /** Horizontal-orientation bars only: max category labels to draw. */
  maxTicks?: number
}) {
  const ctx = useChartPart("YAxis")
  if (!ctx.ready) return null

  // Horizontal-orientation bars: the y axis carries CATEGORY labels (the
  // role <XAxis> normally plays), read off ctx.data/ctx.xCenter like <XAxis> does.
  if (ctx.orientation === "horizontal") {
    const step = Math.max(1, Math.ceil(ctx.dataLength / maxTicks))
    return (
      <g className="fill-current font-mono text-[10px] text-muted-foreground">
        {ctx.data.map((row, i) => {
          if (i % step !== 0) return null
          const raw = dataKey ? row[dataKey] : i
          const label = String(raw ?? "")
          return (
            <text
              // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable category position
              key={i}
              x={-tickMargin}
              y={ctx.xCenter(i) ?? 0}
              textAnchor="end"
              dominantBaseline="central"
              fill="currentColor"
            >
              {label}
            </text>
          )
        })}
      </g>
    )
  }

  return (
    <g className="fill-current font-mono text-[10px] text-muted-foreground">
      {ctx.y.ticks(tickCount).map((t) => (
        <text
          key={t}
          x={-tickMargin}
          y={ctx.y(t)}
          textAnchor="end"
          dominantBaseline="central"
          fill="currentColor"
        >
          {tickFormatter ? tickFormatter(t) : t}
        </text>
      ))}
    </g>
  )
}

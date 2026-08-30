import { useChartPart } from "./chart-context"

export function XAxis({
  dataKey,
  tickFormatter,
  tickMargin = 8,
  maxTicks = 8,
  tickCount = 4,
}: {
  dataKey?: string
  tickFormatter?: (value: unknown, index: number) => string
  tickMargin?: number
  maxTicks?: number
  /** Horizontal-orientation bars only: how many value ticks to draw. */
  tickCount?: number
}) {
  const ctx = useChartPart("XAxis")
  if (!ctx.ready) return null

  // Horizontal-orientation bars: the x axis carries VALUE ticks (the role
  // <YAxis> normally plays), read off ctx.y like <YAxis> does.
  if (ctx.orientation === "horizontal") {
    const y = ctx.plot.height + tickMargin
    return (
      <g className="fill-current font-mono text-[10px] text-muted-foreground">
        {ctx.y.ticks(tickCount).map((t) => (
          <text
            key={t}
            x={ctx.y(t)}
            y={y}
            textAnchor="middle"
            dominantBaseline="hanging"
            fill="currentColor"
          >
            {tickFormatter ? tickFormatter(t, 0) : String(t)}
          </text>
        ))}
      </g>
    )
  }

  const step = Math.max(1, Math.ceil(ctx.dataLength / maxTicks))
  const y = ctx.plot.height + tickMargin

  return (
    <g className="fill-current font-mono text-[10px] text-muted-foreground">
      {ctx.data.map((row, i) => {
        if (i % step !== 0) return null
        const raw = dataKey ? row[dataKey] : i
        const label = tickFormatter ? tickFormatter(raw, i) : String(raw ?? "")
        return (
          <text
            // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable x position
            key={i}
            x={ctx.xCenter(i) ?? 0}
            y={y}
            textAnchor="middle"
            dominantBaseline="hanging"
            fill="currentColor"
          >
            {label}
          </text>
        )
      })}
    </g>
  )
}

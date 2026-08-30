import { useChartPart } from "./chart-context"

export function Grid({
  horizontal = true,
  vertical = false,
  strokeDasharray = "3 3",
}: {
  horizontal?: boolean
  vertical?: boolean
  strokeDasharray?: string
}) {
  const ctx = useChartPart("Grid")
  if (!ctx.ready) return null
  const { width, height } = ctx.plot
  // `horizontal`/`vertical` describe VALUE gridlines vs CATEGORY gridlines,
  // not screen direction — for a horizontal-orientation bar chart the value
  // axis runs left-right, so its gridlines are drawn as vertical strokes
  // (and vice-versa for category gridlines).
  const orientedHorizontal = ctx.orientation === "horizontal"

  return (
    <g className="stroke-border" strokeDasharray={strokeDasharray}>
      {horizontal &&
        (orientedHorizontal
          ? ctx.y
              .ticks(4)
              .map((t) => (
                <line key={`h-${t}`} x1={ctx.y(t)} x2={ctx.y(t)} y1={0} y2={height} />
              ))
          : ctx.y
              .ticks(4)
              .map((t) => (
                <line key={`h-${t}`} x1={0} x2={width} y1={ctx.y(t)} y2={ctx.y(t)} />
              )))}
      {vertical &&
        (orientedHorizontal
          ? ctx.data.map((_, i) => (
              <line
                // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable category position
                key={`v-${i}`}
                x1={0}
                x2={width}
                y1={ctx.xCenter(i) ?? 0}
                y2={ctx.xCenter(i) ?? 0}
              />
            ))
          : ctx.data.map((_, i) => (
              <line
                // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable category position
                key={`v-${i}`}
                x1={ctx.xCenter(i) ?? 0}
                x2={ctx.xCenter(i) ?? 0}
                y1={0}
                y2={height}
              />
            )))}
    </g>
  )
}

// Render beneath the dither canvas so grid lines sit behind the fill.
Grid.chartLayer = "back" as const

"use client"

import { type ReactNode, useEffect } from "react"
import {
  type AreaVariant,
  type StrokeVariant,
  useChartPart,
} from "./chart-context"
import { SeriesContext } from "./series-context"

export type BarProps = {
  dataKey: string
  variant?: AreaVariant
  strokeVariant?: StrokeVariant
  isClickable?: boolean
  /** Horizontal-orientation only: fade the dither across the bar's own
   * height ("up"/"down") instead of along the value axis. Ignored by
   * vertical bars. Defaults to "value" — every existing chart keeps its
   * current look unless it opts in. */
  fadeDirection?: "value" | "up" | "down"
  children?: ReactNode
}

/**
 * One bar series. The dithered bars are painted on the canvas; this registers
 * the series and (when `isClickable`) lays transparent hit rects over each bar
 * — using the shared `barSlot` geometry so clicks line up with the pixels — to
 * select the series. The Legend offers the same toggle accessibly.
 */
export function Bar({
  dataKey,
  variant = "gradient",
  strokeVariant = "solid",
  isClickable = false,
  fadeDirection = "value",
  children,
}: BarProps) {
  const ctx = useChartPart("Bar", "bar")
  const { registerSeries, unregisterSeries } = ctx

  if (process.env.NODE_ENV !== "production" && !ctx.config[dataKey]) {
    console.warn(
      `<Bar dataKey="${dataKey}" />: "${dataKey}" is not in the chart \`config\`. Add it so the series has a colour and label.`
    )
  }

  useEffect(() => {
    registerSeries({ dataKey, kind: "bar", variant, strokeVariant, fadeDirection })
    return () => unregisterSeries(dataKey)
  }, [dataKey, variant, strokeVariant, fadeDirection, registerSeries, unregisterSeries])

  const band = ctx.bands[dataKey]
  if (!ctx.ready || !band) return null

  const seed = ctx.seedOf(dataKey)
  const dimmed = ctx.selectedDataKey !== null && ctx.selectedDataKey !== dataKey
  const si = ctx.configKeys.indexOf(dataKey)
  const n = ctx.configKeys.length
  const onClick = () =>
    ctx.selectDataKey(ctx.selectedDataKey === dataKey ? null : dataKey)

  return (
    <>
      {isClickable &&
        band.map((b, i) => {
          const slot = ctx.barSlot(i, si, n)
          const top = ctx.y(b[1])
          const base = ctx.y(b[0])
          const lo = Math.min(top, base)
          const size = Math.abs(base - top)
          const horizontal = ctx.orientation === "horizontal"
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: progressive enhancement; the Legend offers the same toggle accessibly
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable category position
              key={i}
              x={horizontal ? lo : slot.x}
              y={horizontal ? slot.x : lo}
              width={horizontal ? size : slot.width}
              height={horizontal ? slot.width : size}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={onClick}
            />
          )
        })}
      <SeriesContext value={{ dataKey, seed, dimmed }}>
        {children}
      </SeriesContext>
    </>
  )
}

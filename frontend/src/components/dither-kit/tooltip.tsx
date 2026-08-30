"use client"

import { AnimatePresence, motion, type Transition } from "motion/react"
import { useState } from "react"
import { useCommonChart } from "./common-context"
import { cn } from "./lib"
import { rgb } from "./palette"

export type TooltipVariant = "default" | "frosted-glass"

/* `popover` tokens don't exist in this Tailwind theme — use the app's raised
 * surface so the card keeps contrast over bright marks. */
const VARIANT: Record<TooltipVariant, string> = {
  default: "bg-raised",
  "frosted-glass": "bg-raised/75 backdrop-blur-sm",
}

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.6,
}

/**
 * Floating hover tooltip. Reads the shared common context so it works in every
 * chart family. It glides between points and fades in/out (instead of snapping),
 * and dims unselected series/slices.
 */
export function Tooltip({
  labelKey,
  valueFormatter,
  variant = "frosted-glass",
  transition = DEFAULT_TRANSITION,
}: {
  labelKey?: string
  valueFormatter?: (value: number, name: string) => string
  variant?: TooltipVariant
  /** Override the glide/fade spring — e.g. a snappier feel for a dense widget. */
  transition?: Transition
}) {
  const chart = useCommonChart()
  const show = chart.ready && chart.hoverIndex != null

  // Retain the last hovered index so the card keeps its content while fading
  // out — adjust-state-during-render (no refs in render).
  const [lastIndex, setLastIndex] = useState(0)
  if (chart.hoverIndex != null && chart.hoverIndex !== lastIndex) {
    setLastIndex(chart.hoverIndex)
  }
  const index = chart.hoverIndex ?? lastIndex

  const heading = chart.heading(index, labelKey)
  const items = chart.itemsAt(index)

  // Clamp the centered card inside its chart container so it never clips at
  // the edges — the context's clamp is point-based and doesn't know our width.
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  let left = chart.tooltipLeft
  const parent = el?.offsetParent as HTMLElement | null
  if (el && parent) {
    const half = el.offsetWidth / 2
    left = Math.min(Math.max(left, half + 4), Math.max(half + 4, parent.clientWidth - half - 4))
  }

  return (
    <AnimatePresence>
      {show && items.length > 0 && (
        <motion.div
          key="dither-tooltip"
          ref={setEl}
          initial={{
            opacity: 0,
            x: "-50%",
            y: "-115%",
            top: chart.tooltipTop,
            left,
          }}
          animate={{
            opacity: 1,
            x: "-50%",
            y: "-115%",
            top: chart.tooltipTop,
            left,
          }}
          exit={{ opacity: 0 }}
          transition={transition}
          className={cn(
            "pointer-events-none absolute z-10 rounded-md border px-2 py-1 shadow-sm",
            VARIANT[variant]
          )}
        >
          {heading && (
            <div className="mb-0.5 font-mono text-[10px] text-sub">
              {heading}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 font-mono text-[11px] text-ink tabular-nums"
                style={{ opacity: item.dimmed ? 0.4 : 1 }}
              >
                <span
                  className="size-2 rounded-[1px]"
                  style={{ backgroundColor: rgb(item.seed.fill) }}
                />
                <span className="text-sub">{item.label}</span>
                <span className="ml-auto pl-2 text-ink">
                  {valueFormatter
                    ? valueFormatter(item.value, item.name)
                    : item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

Tooltip.chartLayer = "dom" as const

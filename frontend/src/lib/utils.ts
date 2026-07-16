/** Minimal class combiner (clsx-style) — enough for conditional classNames
 *  without pulling in clsx/tailwind-merge. */
export function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}

/** Thinking loader — a single line segment sweeping clockwise around a
 *  circular track. Keyframes live in styles/index.css (.think-spin);
 *  reduced-motion is handled by the global media rule. */

export function ThinkingDots(props: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={props.label ?? "Generating response"}
      className="think-spin block h-4 w-4 rounded-full border-[1.5px] border-ink/15 border-t-ink"
    />
  );
}

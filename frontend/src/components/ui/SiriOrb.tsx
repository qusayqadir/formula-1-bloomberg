/** SiriOrb — a small, continuously swirling gradient orb (smoothui-style).
 *  Pure CSS: two counter-rotating blurred conic gradients inside a circular
 *  mask, so it animates forever at no JS cost. Used as the "AI is here"
 *  affordance beside the chat toggle. */

const KEYFRAMES = `
@keyframes siri-orb-spin { to { transform: rotate(360deg); } }
@keyframes siri-orb-spin-rev { to { transform: rotate(-360deg); } }
`;

export function SiriOrb({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flex: "none",
        isolation: "isolate",
      }}
    >
      <style>{KEYFRAMES}</style>
      <span
        style={{
          position: "absolute",
          inset: "-25%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, #7c8cf8, #45c4f9, #b06ef7, #f472b6, #7c8cf8)",
          filter: `blur(${Math.max(2, size / 6)}px)`,
          animation: "siri-orb-spin 3.2s linear infinite",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: "10%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 180deg, rgba(255,255,255,0.85), rgba(69,196,249,0.4), rgba(176,110,247,0.55), rgba(255,255,255,0.85))",
          filter: `blur(${Math.max(2, size / 5)}px)`,
          animation: "siri-orb-spin-rev 2.4s linear infinite",
          mixBlendMode: "screen",
        }}
      />
    </span>
  );
}

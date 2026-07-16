/** Architecture — intentionally an empty scaffold. The full system design
 *  (backend, frontend, chat/RAG, news, sentiment & odds, 3D track model,
 *  pipeline) gets laid out here by hand. */
const PLANNED_SECTIONS = [
  "Backend services",
  "Frontend",
  "Chat / RAG",
  "News",
  "Sentiment & odds",
  "3D track model",
  "Data pipeline",
];

export function DocsArchitecture() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-8">
      <p className="eyebrow">Documentation / Architecture</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">System design</h1>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-sub">
        The end-to-end architecture of the platform will be documented here.
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-stroke-strong p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mut">
          Nothing here yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-sub">
          Planned sections:
        </p>
        <div className="mx-auto mt-3 flex max-w-md flex-wrap justify-center gap-1.5">
          {PLANNED_SECTIONS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-stroke px-2.5 py-0.5 font-mono text-[10px] text-sub"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ComingSoon(props: { title: string; note: string }) {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="eyebrow">In the pipeline</p>
      <h1 className="text-xl font-semibold tracking-tight text-ink">{props.title}</h1>
      <p className="text-xs leading-relaxed text-sub">{props.note}</p>
    </div>
  );
}

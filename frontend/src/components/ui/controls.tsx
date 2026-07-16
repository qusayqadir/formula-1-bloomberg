/** Dense terminal-style form controls shared by the filter bar and widgets. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

interface Option<V extends string | number> {
  value: V;
  label: string;
  hint?: string;
  swatch?: string;
}

/* Frosted-glass dropdown panel — same treatment as the chart tooltips
 * (translucent raised fill + backdrop blur + light ink border). */
const GLASS_PANEL =
  "absolute left-0 top-8 z-40 max-h-72 overflow-y-auto rounded-md border border-ink/20 bg-raised/75 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.1)] backdrop-blur-sm";

/** Single-select dropdown with the glass panel (native <select> popups are
 *  OS-rendered and can't match the tooltip styling). */
export function GlassSelect<V extends string | number>(props: {
  label: string;
  value: V;
  options: Option<V>[];
  onChange: (v: V) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = props.options.find((o) => o.value === props.value);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={props.label}
        className="flex h-7 items-center gap-1.5 rounded-md border border-stroke bg-raised pl-2 pr-1.5 transition-colors hover:border-stroke-strong"
      >
        <span className="eyebrow !text-mut">{props.label}</span>
        <span className="max-w-40 truncate font-mono text-[11px] font-medium text-ink">
          {current?.label ?? String(props.value)}
        </span>
        <ChevronDown size={11} className="text-mut" />
      </button>
      {open && (
        <div role="listbox" className={`${GLASS_PANEL} w-48`}>
          {props.options.map((o) => {
            const active = o.value === props.value;
            return (
              <button
                key={o.value}
                role="option"
                aria-selected={active}
                onClick={() => {
                  props.onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[11px] tabular-nums text-ink hover:bg-ink/10"
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="font-mono text-[10px] text-sub">{o.hint}</span>}
                {active && <Check size={12} className="flex-none text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Select<V extends string | number>(props: {
  label: string;
  value: V;
  options: Option<V>[];
  onChange: (v: V) => void;
  numeric?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="group flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-stroke bg-raised pl-2 pr-1.5 transition-colors hover:border-stroke-strong">
      <span className="eyebrow !text-mut">{props.label}</span>
      <select
        id={id}
        value={props.value}
        onChange={(e) =>
          props.onChange((props.numeric ? Number(e.target.value) : e.target.value) as V)
        }
        className="max-w-40 cursor-pointer appearance-none bg-transparent pr-4 font-mono text-[11px] font-medium text-ink outline-none [&>option]:bg-raised"
        style={{ backgroundImage: "none" }}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={11} className="-ml-4 pointer-events-none text-mut" />
    </label>
  );
}

export function MultiSelect(props: {
  label: string;
  placeholder: string;
  options: Option<number>[];
  selected: number[];
  onToggle: (v: number) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary =
    props.selected.length === 0
      ? props.placeholder
      : props.selected.length <= 2
        ? props.options
            .filter((o) => props.selected.includes(o.value))
            .map((o) => o.label)
            .join(", ")
        : `${props.selected.length} selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex h-7 items-center gap-1.5 rounded-md border pl-2 pr-1.5 transition-colors ${
          props.selected.length
            ? "border-accent/40 bg-accent/10"
            : "border-stroke bg-raised hover:border-stroke-strong"
        }`}
      >
        <span className="eyebrow !text-mut">{props.label}</span>
        <span className="max-w-36 truncate font-mono text-[11px] font-medium text-ink">
          {summary}
        </span>
        <ChevronDown size={11} className="text-mut" />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className={`${GLASS_PANEL} w-56`}
        >
          {props.selected.length > 0 && (
            <button
              onClick={props.onClear}
              className="w-full px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-ink/10"
            >
              Clear selection
            </button>
          )}
          {props.options.map((o) => {
            const active = props.selected.includes(o.value);
            return (
              <button
                key={o.value}
                role="option"
                aria-selected={active}
                onClick={() => props.onToggle(o.value)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[11px] tabular-nums text-ink hover:bg-ink/10"
              >
                {o.swatch && (
                  <span
                    aria-hidden
                    className="h-2 w-2 flex-none rounded-[1px]"
                    style={{ background: o.swatch }}
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="font-mono text-[10px] text-sub">{o.hint}</span>}
                {active && <Check size={12} className="flex-none text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Compact segmented control for widget-local metric switches. */
export function Segmented<V extends string>(props: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={props.ariaLabel}
      className="flex h-6 items-center gap-px rounded-md border border-stroke bg-inset p-px"
    >
      {props.options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={props.value === o.value}
          onClick={() => props.onChange(o.value)}
          className={`rounded-[5px] px-2 font-mono text-[10px] font-medium leading-5 transition-colors ${
            props.value === o.value
              ? "bg-raised text-ink shadow-[var(--control-inset)]"
              : "text-mut hover:text-sub"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip(props: { label: string; onRemove: () => void; swatch?: string }) {
  return (
    <span className="flex h-6 items-center gap-1.5 rounded-full border border-stroke bg-raised pl-2.5 pr-1 font-mono text-[10px] text-ink">
      {props.swatch && (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: props.swatch }} />
      )}
      {props.label}
      <button
        onClick={props.onRemove}
        aria-label={`Remove filter ${props.label}`}
        className="grid h-4 w-4 place-items-center rounded-full text-mut transition-colors hover:bg-ink/10 hover:text-ink"
      >
        ×
      </button>
    </span>
  );
}

export function InlineNote({ children }: { children: ReactNode }) {
  return <p className="px-3 py-2 font-mono text-[10px] leading-relaxed text-mut">{children}</p>;
}

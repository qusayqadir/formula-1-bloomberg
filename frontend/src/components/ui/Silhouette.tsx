import { Car, Image, User } from "lucide-react";

const ICONS = { person: User, car: Car, photo: Image } as const;

/** Bordered placeholder box for imagery we don't have yet (no S3 asset wired
 *  up). Reads as "intentionally no image", not a broken image — dashed
 *  stroke + centered glyph on the raised surface, never a real photo frame. */
export function Silhouette(props: { variant: keyof typeof ICONS; className?: string; iconSize?: number }) {
  const Icon = ICONS[props.variant];
  return (
    <div
      className={`grid flex-none place-items-center rounded-md border border-dashed border-stroke bg-raised text-mut ${props.className ?? ""}`}
    >
      <Icon size={props.iconSize ?? 22} strokeWidth={1.5} />
    </div>
  );
}

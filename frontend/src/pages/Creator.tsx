import { UserRound } from "lucide-react";

/** Creator — centered profile image placeholder with intro text below.
 *  Swap the avatar block for a real <img> and the copy for real bio text. */
export function Creator() {
  return (
    <div className="flex h-full flex-col items-center gap-6 overflow-y-auto px-6 pt-10">
      {/* profile image placeholder — pinned to the top of the page */}
      <div className="grid h-45 w-45 flex-none place-items-center rounded-full border border-stroke bg-ink/[0.04] text-mut">
        <UserRound size={60} strokeWidth={1.2} />
      </div>

      {/* placeholder intro text — frosted-glass card (same language as tooltips) */}
      <div className="w-[70%] rounded-md border border-ink/20 bg-raised/75 px-8 py-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.1)] backdrop-blur-sm">
        <p className="text-[15px] font-semibold tracking-tight text-ink">Creator</p>
        <p className="mt-2 text-sm leading-relaxed text-sub">
          Placeholder bio — a few lines about who built the F1 Terminal, why it
          exists, and where to find more of their work.
        </p>
      </div>
    </div>
  );
}

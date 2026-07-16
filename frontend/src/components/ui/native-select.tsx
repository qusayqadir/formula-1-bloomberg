import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** shadcn-style NativeSelect, mapped onto the F1 Terminal token set
 *  (border-stroke / text-ink / accent ring) since the shadcn CSS variables
 *  (input, ring, muted-foreground…) don't exist in this theme. */

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
};

function NativeSelect({ className, size = "default", ...props }: NativeSelectProps) {
  return (
    <div
      className={cn(
        "group/native-select relative w-fit has-[select:disabled]:opacity-50",
        className,
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className="h-8 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-stroke bg-raised py-1 pl-2.5 pr-8 font-mono text-[11px] font-medium text-ink outline-none transition-colors selection:bg-accent selection:text-white placeholder:text-mut hover:border-stroke-strong focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-neg aria-invalid:ring-2 aria-invalid:ring-neg/30 data-[size=sm]:h-7 data-[size=sm]:rounded-md data-[size=sm]:py-0.5 [&>option]:bg-raised"
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 select-none text-mut"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  );
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };

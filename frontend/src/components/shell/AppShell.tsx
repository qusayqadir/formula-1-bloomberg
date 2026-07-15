import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/shell/Sidebar";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex h-full">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="flex h-11 flex-none items-center gap-3 border-b border-stroke bg-rail px-3 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-sub hover:text-ink"
          >
            <Menu size={16} />
          </button>
          <span className="text-[13px] font-semibold">F1 Terminal</span>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, PanelLeftOpen } from "lucide-react";
import { Sidebar } from "@/components/shell/Sidebar";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [railOpen, setRailOpen] = useState(true); // desktop rail
  return (
    <div className="flex h-full bg-bg">
      {/* desktop rail — animates closed */}
      <aside
        className={`hidden flex-none overflow-hidden border-r border-stroke transition-[width] duration-200 ease-out lg:block ${
          railOpen ? "w-[248px]" : "w-0 border-r-0"
        }`}
      >
        <div className="h-full w-[248px]">
          <Sidebar
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onCollapse={() => setRailOpen(false)}
          />
        </div>
      </aside>
      {/* mobile drawer lives inside Sidebar; render it once outside the rail */}
      <div className="lg:hidden">
        <Sidebar
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onCollapse={() => setRailOpen(false)}
        />
      </div>

      {/* floating expand button when the rail is collapsed */}
      {!railOpen && (
        <button
          onClick={() => setRailOpen(true)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="fixed bottom-4 left-3 z-40 hidden rounded-lg border border-stroke bg-rail p-2 text-sub shadow-[var(--shadow-pop)] transition-colors hover:bg-ink/[0.06] hover:text-ink lg:block"
        >
          <PanelLeftOpen size={15} strokeWidth={1.7} />
        </button>
      )}

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

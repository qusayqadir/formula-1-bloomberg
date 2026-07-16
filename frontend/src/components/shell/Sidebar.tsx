import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  Boxes,
  CalendarDays,
  Coffee,
  Footprints,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Moon,
  Newspaper,
  PanelLeftClose,
  Radio,
  Search,
  Sparkles,
  Sun,
  TerminalSquare,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useTheme } from "@/state/theme";
import { FileTree, FileTreeFile, FileTreeFolder } from "@/components/ai-elements/file-tree";

/** Strict-black rail. Navigation is a file-tree: folders group terminal /
 *  docs / support destinations; selection follows the router location.
 *  Identity accent stays reserved for the selected tick. */

const EXTERNAL = { coffee: "https://buymeacoffee.com" } as const;

export function Sidebar(props: {
  open: boolean;
  onClose: () => void;
  onCollapse: () => void;
}) {
  const { mode, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [promoDismissed, setPromoDismissed] = useState(
    () => localStorage.getItem("f1-chat-promo-dismissed") === "1",
  );
  const dismissPromo = () => {
    localStorage.setItem("f1-chat-promo-dismissed", "1");
    setPromoDismissed(true);
  };

  const handleSelect = (path: string) => {
    if (path === "external/coffee") {
      window.open(EXTERNAL.coffee, "_blank", "noreferrer");
      return;
    }
    navigate(path);
    props.onClose();
  };

  const nav = (
    <nav className="flex h-full flex-col bg-rail px-3 pb-4 pt-4" aria-label="Primary">
      {/* header: brand + collapse / theme controls */}
      <div className="flex h-12 flex-none items-center gap-2 rounded-xl border border-stroke bg-ink/[0.04] px-3">
        <p className="text-[14px] font-semibold tracking-tight text-ink">F1 Terminal</p>
        <span className="ml-auto" />
        <button
          onClick={toggle}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={mode === "dark" ? "Light mode" : "Dark mode"}
          className="rounded-md p-1.5 text-mut transition-colors hover:bg-ink/[0.06] hover:text-ink"
        >
          {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button
          onClick={props.onClose}
          aria-label="Close menu"
          className="rounded-md p-1 text-mut hover:text-ink lg:hidden"
        >
          <X size={14} />
        </button>
      </div>

      {/* search stub */}
      <button
        type="button"
        title="Search — coming soon"
        className="mt-5 flex h-9 flex-none cursor-default items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-sub transition-colors hover:bg-ink/[0.04] hover:text-ink"
      >
        <Search size={15} strokeWidth={1.7} className="flex-none" />
        Search
        <kbd className="ml-auto grid h-6 w-6 place-items-center rounded-md border border-stroke font-mono text-[11px] text-mut">
          /
        </kbd>
      </button>

      {/* file-tree navigation */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <FileTree
          defaultExpanded={new Set(["terminal", "docs"])}
          selectedPath={location.pathname}
          onSelect={handleSelect}
        >
          <FileTreeFolder name="terminal" path="terminal">
            <FileTreeFile name="Dashboard" path="/" icon={LayoutDashboard} />
            <FileTreeFile name="News" path="/news" icon={Newspaper} />
            <FileTreeFile name="Calendar" path="/calendar" icon={CalendarDays} />
            <FileTreeFile name="Track Walk" path="/track-walk" icon={Footprints} />
            <FileTreeFile name="Team Profiles" path="/teams" icon={Users} />
            <FileTreeFile name="Chat" path="/chat" icon={MessageSquare} />
            <FileTreeFile name="Archived" path="/archived" icon={Archive} />
            <FileTreeFile
              name="Live Dashboard"
              path="/live"
              icon={Radio}
              badge={
                <span className="rounded border border-stroke px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-mut">
                  soon
                </span>
              }
            />
          </FileTreeFolder>
          <FileTreeFolder name="docs" path="docs">
            <FileTreeFile name="Backend APIs" path="/docs/apis" icon={TerminalSquare} />
            <FileTreeFile name="Architecture" path="/docs/architecture" icon={Boxes} />
          </FileTreeFolder>
          <FileTreeFolder name="support" path="support">
            <FileTreeFile name="Help Center" path="/help" icon={LifeBuoy} />
            <FileTreeFile name="Buy me Coffee" path="external/coffee" icon={Coffee} />
            <FileTreeFile name="Creator" path="/creator" icon={UserRound} />
          </FileTreeFolder>
        </FileTree>
      </div>

      {/* bottom promo card */}
      {!promoDismissed && (
        <div className="relative mt-4 flex-none rounded-xl border border-stroke bg-ink/[0.04] p-4">
          <button
            onClick={dismissPromo}
            aria-label="Dismiss"
            className="absolute right-2.5 top-2.5 rounded-md p-1 text-mut transition-colors hover:text-ink"
          >
            <X size={13} />
          </button>
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-stroke bg-surface text-ink">
            <Sparkles size={15} strokeWidth={1.7} />
          </span>
          <p className="mt-3 text-[13.5px] font-semibold text-ink">Chat preview</p>
          <p className="mt-1 text-xs leading-relaxed text-sub">
            Ask the historical database questions in plain English.
          </p>
          <NavLink
            to="/chat"
            onClick={props.onClose}
            className="mt-3 block rounded-lg border border-stroke bg-surface py-2 text-center text-[12.5px] font-medium text-ink transition-colors hover:border-stroke-strong"
          >
            Open Chat
          </NavLink>
        </div>
      )}

      {/* collapse control — pinned bottom-right of the rail */}
      <div className="mt-3 hidden flex-none justify-end lg:flex">
        <button
          onClick={props.onCollapse}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="rounded-lg border border-stroke p-2 text-mut transition-colors hover:bg-ink/[0.06] hover:text-ink"
        >
          <PanelLeftClose size={15} strokeWidth={1.7} />
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* mobile drawer (desktop rail is rendered by AppShell) */}
      <div className="hidden h-full lg:block">{nav}</div>
      {props.open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
          <aside className="absolute inset-y-0 left-0 w-[264px] border-r border-stroke-strong bg-rail shadow-2xl">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}

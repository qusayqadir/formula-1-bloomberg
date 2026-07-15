import { NavLink } from "react-router-dom";
import {
  Archive,
  BookOpen,
  CalendarDays,
  Coffee,
  Footprints,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Newspaper,
  Radio,
  UserRound,
  Users,
  X,
} from "lucide-react";

const MAIN = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/track-walk", label: "Track Walk", icon: Footprints },
  { to: "/teams", label: "Team Profiles", icon: Users },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/archived", label: "Archived", icon: Archive },
  { to: "/live", label: "Live Dashboard", icon: Radio },
];

const BOTTOM = [
  { href: "http://localhost:8000/docs", label: "Documentation", icon: BookOpen },
  { href: "/help", label: "Help Center", icon: LifeBuoy, internal: true },
  { href: "https://buymeacoffee.com", label: "Buy me Coffee", icon: Coffee },
  { href: "https://github.com/qusayqadir", label: "Creator", icon: UserRound },
];

function itemClass(isActive: boolean) {
  return `group relative flex h-8 items-center gap-2.5 rounded-md border px-2.5 text-xs transition-colors ${
    isActive
      ? "border-stroke bg-white/[0.05] font-medium text-ink"
      : "border-transparent text-sub hover:bg-white/[0.03] hover:text-ink"
  }`;
}

export function Sidebar(props: { open: boolean; onClose: () => void }) {
  const nav = (
    <nav className="flex h-full flex-col bg-rail" aria-label="Primary">
      <div className="flex h-13 flex-none items-center border-b border-stroke px-4 py-3.5">
        <div className="leading-tight">
          <p className="text-[14px] font-semibold tracking-tight text-ink">F1 Terminal</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-mut">
            Historical · v0.1
          </p>
        </div>
        <button
          onClick={props.onClose}
          aria-label="Close menu"
          className="ml-auto rounded-md p-1 text-mut hover:text-ink lg:hidden"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <p className="eyebrow px-2 pb-2">Main menu</p>
        <ul className="space-y-0.5">
          {MAIN.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} onClick={props.onClose} className={({ isActive }) => itemClass(isActive)}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute -left-2.5 h-4 w-0.5 rounded-r bg-accent"
                      />
                    )}
                    <item.icon size={14} strokeWidth={1.8} className="flex-none" />
                    {item.label}
                    {item.to === "/live" && (
                      <span className="ml-auto rounded border border-stroke px-1 font-mono text-[8px] uppercase tracking-wider text-mut">
                        soon
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-none border-t border-stroke px-2.5 py-3">
        <p className="eyebrow px-2 pb-2">Support</p>
        <ul className="space-y-0.5">
          {BOTTOM.map((item) => (
            <li key={item.label}>
              {item.internal ? (
                <NavLink to={item.href} onClick={props.onClose} className={({ isActive }) => itemClass(isActive)}>
                  <item.icon size={14} strokeWidth={1.8} className="flex-none" />
                  {item.label}
                </NavLink>
              ) : (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={itemClass(false)}
                >
                  <item.icon size={14} strokeWidth={1.8} className="flex-none" />
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );

  return (
    <>
      {/* desktop rail */}
      <aside className="hidden w-[220px] flex-none border-r border-stroke lg:block">{nav}</aside>
      {/* mobile drawer */}
      {props.open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
          <aside className="absolute inset-y-0 left-0 w-[240px] border-r border-stroke-strong shadow-2xl">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}

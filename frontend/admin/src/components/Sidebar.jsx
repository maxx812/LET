import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FileQuestion, ClipboardList, Radio, Trophy,
  Users, Swords, BarChart3, Settings, Zap, LogOut, ChevronRight,
  Sparkles, FolderOpen
} from "lucide-react";
import { cn } from "../lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/categories", label: "Categories", icon: FolderOpen },
      { to: "/questions", label: "Questions", icon: FileQuestion },
      { to: "/exams", label: "Exams", icon: ClipboardList },
    ],
  },
  {
    label: "Live Ops",
    items: [
      { to: "/live-monitor", label: "Live Monitor", icon: Radio, badge: "LIVE" },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { to: "/tournament", label: "Tournament", icon: Swords },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/users", label: "Users", icon: Users },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase()
    : "AD";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-72 max-w-[85vw] bg-sidebar/95 backdrop-blur-2xl border-r border-sidebar-border text-sidebar-foreground overflow-y-auto flex flex-col z-40 transition-transform duration-300 ease-out lg:sticky lg:w-[17rem] lg:max-w-none lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/40">
        <div className="w-10 h-10 rounded-2xl bg-gradient-accent flex items-center justify-center text-accent-foreground shadow-glow transition-all hover:scale-105 hover:shadow-pop relative">
          <Zap size={20} strokeWidth={2.5} />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-sidebar animate-pulse" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[1.1rem] font-extrabold tracking-tight">ExamStrike</span>
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-sidebar-foreground/50 font-semibold">Admin Console</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-3 px-3 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <div className="px-3.5 pt-4 pb-1.5 text-[0.6rem] uppercase tracking-[0.2em] font-bold text-sidebar-foreground/35 select-none">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[0.8125rem] font-medium transition-all w-full text-left group",
                        isActive
                          ? "bg-primary/12 text-primary font-semibold shadow-[inset_0_0_0_1px_oklch(0.32_0.16_268_/_0.12)]"
                          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all", isActive ? "bg-primary text-primary-foreground shadow-soft" : "bg-transparent text-sidebar-foreground/40 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground/70")}>
                          <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[0.5625rem] font-black uppercase tracking-wider rounded-md bg-destructive/15 text-destructive animate-pulse">
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <>
                            <ChevronRight size={14} className="text-primary/60" />
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pro Badge */}
      <div className="mx-3 mb-3">
        <div className="rounded-2xl bg-gradient-primary p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-accent/25 blur-[30px] rounded-full pointer-events-none -mr-6 -mt-6" />
          <div className="relative flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-[0.6875rem] font-bold text-primary-foreground/90 uppercase tracking-wider">Pro Features</span>
          </div>
          <p className="text-[0.6875rem] text-primary-foreground/60 leading-relaxed">
            Webcam proctoring, AI anti-cheat, & advanced analytics.
          </p>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-sidebar-border/40 bg-sidebar-accent/30">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent text-accent-foreground text-xs font-extrabold flex items-center justify-center shadow-soft ring-2 ring-accent/20">
              {initials}
            </div>
            <div className="flex flex-col">
              <div className="text-[0.8125rem] font-bold tracking-tight">{user?.name || "Admin"}</div>
              <div className="text-[0.625rem] text-sidebar-foreground/50 font-semibold capitalize flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {user?.role || "admin"}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all hover:scale-105"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

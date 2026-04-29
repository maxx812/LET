import { Bell, Wifi, WifiOff, Activity, Menu, Search, Moon, Sun, Command } from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";

export default function Topbar({ socketState, systemHealth, onMenuClick }) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-2xl border-b border-border/60 px-4 sm:px-6 h-[4.25rem] flex items-center justify-between gap-3 sm:gap-4">
      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="lg:hidden p-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 shadow-soft"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu size={16} />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="font-display font-bold text-[0.9375rem] sm:text-base text-foreground tracking-tight truncate">
            Maharashtra Police Bharti
          </div>
          <div className="text-[0.625rem] text-muted-foreground font-semibold uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live Exam Control Centre
          </div>
        </div>
      </div>

      {/* Center - Search */}
      <div className={cn(
        "hidden md:flex items-center bg-secondary/60 border border-border/50 rounded-xl px-3 py-2 transition-all duration-300 max-w-[280px] flex-1 mx-4",
        searchFocused && "border-accent/50 ring-4 ring-accent/10 bg-card shadow-soft"
      )}>
        <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Search anything..."
          className="bg-transparent border-none outline-none text-sm w-full text-foreground font-medium placeholder:text-muted-foreground/60"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-[0.5625rem] font-bold text-muted-foreground border border-border/50 ml-2 shrink-0">
          <Command size={9} />K
        </kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Notification Bell */}
        <button className="relative p-2.5 rounded-xl border border-border/50 bg-card text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 shadow-soft group">
          <Bell size={16} className="group-hover:animate-[wiggle_0.3s_ease-in-out]" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[0.5625rem] font-extrabold flex items-center justify-center px-1 shadow-[0_2px_8px_rgba(0,0,0,0.2)] ring-2 ring-background">
            3
          </span>
        </button>

        <div className="h-7 w-px bg-border/60 hidden md:block mx-0.5" />

        {/* Socket Status */}
        <span className={cn(
          "hidden sm:inline-flex items-center gap-1.5 text-[0.6875rem] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap border transition-all",
          socketState === "connected"
            ? "bg-success/10 text-success border-success/20"
            : "bg-warning/10 text-warning-foreground border-warning/20"
        )}>
          {socketState === "connected" ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className={cn("w-1.5 h-1.5 rounded-full", socketState === "connected" ? "bg-success animate-pulse" : "bg-warning animate-pulse")} />
          {socketState === "connected" ? "Connected" : "Offline"}
        </span>

        {/* System Health */}
        <span className={cn(
          "hidden md:inline-flex items-center gap-1.5 text-[0.6875rem] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap border transition-all",
          systemHealth === "Healthy"
            ? "bg-primary/8 text-primary border-primary/15"
            : "bg-destructive/10 text-destructive border-destructive/15"
        )}>
          <Activity size={12} />
          {systemHealth === "Healthy" ? "System OK" : systemHealth}
        </span>
      </div>
    </header>
  );
}

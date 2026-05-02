import { Link, useLocation } from "@tanstack/react-router";
import { Home, Trophy, User, Swords, Menu, X, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/AuthModal";
import { useOnlineUserCount, useLiveExamCount } from "@/hooks/useLiveData";
import { refreshSocketSession } from "@/services/socket";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  completeGoogleRedirectLogin,
  getStoredUser,
  logoutUser,
  subscribeAuthPersistence,
  type SessionUser,
} from "@/lib/authService";

const translations = {
  en: {
    home: "Home",
    lobby: "Lobby",
    leaderboard: "Leaderboard",
    profile: "Profile",
    compete: "Compete",
    ranks: "Ranks",
    me: "Me",
    online: "Online",
    signIn: "Sign In",
    logout: "Logout",
    joinLive: "Join Live Exam",
    signInAccount: "Sign In to Account",
    guest: "Guest",
  },
  mr: {
    home: "होम",
    lobby: "लॉबी",
    leaderboard: "रँकिंग",
    profile: "प्रोफाइल",
    compete: "स्पर्धा",
    ranks: "रँक",
    me: "माहिती",
    online: "ऑनलाईन",
    signIn: "लॉगिन",
    logout: "लॉगआउट",
    joinLive: "लाईव्ह परीक्षा",
    signInAccount: "लॉगिन करा",
    guest: "अतिथी",
  },
};

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onlineCount = useOnlineUserCount(0);
  const liveCount = useLiveExamCount();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<"en" | "mr">(() => {
    return (localStorage.getItem("examstrike_lang") as "en" | "mr") || "en";
  });
  const t = translations[lang];

  const navItems = [
    { to: "/", label: t.home, icon: Home },
    { to: "/lobby", label: t.lobby, icon: Swords },
    { to: "/leaderboard", label: t.leaderboard, icon: Trophy },
    { to: "/profile", label: t.profile, icon: User },
  ] as const;

  useEffect(() => {
    let isActive = true;
    setMounted(true);
    setUser(getStoredUser());

    void completeGoogleRedirectLogin()
      .then((nextUser) => {
        if (!isActive || !nextUser) return;
        setUser(nextUser);
        refreshSocketSession();
      })
      .catch(() => {
        // Redirect result is optional; keep existing session state when absent.
      });

    const handleAuthChanged = () => setUser(getStoredUser());
    const handleStorage = () => {
      setUser(getStoredUser());
      const nextLang = (localStorage.getItem("examstrike_lang") as "en" | "mr") || "en";
      setLang(nextLang);
    };
    const handleLangChanged = () => {
      const nextLang = (localStorage.getItem("examstrike_lang") as "en" | "mr") || "en";
      setLang(nextLang);
    };
    const unsubscribe = subscribeAuthPersistence((nextUser) => setUser(nextUser));

    window.addEventListener("storage", handleStorage);
    window.addEventListener("auth:changed", handleAuthChanged);
    window.addEventListener("lang:changed", handleLangChanged);
    return () => {
      isActive = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("auth:changed", handleAuthChanged);
      window.removeEventListener("lang:changed", handleLangChanged);
      unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await logoutUser();
    refreshSocketSession();
    setUser(null);
  }

  // Hide navbar on focus-mode routes
  if (pathname.startsWith("/exam")) return null;

  return (
    <>
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(userData) => {
            setUser(userData);
            setIsAuthOpen(false);
            refreshSocketSession();
          }}
        />
      )}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border overflow-hidden shadow-pop group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="ExamStrike Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-display text-lg font-bold tracking-tight">ExamStrike</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground -mt-0.5">
                Live · Compete · Win
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <AnimatedNumber value={onlineCount} /> {t.online}
            </span>

            {mounted ? (
              user ? (
                <div className="flex items-center gap-4 border-l border-border pl-4">
                  <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </Link>
                  <button onClick={handleLogout} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors" title="Log Out">
                    {t.logout}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 border-l border-border pl-4">
                  <button onClick={() => setIsAuthOpen(true)} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                    {t.signIn}
                  </button>
                  <Link
                    to="/lobby"
                    className="hidden lg:inline-flex items-center gap-2 rounded-xl bg-gradient-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-soft hover:shadow-glow transition-all hover:-translate-y-px"
                  >
                    <Swords className="h-4 w-4" /> {t.guest}
                  </Link>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3 border-l border-border pl-4 w-28" />
            )}
          </div>

          <button
            aria-label="Toggle menu"
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-secondary relative"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {!open && liveCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-white ring-2 ring-background animate-pulse">
                {liveCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile sheet */}
        {open && (
          <div className="md:hidden border-t border-border/60 bg-background animate-slide-up">
            <div className="px-4 py-3 grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium",
                      active ? "bg-secondary text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" /> {item.label}
                    </div>
                    {item.to === "/lobby" && liveCount > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-black text-destructive">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive"></span>
                        </span>
                        {liveCount} {t.liveNow}
                      </span>
                    )}
                  </Link>
                );
              })}
              <Link
                to="/lobby"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-accent py-2.5 text-sm font-semibold text-accent-foreground"
              >
                <Swords className="h-4 w-4" /> Join Live Exam
              </Link>

              <div className="mt-4 pt-4 border-t border-border/60">
                {mounted ? (
                  user ? (
                    <div className="grid gap-2">
                      <div className="flex items-center gap-3 px-3 py-2">
                        <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-base">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { handleLogout(); setOpen(false); }}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                      >
                        Log Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setIsAuthOpen(true); setOpen(false); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Sign In to Account
                    </button>
                  )
                ) : (
                  <div className="h-12 w-full animate-pulse rounded-xl bg-secondary/50" />
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const liveCount = useLiveExamCount();
  const [lang, setLang] = useState<"en" | "mr">(() => {
    return (localStorage.getItem("examstrike_lang") as "en" | "mr") || "en";
  });
  const t = translations[lang];

  useEffect(() => {
    const handleLang = () => {
      setLang((localStorage.getItem("examstrike_lang") as "en" | "mr") || "en");
    };
    window.addEventListener("lang:changed", handleLang);
    window.addEventListener("storage", handleLang);
    return () => {
      window.removeEventListener("lang:changed", handleLang);
      window.removeEventListener("storage", handleLang);
    };
  }, []);

  if (pathname.startsWith("/exam")) return null;

  const items = [
    { to: "/", label: t.home, icon: Home },
    { to: "/lobby", label: t.compete, icon: Swords },
    { to: "/leaderboard", label: t.ranks, icon: Trophy },
    { to: "/profile", label: t.me, icon: User },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          const isLobby = it.to === "/lobby";
          return (
            <li key={it.to} className="relative">
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-all",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                  {isLobby && liveCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                    </span>
                  )}
                </div>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

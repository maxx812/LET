// @ts-nocheck
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMyProfile, getApiError } from "@/services/api";
import { getStoredUser } from "@/lib/authService";
import { AuthModal } from "@/components/AuthModal";
import { Flame, Award, Star, Zap, TrendingUp, Calendar, Target, Crown, Lock, Phone, MapPin, GraduationCap, Mail, User as UserIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ExamStrike" },
      { name: "description", content: "Your stats, streak, badges, and exam history." },
      { property: "og:title", content: "Profile — ExamStrike" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [error, setError] = useState("");

  // Default empty states for charts if no real data yet
  const RANK_TREND = profileData?.rankTrend || [];
  const ACC_TREND = profileData?.accTrend || [];
  const HISTORY = profileData?.history || [];

  useEffect(() => {
    async function load() {
      const storedUser = getStoredUser();
      if (!storedUser) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      try {
        setAuthRequired(false);
        setError("");
        setProfileData({ user: storedUser, history: [], rankTrend: [], accTrend: [] });
        const data = await fetchMyProfile();
        const nextData =
          data && typeof data === "object"
            ? (data as Record<string, any>)
            : {};
        setProfileData({ ...nextData, user: nextData.user || nextData });
      } catch (err) {
        const apiError = getApiError(err, "Unable to load your profile right now.");
        if (apiError.status === 401) {
          setAuthRequired(true);
          setProfileData(null);
        } else {
          setError(apiError.message);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authRequired]);

  if (loading && !profileData) return <div className="p-12 text-center">Loading Profile...</div>;
  const user = profileData?.user || profileData?.profile;
  const displayName = user?.name || "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("") || "U";
  const xp = Number(user?.xp || 0);

  if (authRequired) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        {isAuthOpen && (
          <AuthModal
            onClose={() => setIsAuthOpen(false)}
            onSuccess={() => {
              setIsAuthOpen(false);
              setAuthRequired(false);
              setLoading(true);
              // The useEffect will trigger reload because authRequired changed or we can just call load() if we refactor
              window.location.reload(); // Simple way to ensure fresh state
            }}
          />
        )}
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
          <h1 className="text-display text-3xl font-extrabold">Sign in to view your profile</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your stats, streaks, and exam history appear here after Google sign-in.
          </p>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="mt-6 w-full sm:w-auto h-[56px] px-8 rounded-xl bg-primary text-primary-foreground font-black text-sm md:text-lg hover:bg-primary/90 transition-all shadow-pop active:scale-95 flex items-center justify-center gap-3 shrink-0 mx-auto"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (!user) return <div className="p-12 text-center text-destructive">{error || "User not found or logged out."}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
      {error && (
        <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {error}
        </div>
      )}
      {/* Header card / Aspirant ID */}
      <div className="relative overflow-hidden rounded-[2rem] border-2 border-border bg-card p-6 md:p-10 shadow-pop">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex flex-col items-center md:flex-row md:items-center gap-6 md:gap-10 text-center md:text-left">
          {/* Avatar Section */}
          <div className="relative shrink-0">
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-[2rem] md:rounded-[2.5rem] bg-gradient-primary text-primary-foreground flex items-center justify-center text-display text-4xl md:text-5xl font-black shadow-pop-lg uppercase ring-4 md:ring-8 ring-background">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 h-9 w-9 md:h-11 md:w-11 rounded-xl md:rounded-2xl bg-accent text-accent-foreground flex items-center justify-center text-sm md:text-base font-black shadow-soft ring-4 ring-card">
              {Math.floor(xp / 1000) || 1}
            </div>
          </div>

          {/* Identity Section */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                <h1 className="text-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">{displayName}</h1>
                {user.role === "admin" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[9px] font-black px-2.5 py-1 uppercase tracking-widest border border-primary/20">
                    <Crown className="h-2.5 w-2.5" /> Admin
                  </span>
                )}
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-x-5 gap-y-1 mt-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[10px] sm:text-xs truncate max-w-full px-2">
                  <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  {user.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[10px] sm:text-xs">
                      <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                      +91 {user.phone}
                    </div>
                  )}
                  {user.district && (
                    <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[10px] sm:text-xs">
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                      {user.district}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* XP bar */}
            <div className="mt-6 md:mt-8 max-w-lg mx-auto md:mx-0">
              <div className="flex items-center justify-between text-[10px] mb-2 font-black uppercase tracking-widest text-foreground/70">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-accent animate-pulse" />
                  <span>Exp Progress</span>
                </div>
                <span className="tabular text-primary bg-primary/5 px-2 py-0.5 rounded-md">{xp % 1000} / 1000</span>
              </div>
              <div className="h-3.5 rounded-full bg-secondary/50 overflow-hidden p-0.5 border border-border/50">
                <div className="h-full bg-gradient-primary rounded-full transition-all duration-1000" style={{ width: `${(xp % 1000) / 10}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto justify-center">
            <Stat icon={Flame} value={user.streak || "0"} label="Streak" tone="destructive" />
            <Stat icon={Target} value={user.accuracy ? `${user.accuracy}%` : "0%"} label="Accuracy" tone="success" />
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <DetailCard icon={GraduationCap} label="Target Examination" value={user.targetExamType?.name || "Selection Pending"} />
          <DetailCard icon={TrendingUp} label="Education Level" value={user.education || "Details Pending"} />
          <DetailCard icon={UserIcon} label="Category" value={user.category || "Open"} />
          <DetailCard
            icon={Star}
            label="Aspirant Status"
            value={xp > 5000 ? "Elite Aspirant" : xp > 1000 ? "Pro Candidate" : "Verified Candidate"}
          />
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 flex flex-col justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <Award className="h-12 w-12 text-accent mx-auto mb-3 transition-transform group-hover:scale-110" />
          <div className="text-display text-2xl font-black">Professional Profile</div>
          <p className="text-xs text-muted-foreground mt-2 px-4">Your details are synchronized across all live proctoring sessions.</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <ChartCard title="Rank trend" subtitle="Lower is better · last 7 days">
          <ResponsiveContainer>
            <AreaChart data={RANK_TREND} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="rankGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis reversed tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              {/* @ts-expect-error - Recharts Tooltip typing mismatch */}
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Area dataKey="rank" stroke="var(--primary)" strokeWidth={2.5} fill="url(#rankGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Accuracy trend" subtitle="% correct · last 7 days">
          <ResponsiveContainer>
            <LineChart data={ACC_TREND} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              {/* @ts-expect-error - Recharts Tooltip typing mismatch */}
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Line dataKey="acc" stroke="var(--accent)" strokeWidth={3} dot={{ fill: "var(--accent)", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Badges */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-display text-lg font-bold">Badges & Achievements</h3>
            <p className="text-xs text-muted-foreground">4 of 6 unlocked. Two more streaks to next.</p>
          </div>
          <TrendingUp className="h-5 w-5 text-success" />
        </div>
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
          {[
            { name: "First Win", icon: Star, earned: !!user.wins },
            { name: "10-day Streak", icon: Flame, earned: user.streak >= 10 },
            { name: "Top 100", icon: Crown, earned: false },
            { name: "Speed Demon", icon: Zap, earned: false },
            { name: "Perfectionist", icon: Target, earned: false },
            { name: "Iron Aspirant", icon: Award, earned: false },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.name}
                className={cn(
                  "relative rounded-xl md:rounded-2xl border p-2 sm:p-4 text-center transition-all",
                  b.earned
                    ? "border-accent/40 bg-gradient-to-b from-accent/15 to-card shadow-soft"
                    : "border-dashed border-border bg-secondary/40 opacity-70",
                )}
              >
                <div
                  className={cn(
                    "mx-auto h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-2xl flex items-center justify-center",
                    b.earned ? "bg-gradient-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {b.earned ? <Icon className="h-4 w-4 sm:h-6 sm:w-6" /> : <Lock className="h-3.5 w-3.5 sm:h-5 sm:w-5" />}
                </div>
                <div className="mt-1.5 sm:mt-2 text-[8px] sm:text-xs font-bold leading-tight truncate">{b.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="mt-6 rounded-3xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-display text-lg font-bold">Exam history</h3>
          </div>
          <button className="text-xs font-semibold text-primary hover:underline">Export CSV</button>
        </div>
        <ul>
          {HISTORY.map((h: any, i: number) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0 hover:bg-secondary/40 transition-colors">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary font-bold">
                {h.name.split(" ").slice(0, 2).map((s: string) => s[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{h.name}</div>
                <div className="text-xs text-muted-foreground">{h.date}</div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted-foreground">Rank</div>
                <div className="font-bold tabular">#{h.rank}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="text-display text-lg font-bold tabular">{h.score}</div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
                  h.status === "Qualified" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                )}
              >
                {h.status}
              </span>
            </li>
          ))}
          {HISTORY.length === 0 && <li className="p-6 text-center text-muted-foreground">No recent exam history found.</li>}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, value, label, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  tone: "accent" | "destructive" | "success";
}) {
  const map = {
    accent: "bg-accent/15 text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-3 min-w-[88px]">
      <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", map[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1.5 text-display text-xl font-extrabold tabular">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <div>
        <h3 className="text-display text-lg font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-3 h-56">{children}</div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4 shadow-soft hover:border-primary/40 transition-colors">
      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">{label}</div>
        <div className="font-bold truncate text-foreground">{value}</div>
      </div>
    </div>
  );
}

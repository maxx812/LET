import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMyProfile, getApiError } from "@/services/api";
import { getStoredUser } from "@/lib/authService";
import { Flame, Award, Star, Zap, TrendingUp, Calendar, Target, Crown, Lock } from "lucide-react";
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
  }, []);

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
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
          <h1 className="text-display text-3xl font-extrabold">Sign in to view your profile</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your stats, streaks, and exam history appear here after Google sign-in.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Home
          </Link>
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
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-3xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-display text-4xl font-extrabold shadow-pop uppercase">
              {initials}
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-full bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 shadow-soft">
              LVL {Math.floor(xp / 1000) || 1}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-display text-3xl font-extrabold">{displayName}</h1>
              {user.role === "admin" && <span className="text-xs rounded-full bg-success/10 text-success font-bold px-2 py-0.5">ADMIN</span>}
            </div>
            <p className="text-sm text-muted-foreground">{user.email} · Registered</p>

            {/* XP bar */}
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold">Level {Math.floor(xp / 1000) || 1}</span>
                <span className="tabular text-muted-foreground">{xp % 1000} / 1000 XP</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-accent rounded-full" style={{ width: `${(xp % 1000) / 10}%` }} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Stat icon={Flame} value={user.streak || "0"} label="Day streak" tone="destructive" />
            <Stat icon={Award} value={user.wins || "0"} label="Wins" tone="accent" />
            <Stat icon={Target} value={user.accuracy ? `${user.accuracy}%` : "0%"} label="Accuracy" tone="success" />
          </div>
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
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-3">
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
                  "relative rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5",
                  b.earned
                    ? "border-accent/40 bg-gradient-to-b from-accent/15 to-card shadow-soft"
                    : "border-dashed border-border bg-secondary/40 opacity-70",
                )}
              >
                <div
                  className={cn(
                    "mx-auto h-12 w-12 rounded-2xl flex items-center justify-center",
                    b.earned ? "bg-gradient-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {b.earned ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="mt-2 text-xs font-bold leading-tight">{b.name}</div>
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

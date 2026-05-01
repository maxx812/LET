import { useEffect, useState } from "react";
import { fetchAnalytics } from "../services/apiClient";
import { BarChart3, Users, TrendingUp, Target, RefreshCw, ArrowUpRight, Calendar, Download, Sparkles } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { cn } from "../lib/utils";

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await fetchAnalytics();
      setData(result);
    } catch {
      // stay null
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, []);

  const growthData = data?.growthData || [];
  const participationData = data?.participationData || [];
  const avgScoreData = data?.avgScoreData || [];
  const difficultyData = data?.difficultyData || [];

  const quickStats = [
    { label: "Total Users", value: data?.totalUsers || "—", icon: Users, color: "success", trend: "+12%" },
    { label: "Exams Taken", value: data?.totalExams || "—", icon: TrendingUp, color: "accent", trend: "+8%" },
    { label: "Avg. Score", value: data?.avgScore ? `${data.avgScore}%` : "—", icon: Target, color: "info", trend: "+3%" },
    { label: "Pass Rate", value: data?.passRate ? `${data.passRate}%` : "—", icon: Sparkles, color: "primary", trend: "+5%" },
  ];

  const colorMap = {
    success: "bg-success/10 text-success",
    accent: "bg-accent/12 text-accent-foreground",
    info: "bg-info/10 text-info",
    primary: "bg-primary/10 text-primary",
  };

  const chartsConfig = [
    {
      title: "User Growth", icon: Users, tone: "success",
      description: "New registrations over time",
      chart: (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={growthData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 12, boxShadow: "var(--shadow-pop)" }} />
            <Area dataKey="users" stroke="var(--success)" strokeWidth={2.5} fill="url(#ugGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Exam Participation", icon: TrendingUp, tone: "accent",
      description: "Daily exam attempts",
      chart: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={participationData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 12, boxShadow: "var(--shadow-pop)" }} />
            <Bar dataKey="exams" fill="var(--accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Category Performance", icon: Target, tone: "primary",
      description: "Average scores by subject",
      chart: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={avgScoreData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="topic" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 12, boxShadow: "var(--shadow-pop)" }} />
            <Bar dataKey="avg" fill="var(--primary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Difficulty Analysis", icon: BarChart3, tone: "destructive",
      description: "Correct answers by difficulty",
      chart: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={difficultyData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="level" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, fontSize: 12, boxShadow: "var(--shadow-pop)" }} />
            <Bar dataKey="correct" fill="var(--chart-4)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Platform-wide trends and performance insights</p>
        </div>
        <div className="admin-action-row">
          <div className="hidden sm:inline-flex items-center rounded-xl border border-border bg-card overflow-hidden">
            {["7d", "30d", "90d"].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-3.5 py-2 text-[0.6875rem] font-bold uppercase tracking-wider transition-all",
                  timeRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto">
            <Download size={14} /> Export
          </button>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickStats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="admin-card p-4 flex items-center gap-3 hover:shadow-soft transition-all">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", colorMap[s.color])}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="font-display text-xl font-extrabold tabular-nums">{s.value}</div>
                  {s.trend && <span className="text-[0.5625rem] font-bold text-success flex items-center"><ArrowUpRight size={9} />{s.trend}</span>}
                </div>
                <div className="text-[0.625rem] uppercase tracking-widest font-bold text-muted-foreground truncate">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartsConfig.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="admin-card flex flex-col overflow-hidden">
              <div className="p-5 border-b border-border/40 flex items-center justify-between bg-secondary/20">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
                      c.tone === "accent" ? "bg-accent/12 text-accent-foreground" :
                        c.tone === "success" ? "bg-success/10 text-success" :
                          c.tone === "destructive" ? "bg-destructive/10 text-destructive" :
                            "bg-primary/10 text-primary"
                    )}>
                      <Icon size={16} />
                    </div>
                    <span className="font-display text-base font-bold">{c.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-[2.625rem]">{c.description}</p>
                </div>
              </div>
              <div className="p-4 sm:p-5 h-[300px] sm:h-[320px]">
                {c.chart}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

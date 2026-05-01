import {
  Monitor, Users, ClipboardList, Crown, Zap, Server,
  TrendingUp, Clock, Activity, RefreshCw, FileQuestion,
  BarChart3, Flame, ArrowUpRight, ArrowDownRight, Sparkles,
  Shield, Globe, DatabaseZap,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export default function DashboardPage({ data, onRefresh }) {
  const healthItems = [
    { label: "API Server", value: data.systemHealth === "Healthy" ? "Online" : "Offline", ok: data.systemHealth === "Healthy", icon: Zap },
    { label: "Socket Engine", value: "Active", ok: true, icon: Activity },
    { label: "Encryption", value: "AES-256", ok: true, icon: Shield },
    { label: "CDN Edge", value: "Mumbai", ok: true, icon: Globe },
    { label: "Database", value: "Connected", ok: true, icon: DatabaseZap },
    { label: "Environment", value: "Production", ok: true, icon: Server },
  ];

  const metrics = [
    { key: "liveExams", label: "Live Sessions", icon: Monitor, color: "destructive", value: data.liveExams ?? data.activeExams, sub: "In progress" },
    { key: "usersOnline", label: "Active Candidates", icon: Users, color: "success", value: data.usersOnline, sub: "Connected" },
    { key: "totalQuestions", label: "Question Bank", icon: FileQuestion, color: "info", value: data.totalQuestions ?? "—", sub: "Verified items" },
    { key: "totalExams", label: "Total Papers", icon: ClipboardList, color: "accent", value: data.totalExams ?? data.examsToday, sub: "Published" },
    { key: "totalUsers", label: "Enrollments", icon: Users, color: "primary", value: data.totalUsers ?? "—", sub: "Total users" },
  ];

  const colorMap = {
    destructive: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", icon: "bg-destructive text-destructive-foreground" },
    success: { bg: "bg-success/10", text: "text-success", border: "border-success/20", icon: "bg-success text-success-foreground" },
    info: { bg: "bg-info/10", text: "text-info", border: "border-info/20", icon: "bg-info text-info-foreground" },
    accent: { bg: "bg-accent/12", text: "text-accent-foreground", border: "border-accent/20", icon: "bg-gradient-accent text-accent-foreground" },
    primary: { bg: "bg-primary/8", text: "text-primary", border: "border-primary/20", icon: "bg-primary text-primary-foreground" },
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="admin-page-title">Dashboard</h1>
            <span className="admin-chip bg-success/15 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
            </span>
          </div>
          <p className="admin-page-subtitle">Real-time overview of your exam platform</p>
        </div>
        <div className="admin-action-row">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            onClick={onRefresh}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Hero Stats Banner */}
      <div className="bg-gradient-primary text-primary-foreground rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-pop">
        {/* Decorative elements */}
        <div className="absolute w-[18rem] h-[18rem] rounded-full bg-accent/25 blur-[60px] -top-16 -right-16 pointer-events-none animate-float" />
        <div className="absolute w-[10rem] h-[10rem] rounded-full bg-info/15 blur-[40px] bottom-0 left-1/4 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-accent/25 flex items-center justify-center">
                <Monitor size={16} className="text-accent" />
              </div>
              <span className="text-[0.6875rem] uppercase tracking-[0.18em] font-bold opacity-80">
                Examination Throughput
              </span>
            </div>
            <div className="font-display text-5xl md:text-6xl font-black tracking-tighter tabular-nums animate-count-up">
              {data.liveExams ?? data.activeExams ?? 0}
            </div>
            <div className="text-sm font-medium opacity-70 mt-2 flex items-center gap-2">
              Live exams running right now
              <span className="inline-flex items-center gap-1 text-accent text-xs font-bold bg-accent/20 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={10} /> Active
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:gap-12 pl-0 md:pl-12 border-t md:border-t-0 md:border-l border-primary-foreground/15 pt-6 md:pt-0">
            <div>
              <div className="text-[0.625rem] uppercase tracking-[0.2em] font-bold opacity-50 mb-1.5">Questions</div>
              <div className="font-display tabular-nums text-3xl md:text-4xl font-black animate-count-up">
                {data.totalQuestions ?? "—"}
              </div>
              <div className="text-xs opacity-50 mt-1 font-medium">In question bank</div>
            </div>
            <div>
              <div className="text-[0.625rem] uppercase tracking-[0.2em] font-bold opacity-50 mb-1.5">Users</div>
              <div className="font-display tabular-nums text-3xl md:text-4xl font-black animate-count-up">
                {data.totalUsers ?? "—"}
              </div>
              <div className="text-xs opacity-50 mt-1 font-medium">Registered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          const colors = colorMap[m.color];
          return (
            <div
              key={m.key}
              className="bg-card border border-border/60 rounded-2xl p-5 shadow-soft transition-all hover:-translate-y-1.5 hover:shadow-pop group relative overflow-hidden"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Subtle glow on hover */}
              <div className={cn("absolute top-0 right-0 w-20 h-20 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -mr-6 -mt-6", colors.bg)} />

              <div className="relative">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft", colors.icon)}>
                  <Icon size={20} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-[0.625rem] uppercase tracking-[0.2em] font-bold text-muted-foreground">{m.label}</div>
                  {m.trend && (
                    <span className={cn("inline-flex items-center gap-0.5 text-[0.625rem] font-bold", m.up ? "text-success" : "text-destructive")}>
                      {m.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {m.trend}
                    </span>
                  )}
                </div>
                <div className="font-display text-2xl font-extrabold tabular-nums mt-1 tracking-tight">{m.value}</div>
                <div className="text-[0.6875rem] text-muted-foreground mt-1 font-medium">{m.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Health */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/40">
          <div className="font-display text-lg font-bold flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center">
              <Activity size={16} className="text-success" />
            </div>
            System Health
          </div>
          <span className={cn(
            "inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border",
            data.systemHealth === "Healthy"
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning-foreground border-warning/20"
          )}>
            <span className={cn("w-2 h-2 rounded-full animate-pulse", data.systemHealth === "Healthy" ? "bg-success" : "bg-warning")} />
            {data.systemHealth === "Healthy" ? "All Systems Operational" : data.systemHealth}
          </span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {healthItems.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.label} className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all hover:scale-[1.03]",
                  h.ok
                    ? "bg-success/5 border-success/15"
                    : "bg-destructive/5 border-destructive/15"
                )}>
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    h.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  )}>
                    <Icon size={16} />
                  </div>
                  <div className="text-[0.6875rem] font-bold text-foreground">{h.label}</div>
                  <div className={cn("text-[0.625rem] font-bold uppercase tracking-wider", h.ok ? "text-success" : "text-destructive")}>
                    {h.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button className="admin-card p-5 text-left hover:shadow-pop hover:-translate-y-1 transition-all group">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Sparkles size={18} />
          </div>
          <div className="font-display font-bold text-sm">Create Quick Exam</div>
          <p className="text-xs text-muted-foreground mt-1">Set up a new exam in under 30 seconds</p>
        </button>
        <button className="admin-card p-5 text-left hover:shadow-pop hover:-translate-y-1 transition-all group">
          <div className="w-10 h-10 rounded-2xl bg-accent/12 text-accent-foreground flex items-center justify-center mb-3 group-hover:bg-gradient-accent transition-colors">
            <FileQuestion size={18} />
          </div>
          <div className="font-display font-bold text-sm">Bulk Upload</div>
          <p className="text-xs text-muted-foreground mt-1">Import questions from CSV or Excel</p>
        </button>
        <button className="admin-card p-5 text-left hover:shadow-pop hover:-translate-y-1 transition-all group">
          <div className="w-10 h-10 rounded-2xl bg-info/10 text-info flex items-center justify-center mb-3 group-hover:bg-info group-hover:text-info-foreground transition-colors">
            <BarChart3 size={18} />
          </div>
          <div className="font-display font-bold text-sm">View Analytics</div>
          <p className="text-xs text-muted-foreground mt-1">Track performance and growth trends</p>
        </button>
      </div>
    </div>
  );
}

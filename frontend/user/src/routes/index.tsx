import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Swords, Trophy, Users, Flame, ArrowRight, Sparkles, Target,
  Clock, TrendingUp, Award, ChevronRight, Zap, BookOpen, UserCircle, LogOut,
  Calendar, CheckCircle, ShieldCheck, AlertCircle
} from "lucide-react";
import { useCountdown, useLeaderboard } from "@/hooks/useLiveData";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/AuthModal";
import { fetchLiveExams, getApiError, joinExam, fetchGlobalStats } from "@/services/api";
import { getStoredUser } from "@/lib/authService";

const LIVE_EXAMS_CACHE_KEY = "examstrike_live_exams_cache_v1";
const LIVE_EXAMS_CACHE_TTL_MS = 30_000;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamStrike — Live Competitive Exam Arena" },
      { name: "description", content: "Compete in real-time mock exams for SSC, Banking, UPSC. Live leaderboard, daily battles, prize pools." },
      { property: "og:title", content: "ExamStrike — Live Competitive Exam Arena" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [targetTime, setTargetTime] = useState<Date | null>(null);
  const cd = useCountdown(targetTime);
  const topPlayers = useLeaderboard().slice(0, 5);
  const navigate = useNavigate();

  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [stats, setStats] = useState({ activeAspirants: 0, successRate: 94, examTypesCount: 0 });

  useEffect(() => {
    // Show auth modal on first visit if not logged in
    const hasVisited = localStorage.getItem("examstrike_visited");
    const user = getStoredUser();
    if (!hasVisited && !user) {
      const timer = setTimeout(() => {
        setIsAuthOpen(true);
        localStorage.setItem("examstrike_visited", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      setError("");
      try {
        const cachedRaw = sessionStorage.getItem(LIVE_EXAMS_CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            const isFresh =
              Date.now() - Number(cached?.updatedAt || 0) < LIVE_EXAMS_CACHE_TTL_MS;
            if (isFresh && Array.isArray(cached?.exams)) {
              setLiveExams(cached.exams);
              setTargetTime(
                cached.exams[0]
                  ? new Date(cached.exams[0].scheduledStartAt || cached.exams[0].startsAt)
                  : null,
              );
              setLoading(false);
            }
          } catch {
            // Ignore malformed cache and fetch fresh.
          }
        }

        const data = await fetchLiveExams();
        if (data.exams && data.exams.length > 0) {
          setLiveExams(data.exams);
          setTargetTime(new Date(data.exams[0].scheduledStartAt || data.exams[0].startsAt));
          sessionStorage.setItem(
            LIVE_EXAMS_CACHE_KEY,
            JSON.stringify({ updatedAt: Date.now(), exams: data.exams }),
          );
        } else {
          setLiveExams([]);
          setTargetTime(null);
          sessionStorage.removeItem(LIVE_EXAMS_CACHE_KEY);
        }

        const globalStats = await fetchGlobalStats();
        if (globalStats) {
          setStats(globalStats);
        }
      } catch (requestError) {
        setError(getApiError(requestError, "Unable to load live exam data").message);
        setLiveExams([]);
        setTargetTime(null);
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, []);

  const isLateToJoin = targetTime && (new Date().getTime() > targetTime.getTime());

  async function handleJoinBattle() {
    setJoinError("");
    if (isLateToJoin) return;
    if (!(liveExams[0]?.id || liveExams[0]?._id)) {
      setJoinError("No active exam available right now.");
      return;
    }
    if (!getStoredUser()) {
      setIsAuthOpen(true);
      return;
    }

    setJoining(true);
    try {
      const eid = liveExams[0].id || liveExams[0]._id;
      const data = await joinExam({ examId: eid });
      const assignment = data?.assignment || data;
      const roomId = assignment?.roomId || assignment?.room?._id || data?.roomId;
      const examId = assignment?.examId || data?.examId || eid;
      if (!roomId) {
        throw new Error("Room allocation failed. Please retry.");
      }

      sessionStorage.setItem("arena_authorized", "true");
      localStorage.setItem("active_exam_id", examId);
      localStorage.setItem("active_room_id", roomId);
      navigate({ to: "/lobby" });
    } catch (requestError) {
      const apiError = getApiError(requestError, "Unable to join exam.");
      if (apiError.status === 409) {
        setJoinError("You have already joined this exam.");
      } else if (apiError.status === 404) {
        setJoinError("Exam not available. Try another live exam.");
      } else {
        setJoinError(apiError.message);
      }
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onSuccess={() => {
            setIsAuthOpen(false);
            handleJoinBattle(); // Auto-join after success
          }}
        />
      )}
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 right-0 -mr-[20%] -mt-[10%] w-[60%] h-[60%] rounded-full bg-[oklch(0.74_0.18_55/0.15)] blur-[120px] pointer-events-none transform-gpu will-change-transform" />
      <div className="absolute top-1/2 left-0 -ml-[20%] w-[40%] h-[40%] rounded-full bg-[var(--primary)/0.15] blur-[100px] pointer-events-none transform-gpu will-change-transform" />

      <main className="container mx-auto max-w-6xl px-4 pt-12 pb-24 h-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* Hero text & CTA */}
          <div className="lg:col-span-7 space-y-6 md:space-y-8 animate-slide-up text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 backdrop-blur-sm px-4 py-2 text-[10px] md:text-xs font-bold text-accent shadow-soft uppercase tracking-widest mx-auto lg:mx-0">
              <Sparkles size={14} className="animate-pulse" />
              <span>India's #1 Live Test Platform</span>
            </div>

            <h1 className="text-display text-[2.8rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tighter">
              Outperform.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] animate-pulse-ring">
                Outrank.
              </span>
            </h1>

            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground/80 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium px-4 sm:px-0">
              Join thousands of aspirants in high-stakes, real-time mock battles. Answer faster,
              maintain absolute accuracy, and climb the live leaderboards.
            </p>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {joinError && (
              <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning-foreground">
                {joinError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4 px-4 sm:px-0">
              <button
                onClick={handleJoinBattle}
                disabled={Boolean(isLateToJoin) || joining || loading || liveExams.length === 0}
                className={cn(
                  "group relative flex h-[60px] sm:h-[70px] items-center justify-center gap-3 rounded-2xl sm:rounded-[1.5rem] px-8 sm:px-12 font-black shadow-pop transition-all active:scale-[0.98]",
                  isLateToJoin || loading || liveExams.length === 0
                    ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-70"
                    : "bg-gradient-accent text-accent-foreground hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_var(--accent)]"
                )}
              >
                <div className="absolute inset-0 rounded-2xl sm:rounded-[1.5rem] bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <Swords size={24} />
                <span className="text-lg sm:text-xl tracking-tight">
                  {loading ? "Loading..." : joining ? "Joining..." : isLateToJoin ? "Entry Closed" : liveExams.length === 0 ? "No Live Exam" : "Enter Arena"}
                </span>
                {!isLateToJoin && <ArrowRight size={22} className="transition-transform group-hover:translate-x-1.5" />}
              </button>

              <Link
                to="/leaderboard"
                className="flex h-[60px] sm:h-[70px] items-center justify-center gap-3 rounded-2xl sm:rounded-[1.5rem] border-2 border-border/80 bg-background/50 px-8 sm:px-12 font-bold text-foreground backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
              >
                <Trophy size={20} className="text-primary" />
                <span className="text-lg sm:text-xl tracking-tight">Global Rankings</span>
              </Link>
            </div>

            {/* Micro stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 pt-6 border-t border-border">
              {[
                { icon: Users, label: "Aspirants", val: `${(stats.activeAspirants + 5000).toLocaleString()}+` },
                {
                  icon: Target,
                  label: "Success",
                  val: `${stats.successRate}%`,
                },
                {
                  icon: Award,
                  label: "Exams",
                  val: `${stats.examTypesCount}+`,
                },
              ].map((s, i) => (
                <div key={i} className={cn(i === 2 && "col-span-2 md:col-span-1")}>
                  <div className="flex items-center justify-center lg:justify-start gap-1.5 text-muted-foreground mb-1">
                    <s.icon size={14} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
                  </div>
                  <div className="text-xl md:text-2xl font-display font-bold">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live countdown card */}
          <div className="lg:col-span-5 relative mt-4 md:mt-8 lg:mt-0">
            {/* Background glow */}
            <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-br from-accent/30 via-primary/20 to-transparent blur-2xl opacity-60 pointer-events-none" />

            <div className="relative rounded-[2rem] md:rounded-[28px] border-2 border-accent/20 bg-card shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-slide-up">
              {/* Ticket cutouts */}
              <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-r-2 border-accent/20 bg-background hidden md:block" />
              <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-l-2 border-accent/20 bg-background hidden md:block" />
              <div className="absolute top-1/2 w-full border-t border-dashed border-border/50 hidden md:block" />

              <div className="p-5 md:p-8 relative">
                <div className="absolute top-0 right-5 md:right-8 rounded-b-xl bg-destructive px-3 md:px-4 py-1 md:py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-destructive-foreground shadow-lg flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> Live Standby
                </div>

                <div className="mt-4 flex flex-col gap-1.5">
                  <h3 className="text-display text-lg sm:text-xl md:text-2xl font-black text-foreground leading-tight">
                    {loading ? "Locating next session..." : (liveExams.find(e => e.status === "scheduled")?.title || "No Upcoming Sessions")}
                  </h3>
                  <div className="flex items-center gap-2.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    <span>{liveExams[0] ? `${liveExams[0].durationMinutes} min` : "--"} · English</span>
                    <span className="rounded-lg bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success uppercase">Free</span>
                  </div>
                </div>
              </div>

              <div className="px-5 md:px-8 pb-5 md:pb-8 grid grid-cols-4 gap-1.5 md:gap-2">
                {[
                  { v: cd.days, l: "Days" },
                  { v: cd.hours, l: "Hrs" },
                  { v: cd.minutes, l: "Min" },
                  { v: cd.seconds, l: "Sec" },
                ].map((u, i) => (
                  <div key={i} className="flex flex-col items-center justify-center rounded-lg md:rounded-2xl bg-background border border-border/50 py-2 md:py-3 relative overflow-hidden group">
                    <span className="text-lg md:text-2xl font-display font-bold tracking-tight tabular-nums">
                      {String(Math.max(0, u.v)).padStart(2, "0")}
                    </span>
                    <span className="text-[8px] md:text-[10px] font-medium text-muted-foreground uppercase mt-0.5">{u.l}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-8 bg-zinc-950">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <Trophy size={14} className="text-accent" /> Recent Toppers
                  </span>
                </div>

                <div className="space-y-1.5">
                  {topPlayers.slice(0, 3).map((p, idx) => (
                    <div key={p.id || idx} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                          idx === 0 ? "bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_-3px_var(--accent)]" : "bg-transparent border-white/10 text-muted-foreground"
                        )}>
                          #{idx + 1}
                        </div>
                        <span className="font-bold text-xs tracking-wide text-white/90 truncate max-w-[100px]">{p.username}</span>
                      </div>
                      <div className="font-mono font-bold text-xs text-white/70">{p.score.toLocaleString()} xp</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Exams</h2>
            <Link to="/leaderboard" className="text-sm text-primary inline-flex items-center gap-1">
              View leaderboard <ChevronRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-border p-4">
                  <div className="skeleton h-4 w-1/2 rounded mb-3" />
                  <div className="skeleton h-3 w-1/3 rounded mb-2" />
                  <div className="skeleton h-3 w-2/3 rounded mb-2" />
                  <div className="skeleton h-10 w-full rounded-xl mt-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveExams.map((exam) => {
                const status = String(exam.status || "").toLowerCase();
                const startAt = new Date(exam.scheduledStartAt || exam.startsAt);
                const isLive = status === "live";
                const isUpcoming = status === "scheduled";
                const isCompleted = status === "completed" || exam.hasFinished;

                const statusConfig = {
                  live: { label: "LIVE", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", icon: <Flame size={12} className="animate-pulse" /> },
                  scheduled: { label: "UPCOMING", color: "text-info", bg: "bg-info/10", border: "border-info/20", icon: <Calendar size={12} /> },
                  completed: { label: "COMPLETED", color: "text-muted-foreground", bg: "bg-muted/10", border: "border-border", icon: <CheckCircle size={12} /> }
                };

                const config = statusConfig[isLive ? "live" : isUpcoming ? "scheduled" : "completed"];

                return (
                  <div
                    key={exam.id || exam._id}
                    className={cn(
                      "group relative rounded-[2.5rem] border border-border bg-card/40 p-6 flex flex-col transition-all duration-500 hover:-translate-y-1.5 hover:shadow-pop hover:bg-card",
                      isLive && "ring-1 ring-destructive/20"
                    )}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-6">
                      <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", config.bg, config.color, config.border)}>
                        {config.icon} {config.label}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground/60">
                        <Users size={14} />
                        <span className="text-xs font-bold tabular-nums">{exam.participantCount || 0}</span>
                      </div>
                    </div>

                    <h3 className="font-display font-black text-xl leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
                      {exam.title || "Untitled Examination"}
                    </h3>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                          <Clock size={14} className="text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground/50 leading-none mb-0.5">Start Time</div>
                          <div className="font-semibold text-foreground/80">{Number.isNaN(startAt.getTime()) ? "--" : startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                          <CheckCircle size={14} className="text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground/50 leading-none mb-0.5">Assessment</div>
                          <div className="font-semibold text-foreground/80">{exam.totalQuestions || 0} Questions · {exam.durationMinutes || 0}m</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      {!isCompleted ? (
                        <button
                          type="button"
                          disabled={isUpcoming || joining}
                          onClick={isLive ? handleJoinBattle : undefined}
                          className={cn(
                            "w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all relative overflow-hidden active:scale-[0.98]",
                            isLive
                              ? "bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-pop"
                              : "bg-secondary text-muted-foreground cursor-default"
                          )}
                        >
                          {isLive ? (
                            <>
                              <Zap size={16} fill="currentColor" />
                              <span>Participate Now</span>
                            </>
                          ) : (
                            <>
                              <Clock size={16} />
                              <span>Coming Soon</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <Link
                          to="/result"
                          className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm bg-secondary text-foreground hover:bg-muted transition-all"
                        >
                          <Award size={16} />
                          <span>View Result</span>
                        </Link>
                      )}
                    </div>

                    {/* Subtle decorative elements */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 blur-3xl rounded-full pointer-events-none group-hover:bg-primary/10 transition-all" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Categories/Marquee equivalent */}
        <div className="mt-16 border-y border-border/50 bg-background py-8 -mx-4 px-4 overflow-hidden shadow-inner">
          <div className="flex items-center justify-center gap-8 md:gap-16 opacity-50 grayscale flex-wrap font-display font-bold text-xl md:text-2xl tracking-widest uppercase">
            <span>SSC CGL</span>
            <span className="text-accent/50 w-2 h-2 rounded-full" />
            <span>RRB NTPC</span>
            <span className="text-accent/50 w-2 h-2 rounded-full" />
            <span>IBPS PO</span>
            <span className="text-accent/50 w-2 h-2 rounded-full" />
            <span>UPSC PRELIMS</span>
            <span className="text-accent/50 w-2 h-2 rounded-full" />
            <span>NDA</span>
          </div>
        </div>

        {/* Features row */}
        <div className="mt-16 lg:mt-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {[
            { icon: Clock, color: "var(--accent)", title: "Time Pressure", desc: "Every second counts in the arena. Faster answers yield higher multipliers." },
            { icon: UserCircle, color: "var(--primary)", title: "Real Opponents", desc: "You are not fighting a clock; you are fighting thousands of aspirants." },
            { icon: TrendingUp, color: "var(--success)", title: "Live Ranks", desc: "Watch your rank fluctuate after every submitted answer instantly." },
            { icon: BookOpen, color: "oklch(0.65 0.15 300)", title: "Syllabus Aligned", desc: "Strictly follows SSC, IBPS, and State PSC latest patterns." }
          ].map((feature, i) => (
            <div key={i} className="group p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-border/80 bg-card/30 backdrop-blur-md hover:bg-card hover:border-border transition-all duration-300">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 shadow-inner transition-transform group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`, color: feature.color }}>
                <feature.icon size={18} />
              </div>
              <h3 className="font-bold text-sm md:text-base text-foreground mb-1.5 md:mb-2">{feature.title}</h3>
              <p className="text-[11px] md:text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Registration CTA Section (Replaces Merit List) */}
        {!getStoredUser() && (
          <div className="mt-20 mb-20 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 p-8 md:p-16 text-center border border-white/5 shadow-pop">
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/20 blur-[100px] pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-accent mb-8">
                  <Zap size={14} className="fill-current animate-pulse" />
                  Join 12K+ Active Aspirants
                </div>
                <h2 className="text-display text-3xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
                  Ready to prove your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-white to-primary">Academic Excellence?</span>
                </h2>
                <p className="mt-6 text-sm md:text-base text-zinc-400 font-medium leading-relaxed">
                  Sign up now to access real-time proctored exams, climb the global leaderboards,
                  and earn your verified certificate of merit.
                </p>

                <div className="mt-10 md:mt-12 flex flex-col items-center justify-center gap-6">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full sm:w-auto h-[64px] md:h-[72px] px-8 md:px-12 rounded-2xl md:rounded-[2rem] bg-white text-black font-black text-lg md:text-xl hover:bg-zinc-200 transition-all shadow-[0_20px_50px_-15px_rgba(255,255,255,0.3)] active:scale-95 flex items-center justify-center gap-4 shrink-0"
                  >
                    <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                  <Link to="/leaderboard" className="text-zinc-500 hover:text-white text-sm md:text-base font-bold transition-colors py-2 flex items-center gap-2">
                    Browse Rankings First <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

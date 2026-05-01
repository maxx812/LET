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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [nextExam, setNextExam] = useState<any>(null);

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
              const nextUpcoming = cached.exams.find((e: any) => e.status === "scheduled");
              const firstLive = cached.exams.find((e: any) => e.status === "live");
              const priorityExam = nextUpcoming || firstLive || cached.exams[0];

              setNextExam(priorityExam);
              setTargetTime(
                priorityExam
                  ? new Date(priorityExam.scheduledStartAt || priorityExam.startsAt)
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

          // Find the next upcoming (scheduled) exam for the countdown card
          const nextUpcoming = data.exams.find((e: any) => e.status === "scheduled");
          const firstLive = data.exams.find((e: any) => e.status === "live");

          const priorityExam = nextUpcoming || firstLive || data.exams[0];
          setNextExam(priorityExam);
          setTargetTime(new Date(priorityExam.scheduledStartAt || priorityExam.startsAt));

          sessionStorage.setItem(
            LIVE_EXAMS_CACHE_KEY,
            JSON.stringify({ updatedAt: Date.now(), exams: data.exams }),
          );
        } else {
          setLiveExams([]);
          setNextExam(null);
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
      const targetExam = nextExam || liveExams[0];
      if (!targetExam) {
        setJoinError("No active exam available right now.");
        return;
      }
      const eid = targetExam.id || targetExam._id;

      // OPTIMIZATION: If already joined, use the roomId from the exam list
      if (targetExam.hasJoined && targetExam.roomId) {
        sessionStorage.setItem("arena_authorized", "true");
        localStorage.setItem("active_exam_id", eid);
        localStorage.setItem("active_room_id", targetExam.roomId);
        navigate({ to: "/lobby" });
        return;
      }

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
    } catch (requestError: any) {
      const apiError = getApiError(requestError, "Unable to join exam.");

      // If already joined, the backend might return 409. 
      // In this case, we should try to find the roomId from the exam list if possible, or just tell them to refresh.
      if (apiError.status === 409) {
        // Find if we have this exam in our list and if it has a roomId (some backends include it in 409)
        const errorData = requestError.response?.data;
        const existingRoomId = errorData?.roomId || errorData?.assignment?.roomId;

        if (existingRoomId) {
          sessionStorage.setItem("arena_authorized", "true");
          localStorage.setItem("active_exam_id", liveExams[0].id || liveExams[0]._id);
          localStorage.setItem("active_room_id", existingRoomId);
          navigate({ to: "/lobby" });
          return;
        }

        setJoinError("You are already in this session. Please refresh the page to sync.");
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
          <div className="lg:col-span-7 space-y-8 md:space-y-12 animate-slide-up text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 backdrop-blur-md px-5 py-2.5 text-[10px] md:text-xs font-black text-accent shadow-soft uppercase tracking-[0.2em] mx-auto lg:mx-0">
              <Sparkles size={14} className="animate-pulse" />
              <span>India's #1 Live Arena</span>
            </div>

            <h1 className="text-display text-[2.2rem] sm:text-5xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.1] sm:leading-[1.05] tracking-tighter">
              Outperform.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] animate-pulse-ring">
                Outrank.
              </span>
            </h1>

            <p className="text-[11px] sm:text-lg lg:text-xl text-muted-foreground/70 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium px-4 sm:px-0">
              Join thousands of aspirants in high-stakes, real-time mock battles. Answer faster,
              maintain absolute accuracy, and climb the live leaderboards.
            </p>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs sm:text-sm text-destructive mx-auto lg:mx-0 max-w-sm">
                {error}
              </div>
            )}
            {joinError && (
              <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 text-xs sm:text-sm text-warning-foreground mx-auto lg:mx-0 max-w-sm">
                {joinError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto px-4 sm:px-0">
              <button
                onClick={handleJoinBattle}
                disabled={Boolean(isLateToJoin) || joining || loading || liveExams.length === 0}
                className={cn(
                  "group relative flex h-[64px] sm:h-[70px] items-center justify-center gap-3 rounded-2xl sm:rounded-[1.5rem] px-8 sm:px-12 font-black shadow-pop transition-all active:scale-[0.98] w-full sm:w-auto",
                  isLateToJoin || loading || liveExams.length === 0
                    ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-70"
                    : "bg-gradient-accent text-accent-foreground hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_var(--accent)]"
                )}
              >
                <div className="absolute inset-0 rounded-2xl sm:rounded-[1.5rem] bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <Swords size={20} className="sm:w-6 sm:h-6" />
                <span className="text-base sm:text-xl tracking-tight uppercase">
                  {loading ? "Wait..." : joining ? "Joining..." : isLateToJoin ? "Closed" : liveExams.length === 0 ? "No Live Exam" : nextExam?.hasJoined ? "Resume Session" : "Enter Arena"}
                </span>
                {!isLateToJoin && <ArrowRight size={18} className="sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1.5" />}
              </button>

              <Link
                to="/leaderboard"
                className="flex h-[64px] sm:h-[70px] items-center justify-center gap-3 rounded-2xl sm:rounded-[1.5rem] border-2 border-border/80 bg-background/50 px-8 sm:px-12 font-bold text-foreground backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] w-full sm:w-auto"
              >
                <Trophy size={18} className="sm:w-5 sm:h-5 text-primary" />
                <span className="text-base sm:text-xl tracking-tight uppercase">Rankings</span>
              </Link>
            </div>

            {/* Micro stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-8 border-t border-border/50">
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
                <div key={i} className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-1.5 text-muted-foreground/60 mb-1.5">
                    <s.icon size={12} className="sm:w-4 sm:h-4" />
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em]">{s.label}</span>
                  </div>
                  <div className="text-[13px] sm:text-2xl font-display font-black tracking-tight text-foreground">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live countdown card */}
          <div className="lg:col-span-5 relative mt-8 sm:mt-12 lg:mt-0">
            {/* Background glow */}
            <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-br from-accent/30 via-primary/20 to-transparent blur-2xl opacity-60 pointer-events-none" />

            <div className="relative rounded-[2rem] md:rounded-[28px] border-2 border-accent/20 bg-card shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-slide-up">
              {/* Ticket cutouts */}
              <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-r-2 border-accent/20 bg-background hidden md:block" />
              <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-l-2 border-accent/20 bg-background hidden md:block" />
              <div className="absolute top-1/2 w-full border-t border-dashed border-border/50 hidden md:block" />

              <div className="p-6 md:p-8 relative">
                <div className="absolute top-0 right-5 md:right-8 rounded-b-xl bg-destructive px-3 md:px-4 py-1 md:py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-destructive-foreground shadow-lg flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> Live Standby
                </div>

                <div className="mt-4 flex flex-col gap-1.5">
                  <h3 className="text-display text-lg sm:text-xl md:text-2xl font-black text-foreground leading-tight">
                    {loading ? "Locating next session..." : (nextExam?.title || "No Upcoming Sessions")}
                  </h3>
                  <div className="flex items-center gap-2.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">
                    <span>{nextExam ? `${nextExam.durationMinutes} min` : "--"} · English</span>
                    <span className="rounded-lg bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success uppercase">Free</span>
                  </div>
                </div>
              </div>

              <div className="px-6 md:px-8 pb-6 md:pb-8 grid grid-cols-4 gap-2">
                {[
                  { v: cd.days, l: "Days" },
                  { v: cd.hours, l: "Hrs" },
                  { v: cd.minutes, l: "Min" },
                  { v: cd.seconds, l: "Sec" },
                ].map((u, i) => (
                  <div key={i} className="flex flex-col items-center justify-center rounded-xl md:rounded-2xl bg-background border border-border/50 py-3 md:py-4 relative overflow-hidden group">
                    <span className="text-base md:text-2xl font-display font-bold tracking-tight tabular-nums">
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

        <div className="mt-16 md:mt-24">
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">Live & Upcoming Exams</h2>
            <Link to="/leaderboard" className="text-sm font-bold text-primary hidden sm:inline-flex items-center gap-1.5 group">
              View leaderboard <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          {/* Category Tabs */}
          {!loading && liveExams.length > 0 && (
            <div className="mb-8 relative">
              <div className="overflow-x-auto pb-4 custom-scrollbar flex items-center gap-2 sm:gap-3 pr-8">
                {["All", ...new Set(liveExams.map((e: any) => e.examType?.name || "General Assessment"))].map((cat: string) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                      selectedCategory === cat
                        ? "bg-accent text-accent-foreground border-accent shadow-glow scale-105"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[2.5rem] border border-border p-8 bg-card/20 h-[400px]">
                  <div className="skeleton h-6 w-1/2 rounded-full mb-8" />
                  <div className="skeleton h-12 w-full rounded-2xl mb-6" />
                  <div className="space-y-4">
                    <div className="skeleton h-12 w-full rounded-2xl" />
                    <div className="skeleton h-14 w-full rounded-2xl mt-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : liveExams.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border/50 rounded-[3rem] bg-card/5 backdrop-blur-sm">
              <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground/20 mb-6" />
              <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-xs">No active sessions found</p>
            </div>
          ) : (
            <div className="space-y-24">
              {Object.entries(
                liveExams.reduce((acc: any, exam) => {
                  const category = exam.examType?.name || "General Assessment";
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(exam);
                  return acc;
                }, {})
              )
                .filter(([category]) => selectedCategory === "All" || category === selectedCategory)
                .map(([category, exams]: [string, any]) => {
                  // Separate and sort
                  const live = exams.filter((e: any) => e.status === "live");
                  const scheduled = exams.filter((e: any) => e.status === "scheduled");
                  const completed = exams.filter((e: any) => e.status === "completed" || e.hasFinished).slice(0, 3);

                  // Sorting: Scheduled -> Live -> Completed as requested
                  const displayExams = [...scheduled, ...live, ...completed];

                  if (displayExams.length === 0) return null;

                  return (
                    <div key={category} className="space-y-6 md:space-y-10">
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-4 md:px-2">
                        <div className="space-y-1 md:space-y-2 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-3">
                            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                            <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">{category}</h3>
                          </div>
                          <p className="text-[9px] md:text-[10px] font-black text-muted-foreground/40 tracking-[0.25em] uppercase">
                            Swipe to explore active sessions
                          </p>
                        </div>
                        <div className="flex items-center justify-center sm:justify-end gap-2">
                          <div className="h-px w-24 bg-gradient-to-r from-transparent to-border hidden lg:block" />
                          <Link to="/leaderboard" className="px-5 py-2 rounded-full border border-border bg-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all hidden sm:flex items-center gap-2">
                            Full Leaderboard <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>

                      {/* Slider Container */}
                      <div className="relative group/slider">
                        <div className="flex gap-4 md:gap-8 overflow-x-auto pb-12 px-4 md:px-2 no-scrollbar scroll-smooth snap-x snap-mandatory">
                          {displayExams.map((exam) => {
                            const status = String(exam.status || "").toLowerCase();
                            const startAt = new Date(exam.scheduledStartAt || exam.startsAt);
                            const isLive = status === "live";
                            const isUpcoming = status === "scheduled";
                            const isCompleted = status === "completed" || exam.hasFinished;

                            const statusConfig = {
                              live: { label: "LIVE NOW", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", icon: <Flame size={12} className="animate-pulse" /> },
                              scheduled: { label: "UPCOMING", color: "text-info", bg: "bg-info/10", border: "border-info/20", icon: <Calendar size={12} /> },
                              completed: { label: "COMPLETED", color: "text-muted-foreground", bg: "bg-muted/5", border: "border-border/50", icon: <CheckCircle size={12} /> }
                            };

                            const config = statusConfig[isLive ? "live" : isUpcoming ? "scheduled" : "completed"];

                            return (
                              <div
                                key={exam.id || exam._id}
                                className={cn(
                                  "snap-start shrink-0 w-[82vw] sm:w-[400px] group relative rounded-[2rem] sm:rounded-[2.5rem] border border-border/40 bg-card/20 p-6 sm:p-8 flex flex-col transition-all duration-700 hover:bg-card hover:shadow-pop hover:border-accent/20",
                                  isLive && "ring-2 ring-destructive/20 bg-destructive/[0.02]"
                                )}
                              >
                                {/* Status Header */}
                                <div className="flex items-center justify-between mb-8 sm:mb-10 relative z-10">
                                  <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border backdrop-blur-md", config.bg, config.color, config.border)}>
                                    {config.icon} {config.label}
                                  </div>
                                  <div className="flex -space-x-1.5 sm:-space-x-2">
                                    {[1, 2, 3].map((i) => (
                                      <div key={i} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                                      </div>
                                    ))}
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-background bg-accent/20 flex items-center justify-center text-[7px] sm:text-[8px] font-black text-accent backdrop-blur-sm">
                                      +{(exam.participantCount || 0).toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                {/* Content Section */}
                                <div className="relative z-10 mb-6 sm:mb-8">
                                  <h4 className="font-display font-black text-xl sm:text-3xl leading-[1.1] text-foreground group-hover:text-primary transition-all line-clamp-2 min-h-[3rem] sm:min-h-[4rem] tracking-tighter">
                                    {exam.title || "Elite Session"}
                                  </h4>
                                  <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground/50 font-medium line-clamp-1 italic tracking-wide">
                                    {exam.description || "Compete with the nation's best aspirants in real-time."}
                                  </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10 mb-8 sm:mb-10">
                                  <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/5 group-hover:bg-accent/5 group-hover:border-accent/10 transition-all">
                                    <div className="text-[8px] sm:text-[9px] uppercase font-black text-muted-foreground/30 tracking-widest mb-1">Start At</div>
                                    <div className="font-bold text-foreground text-xs sm:text-sm tracking-tight">{Number.isNaN(startAt.getTime()) ? "--" : startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                                  </div>
                                  <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/5 group-hover:bg-primary/5 group-hover:border-primary/10 transition-all">
                                    <div className="text-[8px] sm:text-[9px] uppercase font-black text-muted-foreground/30 tracking-widest mb-1">Duration</div>
                                    <div className="font-bold text-foreground text-xs sm:text-sm tracking-tight">{exam.durationMinutes || 0} Minutes</div>
                                  </div>
                                </div>

                                {/* Action Button */}
                                <div className="mt-auto relative z-10">
                                  {!isCompleted ? (
                                    <button
                                      type="button"
                                      disabled={isUpcoming || joining}
                                      onClick={isLive ? handleJoinBattle : undefined}
                                      className={cn(
                                        "w-full h-14 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-sm uppercase tracking-[0.15em] transition-all relative overflow-hidden active:scale-[0.98]",
                                        isLive
                                          ? "bg-gradient-accent text-accent-foreground shadow-glow hover:shadow-pop hover:brightness-110"
                                          : "bg-white/5 text-muted-foreground/30 cursor-default border border-white/5"
                                      )}
                                    >
                                      {isLive ? (
                                        <>
                                          <Zap size={16} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" />
                                          <span>Enter Arena</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clock size={16} className="sm:w-[18px] sm:h-[18px]" />
                                          <span>Join Soon</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <Link
                                      to="/result"
                                      className="w-full h-14 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-sm uppercase tracking-[0.15em] bg-white/5 text-foreground hover:bg-white/10 border border-white/5 transition-all"
                                    >
                                      <Award size={16} className="sm:w-[18px] sm:h-[18px] text-accent" />
                                      <span>View Score</span>
                                    </Link>
                                  )}
                                </div>

                                {/* Premium Accents */}
                                <div className="absolute top-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-accent/5 blur-[60px] sm:blur-[80px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                              </div>
                            );
                          })}
                        </div>
                        {/* Slider hints for mobile */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                          <div className="w-8 h-1 rounded-full bg-accent/30" />
                          <div className="w-2 h-1 rounded-full bg-white/10" />
                          <div className="w-2 h-1 rounded-full bg-white/10" />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Categories/Marquee equivalent */}
        <div className="mt-20 md:mt-32 border-y border-border/50 bg-background py-8 sm:py-12 -mx-4 px-4 overflow-hidden shadow-inner">
          <div className="flex items-center justify-center gap-6 sm:gap-16 opacity-30 grayscale flex-wrap font-display font-black text-base sm:text-2xl tracking-widest uppercase text-center">
            <span>SSC CGL</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>RRB NTPC</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>IBPS PO</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>UPSC PRELIMS</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>NDA</span>
          </div>
        </div>

        {/* Features row */}
        <div className="mt-20 md:mt-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {[
            { icon: Clock, color: "var(--accent)", title: "Time Pressure", desc: "Every second counts in the arena. Faster answers yield higher multipliers." },
            { icon: UserCircle, color: "var(--primary)", title: "Real Opponents", desc: "You are not fighting a clock; you are fighting thousands of aspirants." },
            { icon: TrendingUp, color: "var(--success)", title: "Live Ranks", desc: "Watch your rank fluctuate after every submitted answer instantly." },
            { icon: BookOpen, color: "oklch(0.65 0.15 300)", title: "Syllabus Aligned", desc: "Strictly follows SSC, IBPS, and State PSC latest patterns." }
          ].map((feature, i) => (
            <div key={i} className="group p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-border/80 bg-card/30 backdrop-blur-md hover:bg-card hover:border-border transition-all duration-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 shadow-inner transition-transform group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`, color: feature.color }}>
                <feature.icon size={18} />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-foreground mb-1.5 sm:mb-2 tracking-tight uppercase">{feature.title}</h3>
              <p className="text-[11px] sm:text-sm text-muted-foreground/60 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Registration CTA Section */}
        {!getStoredUser() && (
          <div className="mt-24 md:mt-32 mb-12 sm:mb-24 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 p-8 sm:p-20 text-center border border-white/5 shadow-pop mx-1 sm:mx-0">
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/20 blur-[100px] pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-accent mb-8">
                  <Zap size={14} className="fill-current animate-pulse" />
                  Join 12K+ Active Aspirants
                </div>
                <h2 className="text-display text-2xl sm:text-5xl font-black text-white leading-[1.2] sm:leading-[1.1] tracking-tight uppercase">
                  Ready to prove your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-white to-primary">Academic Excellence?</span>
                </h2>
                <p className="mt-6 text-xs sm:text-base text-zinc-400 font-medium leading-relaxed px-4">
                  Sign up now to access real-time proctored exams, climb the global leaderboards,
                  and earn your verified certificate of merit.
                </p>

                <div className="mt-10 md:mt-12 flex flex-col items-center justify-center gap-6">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full sm:w-auto h-[56px] sm:h-[72px] px-8 sm:px-12 rounded-xl sm:rounded-[2rem] bg-white text-black font-black text-base sm:text-xl hover:bg-zinc-200 transition-all shadow-[0_20px_50px_-15px_rgba(255,255,255,0.3)] active:scale-95 flex items-center justify-center gap-3 sm:gap-4 shrink-0"
                  >
                    <svg className="w-5 h-5 sm:w-7 sm:h-7" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                  <Link to="/leaderboard" className="text-zinc-500 hover:text-white text-xs sm:text-base font-bold transition-colors py-2 flex items-center gap-2">
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

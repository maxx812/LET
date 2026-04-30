import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Swords, Trophy, Users, Flame, ArrowRight, Sparkles, Target,
  Clock, TrendingUp, Award, ChevronRight, Zap, BookOpen, UserCircle, LogOut
} from "lucide-react";
import { useCountdown, useLeaderboard } from "@/hooks/useLiveData";
import { cn } from "@/lib/utils";
import { fetchLiveExams, getApiError, joinExam } from "@/services/api";
import { getStoredUser } from "@/lib/authService";

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
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchLiveExams();
        if (data.exams && data.exams.length > 0) {
          setLiveExams(data.exams);
          setTargetTime(new Date(data.exams[0].scheduledStartAt || data.exams[0].startsAt));
        } else {
          setLiveExams([]);
          setTargetTime(null);
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
      setJoinError("Please sign in with Google before joining live exam.");
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
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 right-0 -mr-[20%] -mt-[10%] w-[60%] h-[60%] rounded-full bg-[oklch(0.74_0.18_55/0.15)] blur-[120px] pointer-events-none transform-gpu will-change-transform" />
      <div className="absolute top-1/2 left-0 -ml-[20%] w-[40%] h-[40%] rounded-full bg-[var(--primary)/0.15] blur-[100px] pointer-events-none transform-gpu will-change-transform" />

      <main className="container mx-auto max-w-6xl px-4 pt-12 pb-24 h-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Hero text & CTA */}
          <div className="lg:col-span-7 space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 backdrop-blur-sm px-4 py-2 text-xs font-bold text-accent shadow-soft uppercase tracking-widest">
              <Sparkles size={14} className="animate-pulse" />
              <span>India's #1 Live Test Platform</span>
            </div>

            <h1 className="text-display text-5xl md:text-[5rem] lg:text-[5.5rem] font-black leading-[1.05] tracking-tighter">
              Outperform.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] animate-pulse-ring">
                Outrank.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground/80 max-w-xl leading-relaxed font-medium">
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

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={handleJoinBattle}
                disabled={Boolean(isLateToJoin) || joining || loading || liveExams.length === 0}
                className={cn(
                  "group relative flex h-[60px] items-center justify-center gap-3 rounded-2xl px-10 font-bold shadow-pop transition-all active:scale-[0.98]",
                  isLateToJoin || loading || liveExams.length === 0
                    ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-70" 
                    : "bg-gradient-accent text-accent-foreground hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_var(--accent)]"
                )}
              >
                <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                <Swords size={22} />
                <span className="text-[17px] tracking-wide">
                  {loading ? "Loading..." : joining ? "Joining..." : isLateToJoin ? "Entry Closed" : liveExams.length === 0 ? "No Live Exam" : "Enter Arena"}
                </span>
                {!isLateToJoin && <ArrowRight size={20} className="transition-transform group-hover:translate-x-1.5" />}
              </button>
              
              <Link
                to="/leaderboard"
                className="flex h-[60px] items-center justify-center gap-3 rounded-2xl border-2 border-border/80 bg-background/50 px-10 font-bold text-foreground backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
              >
                <Trophy size={20} className="text-primary" />
                <span className="text-[17px] tracking-wide">Global Rankings</span>
              </Link>
            </div>

            {/* Micro stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
              {[
                { icon: Users, label: "Daily Active", val: "12K+" },
                { icon: Target, label: "Questions", val: "50K+" },
                { icon: Award, label: "Prize Pool", val: "₹500 / Day" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <s.icon size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                  </div>
                  <div className="text-2xl font-display font-bold">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live countdown card */}
          <div className="lg:col-span-5 relative mt-8 lg:mt-0">
            {/* Background glow */}
            <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-br from-accent/30 via-primary/20 to-transparent blur-2xl opacity-60 pointer-events-none" />

            <div className="relative rounded-[28px] border-2 border-accent/20 bg-card shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-slide-up">
              {/* Ticket cutouts */}
              <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-r-2 border-accent/20 bg-background" />
              <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-l-2 border-accent/20 bg-background" />
              <div className="absolute top-1/2 w-full border-t border-dashed border-border/50" />

              <div className="p-6 md:p-8 relative">
                <div className="absolute top-0 right-8 rounded-b-xl bg-destructive px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-destructive-foreground shadow-lg flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> Live Standby
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <h3 className="text-display text-2xl font-black text-foreground">
                    {loading ? "Loading upcoming exam..." : liveExams[0]?.title || "No upcoming exam"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {liveExams[0] ? `${liveExams[0].durationMinutes} min` : "--"} · English
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 tabular">
                    Starts at{" "}
                    <span className="font-semibold text-foreground">
                      {targetTime
                        ? targetTime.toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "--:--"}
                    </span>{" "}
                    IST
                  </p>
                </div>
                <div className="rounded-lg bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success shrink-0">
                  FREE ENTRY
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-2">
                {[
                  { v: cd.days, l: "Days" },
                  { v: cd.hours, l: "Hours" },
                  { v: cd.minutes, l: "Min" },
                  { v: cd.seconds, l: "Sec" },
                ].map((u, i) => (
                  <div key={i} className="flex flex-col items-center justify-center rounded-2xl bg-background border border-border/50 py-3 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                    <span className="text-2xl font-display font-bold tracking-tight tabular-nums">
                      {String(Math.max(0, u.v)).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase mt-0.5">{u.l}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-8 bg-zinc-950">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <Flame size={14} className="animate-pulse" /> Hot Streak Active
                  </span>
                </div>
                
                <div className="space-y-2">
                  {topPlayers.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/5 transition-all cursor-default">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black tabular-nums border",
                          idx === 0 ? "bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_-3px_var(--accent)]" : idx === 1 ? "bg-secondary/50 border-white/5 text-muted-foreground" : idx === 2 ? "bg-primary/10 border-primary/20 text-primary" : "bg-transparent border-transparent text-muted-foreground"
                        )}>
                          #{idx + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm tracking-wide text-white/90">{p.username}</span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-[15px] text-white/70">{p.score.toLocaleString()}<span className="text-[10px] text-white/30 ml-1">xp</span></div>
                    </div>
                  ))}
                  {topPlayers.length === 0 && <div className="text-xs font-medium text-white/30 text-center py-6 border border-dashed border-white/10 rounded-xl">Leaderboard resets after every match.</div>}
                </div>
              </div>
            </div>
          </div>
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
        <div className="mt-20 lg:mt-32 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up mb-20" style={{ animationDelay: "0.1s" }}>
          {[
            { icon: Clock, color: "var(--accent)", title: "Time Pressure", desc: "Every second counts in the arena. Faster answers yield higher multipliers." },
            { icon: UserCircle, color: "var(--primary)", title: "Real Opponents", desc: "You are not fighting a clock; you are fighting thousands of aspirants." },
            { icon: TrendingUp, color: "var(--success)", title: "Live Ranks", desc: "Watch your rank fluctuate after every submitted answer instantly." },
            { icon: BookOpen, color: "oklch(0.65 0.15 300)", title: "Syllabus Aligned", desc: "Strictly follows SSC, IBPS, and State PSC latest patterns." }
          ].map((feature, i) => (
            <div key={i} className="group p-8 rounded-[2rem] border border-border/80 bg-card/30 backdrop-blur-md hover:bg-card hover:border-border hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.2)] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3" style={{ backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`, color: feature.color }}>
                <feature.icon size={20} />
              </div>
              <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

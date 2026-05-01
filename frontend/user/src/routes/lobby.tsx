import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, Wifi, Zap, ArrowLeft, Shield, Trophy, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}
import { useLobbyPlayerCount, useCountdown } from "@/hooks/useLiveData";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CircularProgress } from "@/components/CircularProgress";
import { cn } from "@/lib/utils";
import { fetchLiveExams, getApiError } from "@/services/api";
import {
  getSocket,
  SOCKET_EVENTS,
} from "@/services/socket";
import { getActiveExamSession } from "@/services/examSession";

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Exam Waiting Room — ExamStrike" },
      { name: "description", content: "Live exam preparation area. Candidates are joining in real-time." },
      { property: "og:title", content: "Exam Waiting Room — ExamStrike" },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serverCountdownMs, setServerCountdownMs] = useState<number | null>(null);
  const { examId, roomId, authorized } = getActiveExamSession();

  // Use the real countdown from hooks
  const cd = useCountdown(exam ? new Date(exam.scheduledStartAt || exam.startsAt) : null);
  const remainingMs = serverCountdownMs ?? cd.totalMs;
  // Re-check if we joined late
  const startTime = exam?.scheduledStartAt || exam?.startsAt;
  const isLate = exam && startTime && (new Date().getTime() > new Date(startTime).getTime() + 10000);
  const isAuthorized = authorized;
  const isBlocked = !examId || !roomId || isLate || !isAuthorized;
  const players = useLobbyPlayerCount(examId, !isBlocked, 0);

  useEffect(() => {
    async function loadLobbyData() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchLiveExams();
        if (data.exams?.length > 0) {
          const matchedExam = data.exams.find((item: any) => (item.id || item._id) === examId);
          setExam(matchedExam || data.exams[0]);
        } else {
          setError("No active exam found for this lobby.");
        }
      } catch (requestError) {
        setError(getApiError(requestError, "Unable to load lobby data").message);
      } finally {
        setLoading(false);
      }
    }
    loadLobbyData();
  }, [examId]);

  useEffect(() => {
    if (!examId || isBlocked) return;
    const socket = getSocket();

    const onCountdown = (payload: { examId?: string; remainingMs: number }) => {
      if (!payload || payload.examId !== examId) return;
      setServerCountdownMs(payload.remainingMs);
    };
    const onExamStart = (payload: { examId: string }) => {
      if (!payload?.examId || payload.examId !== examId) {
        return;
      }

      navigate({ to: "/exam" });
    };

    socket.on(SOCKET_EVENTS.COUNTDOWN, onCountdown);
    socket.on(SOCKET_EVENTS.EXAM_START, onExamStart);
    return () => {
      socket.off(SOCKET_EVENTS.COUNTDOWN, onCountdown);
      socket.off(SOCKET_EVENTS.EXAM_START, onExamStart);
    };
  }, [examId, isBlocked, navigate, roomId]);

  useEffect(() => {
    // AUTO-START: Navigate when timer hits 0
    if (exam && remainingMs <= 0 && !isBlocked) {
      const t = setTimeout(() => navigate({ to: "/exam" }), 800);
      return () => clearTimeout(t);
    }
  }, [remainingMs, exam, isBlocked, navigate]);

  const progress = remainingMs / (30 * 1000);
  const urgent = remainingMs > 0 && remainingMs <= 10000;
  const secondsLeft = Math.floor(remainingMs / 1000);
  const isTimeUp = exam && remainingMs <= 0;

  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-3xl border border-border p-6">
            <div className="skeleton h-8 w-40 rounded mb-4" />
            <div className="skeleton h-40 w-40 rounded-full mx-auto" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-border p-4">
              <div className="skeleton h-4 w-2/3 rounded mb-3" />
              <div className="skeleton h-3 w-full rounded mb-2" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
            <div className="rounded-2xl border border-border p-4">
              <div className="skeleton h-4 w-1/2 rounded mb-3" />
              <div className="skeleton h-10 w-24 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <p className="text-destructive mb-3">{error}</p>
        <button className="rounded-xl bg-secondary px-4 py-2" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-focus text-primary-foreground p-6">
        <div className="max-w-md w-full rounded-[2.5rem] bg-white/5 border border-white/10 p-10 text-center backdrop-blur-xl">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-6 scale-110" />
          <h2 className="text-display text-3xl font-black mb-3">{isLate ? "SESSION CLOSED" : "UNAUTHORIZED"}</h2>
          <p className="text-primary-foreground/60 leading-relaxed mb-8">
            {isLate
              ? "The examination has already begun. Late entries are restricted to maintain assessment integrity."
              : "You didn't reserve a seat in the session. Direct entry to the exam environment is not permitted."}
          </p>
          <Link to="/" className="inline-flex h-12 items-center justify-center rounded-xl bg-white/10 px-8 font-bold hover:bg-white/20 transition-all">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden selection:bg-accent/30">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-grid opacity-5" />

      <div
        className={cn(
          "absolute -top-[20%] left-1/2 -translate-x-1/2 h-[500px] sm:h-[800px] w-full max-w-[800px] rounded-full blur-[120px] transition-all duration-1000",
          urgent ? "bg-destructive/20 animate-pulse" : "bg-accent/10",
        )}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-12">
        {/* Header Navigation */}
        <div className="flex items-center justify-between animate-fade-in">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20">
              <ArrowLeft size={14} />
            </div>
            <span>Leave Session</span>
          </Link>

          <div className="flex items-center gap-2.5 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-[10px] sm:text-xs font-bold backdrop-blur-md">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </div>
            <span className="text-white/80">Sync Active</span>
            <span className="text-white/20 font-light">|</span>
            <span className="text-success tabular-nums">24ms</span>
          </div>
        </div>

        <div className="mt-8 sm:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Main Visual: Circular Timer */}
          <div className="lg:col-span-7 flex flex-col items-center animate-slide-up">
            <div className="relative">
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border border-white/[0.03] scale-125 pointer-events-none" />
              <div className="absolute inset-0 rounded-full border border-white/[0.02] scale-150 pointer-events-none" />

              <CircularProgress
                value={progress}
                size={isMobile ? 240 : 420}
                stroke={isMobile ? 8 : 14}
                trackClass="stroke-white/5"
                barClass={cn("transition-all duration-700", urgent ? "stroke-destructive" : "stroke-accent")}
                className={cn(urgent && "animate-pulse-ring rounded-full shadow-[0_0_50px_-10px_rgba(239,68,68,0.3)]")}
              >
                <div className="text-center px-6">
                  <div className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] text-white/30 mb-2 sm:mb-4">
                    {isTimeUp ? "Preparation Done" : "Battle Starts In"}
                  </div>
                  <div
                    key={secondsLeft}
                    className={cn(
                      "text-display font-black tabular-nums leading-none tracking-tighter drop-shadow-2xl",
                      urgent ? "text-destructive animate-bounce-subtle" : (isTimeUp ? "text-success" : "text-white"),
                      secondsLeft >= 100 ? "text-5xl sm:text-7xl" : "text-7xl sm:text-[9rem]",
                    )}
                  >
                    {isTimeUp ? "READY" : String(Math.max(0, secondsLeft)).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/40 mt-3 sm:mt-6">
                    {isTimeUp ? "Standby for Launch" : "Seconds Remaining"}
                  </div>
                </div>
              </CircularProgress>
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {/* Exam Details Card */}
            <div className="group relative rounded-[2rem] sm:rounded-[2.5rem] bg-white/[0.03] border border-white/[0.05] p-6 sm:p-10 backdrop-blur-2xl hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-[0.2em] text-accent/80 mb-6">
                <Trophy size={14} className="fill-accent/20" /> Session Metadata
              </div>
              <h3 className="text-display text-2xl sm:text-3xl font-black leading-tight text-white mb-8 line-clamp-2">
                {exam?.title || "Exam Session"}
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1.5">
                  <div className="text-white/30 text-[9px] uppercase font-black tracking-widest">Access Key</div>
                  <div className="font-bold tabular-nums text-sm sm:text-base text-white/90">{roomId.slice(-8).toUpperCase() || "..."}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-white/30 text-[9px] uppercase font-black tracking-widest">Time Limit</div>
                  <div className="font-bold text-sm sm:text-base text-white/90">{exam?.durationMinutes || 60} Minutes</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-white/30 text-[9px] uppercase font-black tracking-widest">Marking</div>
                  <div className="font-bold text-sm sm:text-base text-success tracking-tight">+2.0 Correct</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-white/30 text-[9px] uppercase font-black tracking-widest">Penalty</div>
                  <div className="font-bold text-sm sm:text-base text-destructive tracking-tight">-0.5 Negative</div>
                </div>
              </div>
            </div>

            {/* Participants Card */}
            <div className="group relative rounded-[2rem] sm:rounded-[2.5rem] bg-white/[0.03] border border-white/[0.05] p-6 sm:p-10 backdrop-blur-2xl hover:bg-white/[0.05] transition-all overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-primary" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/40">Active Candidates</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20 text-[9px] font-black text-success uppercase">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                  </span>
                  Live
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-5xl sm:text-6xl font-black tabular-nums tracking-tighter text-white">
                    <AnimatedNumber value={players} />
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-white/30 mt-2">Peers ready in your room</p>
                </div>

                <div className="flex -space-x-3 mb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-4 border-zinc-950 bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-xl" />
                  ))}
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-4 border-zinc-950 bg-accent/20 flex items-center justify-center text-[8px] sm:text-[10px] font-black text-accent backdrop-blur-sm shadow-xl">
                    +{Math.max(0, players - 4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus: Pro Tip Card */}
            <div className="relative rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-br from-accent/20 to-primary/20 border border-white/10 p-6 flex items-start gap-4 shadow-glow animate-pulse-ring">
              <Zap className="h-6 w-6 text-white shrink-0 fill-white/20" />
              <div>
                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white mb-1">Merit Bonus Active</h4>
                <p className="text-[11px] sm:text-[13px] text-white/70 leading-relaxed font-medium">
                  Maintain high accuracy to earn the <span className="text-white font-bold">Excellence Badge</span> for your profile.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Shortcut Bar */}
        <div className="mt-12 sm:mt-24 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/[0.02] border border-white/5 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-md">
          <div className="flex items-center gap-4 text-xs font-medium text-white/40 overflow-x-auto w-full sm:w-auto no-scrollbar">
            <span className="flex items-center gap-2 whitespace-nowrap"><kbd className="px-2 py-1 bg-white/10 rounded-lg text-white font-bold">A/B/C/D</kbd> Select Answer</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/5 hidden sm:block" />
            <span className="flex items-center gap-2 whitespace-nowrap"><kbd className="px-2 py-1 bg-white/10 rounded-lg text-white font-bold">N</kbd> Next Question</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/5 hidden sm:block" />
            <span className="flex items-center gap-2 whitespace-nowrap"><kbd className="px-2 py-1 bg-white/10 rounded-lg text-white font-bold">R</kbd> Flag Question</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/30 hidden sm:block">
            Keyboard Shortcuts Active
          </div>
        </div>
      </div>
    </div>
  );
}

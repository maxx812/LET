import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, Wifi, Zap, ArrowLeft, Shield, Trophy } from "lucide-react";
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
    <div className="relative min-h-[calc(100vh-4rem)] bg-focus text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div
        className={cn(
          "absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full blur-3xl transition-colors",
          urgent ? "bg-destructive/30" : "bg-accent/20",
        )}
      />

      <div className="relative mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-12">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Leave session
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
            <Wifi className="h-3.5 w-3.5 text-success" />
            <span>Connected</span>
            <span className="opacity-50">·</span>
            <span className="text-mono">23ms</span>
          </div>
        </div>

        <div className="mt-8 md:mt-16 grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 items-center">
          {/* Big circular timer */}
          <div className="lg:col-span-3 flex justify-center py-2 md:py-0">
            <CircularProgress
              value={progress}
              size={isMobile ? 220 : 360}
              stroke={isMobile ? 10 : 18}
              trackClass="stroke-white/10"
              barClass={cn("transition-colors", urgent ? "stroke-destructive" : "stroke-accent")}
              className={cn(urgent && "animate-pulse-ring rounded-full")}
            >
              <div className="text-center px-4">
                <div className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-primary-foreground/60">
                  {isTimeUp ? "Preparation over" : "Session starts in"}
                </div>
                <div
                  key={secondsLeft}
                  className={cn(
                    "text-display font-extrabold tabular animate-count-up leading-none",
                    urgent ? "text-destructive" : (isTimeUp ? "text-success" : "text-primary-foreground"),
                    secondsLeft >= 100 ? "text-5xl md:text-7xl" : "text-7xl md:text-9xl",
                  )}
                >
                  {isTimeUp ? "READY" : String(Math.max(0, secondsLeft)).padStart(2, "0")}
                </div>
                <div className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-primary-foreground/60 mt-1 md:mt-2">
                  {isTimeUp ? "Waiting for signal..." : "seconds"}
                </div>
              </div>
            </CircularProgress>
          </div>

          {/* Room info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary-foreground/60 font-bold">
                <Shield className="h-3.5 w-3.5" /> Room Info
              </div>
              <div className="mt-3 text-display text-xl md:text-2xl font-bold leading-tight text-balance">
                {exam?.title || "Waiting for Exam..."}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <div className="text-primary-foreground/40 text-[10px] uppercase font-bold tracking-wider">Room ID</div>
                  <div className="font-bold tabular text-base">{roomId.slice(-8).toUpperCase() || "—"}</div>
                </div>
                <div>
                  <div className="text-primary-foreground/40 text-[10px] uppercase font-bold tracking-wider">Duration</div>
                  <div className="font-bold text-base">{exam?.durationMinutes || 60} min</div>
                </div>
                <div>
                  <div className="text-primary-foreground/40 text-[10px] uppercase font-bold tracking-wider">Marking</div>
                  <div className="font-bold text-base">+2 / −0.5</div>
                </div>
                <div>
                  <div className="text-primary-foreground/40 text-[10px] uppercase font-bold tracking-wider">Status</div>
                  <div className="font-bold text-success capitalize text-base">{exam?.status || "Hold"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="text-[10px] md:text-sm uppercase tracking-widest text-primary-foreground/60 font-bold">
                    Candidates joined
                  </span>
                </div>
                <span className="flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
              </div>
              <div className="mt-4 text-display text-4xl md:text-5xl font-extrabold tabular">
                <AnimatedNumber value={players} />
              </div>
              <div className="mt-4 flex -space-x-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-[#1a1a1a] bg-gradient-accent text-[11px] font-bold text-accent-foreground flex items-center justify-center"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                <div className="h-8 w-8 rounded-full border-2 border-[#1a1a1a] bg-white/10 text-[10px] font-bold flex items-center justify-center">
                  +{Math.max(0, players - 6)}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-accent text-accent-foreground p-6 flex items-center gap-4 shadow-glow">
              <ClipboardList className="h-8 w-8 shrink-0" />
              <div>
                <div className="text-display text-lg font-extrabold leading-tight">Certificate of Merit Eligibility</div>
                <div className="text-xs opacity-80 mt-0.5">Maintain high accuracy to qualify for the excellence badge.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips ticker */}
        <div className="mt-8 mb-4 md:mb-0 rounded-3xl bg-white/5 border border-white/10 p-5 flex items-center gap-4 text-sm backdrop-blur-sm">
          <Zap className="h-5 w-5 text-accent shrink-0 animate-pulse" />
          <p className="text-primary-foreground/70 leading-relaxed">
            <span className="font-bold text-primary-foreground">Pro tip:</span> Use keyboard A/B/C/D to answer instantly. N for next, P for previous, R to mark for review.
          </p>
        </div>
      </div>
    </div>
  );
}

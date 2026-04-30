import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, Send, Bookmark, Check, RefreshCw, Shield } from "lucide-react";
import {
  fetchExamQuestions,
  getApiError,
  submitExam as submitExamApi,
  syncExamAnswers,
} from "@/services/api";
import { cn } from "@/lib/utils";
import {
  ensureSocketConnection,
  joinExamChannel,
  leaveExamChannel,
  SOCKET_EVENTS,
} from "@/services/socket";
import {
  getActiveExamId,
  getActiveExamSession,
  markExamSubmitted,
} from "@/services/examSession";
import { getStoredUser } from "@/lib/authService";

export const Route = createFileRoute("/exam")({
  head: () => ({
    meta: [
      { title: "Live Exam — ExamStrike" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExamPage,
});

type Status = "unvisited" | "answered" | "review" | "skipped";

type Question = { id: string; questionCode: string; text: string; options: string[]; section: string };

const TOTAL_TIME = 60 * 60; // default 60 min

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function serializeAnswerSnapshot(
  questionList: Question[],
  answerState: Record<number, number>,
) {
  return questionList
    .flatMap((question, index) =>
      index in answerState
        ? [`${question.questionCode}:${answerState[index]}`]
        : [],
    )
    .join("|");
}

function ExamPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const { examId: activeExamId, roomId, authorized } = getActiveExamSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [examId, setExamId] = useState(activeExamId);
  const lastSyncedSnapshotRef = useRef("");
  const syncInFlightRef = useRef(false);

  const isAuthorized = authorized;

  useEffect(() => {
    if (!isAuthorized || !roomId || !activeExamId) {
      setLoading(false);
      return;
    }

    async function loadQuestions() {
      setError("");

      try {
        const data = await fetchExamQuestions(activeExamId);
        if (data.questions?.length > 0) {
          const nextExamId = data.exam?.id || activeExamId || getActiveExamId();
          const mappedQuestions: Question[] = data.questions.map((q: any, i: number) => ({
            id: q.bankQuestionId || q._id || String(i + 1),
            questionCode: q.questionCode || String(i + 1),
            text: q.questionText || q.title || "Untitled question",
            options: (q.options || []).map((o: any) => o.text || o),
            section: q.topic || "General",
          }));

          const restoredAnswers = (data.answerState?.answers || []).reduce(
            (acc: Record<number, number>, answer: any) => {
              const questionIndex = mappedQuestions.findIndex(
                (question: Question) => question.questionCode === answer.questionCode,
              );
              const selectedIndex =
                typeof answer.selectedOptionKey === "string"
                  ? answer.selectedOptionKey.charCodeAt(0) - 65
                  : -1;

              if (questionIndex >= 0 && selectedIndex >= 0) {
                acc[questionIndex] = selectedIndex;
              }

              return acc;
            },
            {},
          );

          setExamId(nextExamId);
          setQuestions(mappedQuestions);
          setAnswers(restoredAnswers);
          setVisited((previous) => {
            const next = new Set(previous);
            for (const index of Object.keys(restoredAnswers)) {
              next.add(Number(index));
            }
            return next;
          });
          lastSyncedSnapshotRef.current = serializeAnswerSnapshot(
            mappedQuestions,
            restoredAnswers,
          );

          if (typeof data.exam?.timeRemainingSeconds === "number") {
            setTimeLeft(Math.max(0, Math.floor(data.exam.timeRemainingSeconds)));
          } else if (data.exam?.durationMinutes) {
            setTimeLeft(Math.max(60, Math.floor(data.exam.durationMinutes * 60)));
          }
        }
      } catch (requestError) {
        setError(getApiError(requestError, "Failed to load exam questions").message);
      } finally {
        setLoading(false);
      }
    }

    void loadQuestions();
  }, [activeExamId, isAuthorized, roomId]);

  const buildAnsweredPayload = useCallback(
    (revision = Date.now()) =>
      questions.flatMap((question, index) =>
        index in answers
          ? [
              {
                questionCode: question.questionCode,
                selectedOptionKey: String.fromCharCode(65 + answers[index]),
                clientRevision: revision,
                submittedAt: new Date(revision).toISOString(),
              },
            ]
          : [],
      ),
    [answers, questions],
  );

  const buildFinalPayload = useCallback(
    () =>
      questions.map((question, index) => ({
        questionCode: question.questionCode,
        selectedOptionKey:
          index in answers ? String.fromCharCode(65 + answers[index]) : null,
      })),
    [answers, questions],
  );

  const syncAnswers = useCallback(
    async (force = false) => {
      if (!examId || questions.length === 0 || syncInFlightRef.current) {
        return;
      }

      const snapshot = serializeAnswerSnapshot(questions, answers);
      if (!snapshot || (!force && snapshot === lastSyncedSnapshotRef.current)) {
        return;
      }

      const payload = buildAnsweredPayload();
      if (payload.length === 0) {
        lastSyncedSnapshotRef.current = snapshot;
        return;
      }

      syncInFlightRef.current = true;
      try {
        await syncExamAnswers({
          examId,
          answers: payload,
        });
        lastSyncedSnapshotRef.current = snapshot;
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [answers, buildAnsweredPayload, examId, questions],
  );

  useEffect(() => {
    if (!examId || questions.length === 0 || submitting) {
      return;
    }

    const timer = window.setTimeout(() => {
      void syncAnswers();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [answers, examId, questions, submitting, syncAnswers]);

  useEffect(() => {
    if (!examId || questions.length === 0) {
      return;
    }

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        void syncAnswers(true);
      }
    };

    const flushBeforeUnload = () => {
      void syncAnswers(true);
    };

    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("beforeunload", flushBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("beforeunload", flushBeforeUnload);
    };
  }, [examId, questions, syncAnswers]);

  // Listen for forceSubmit event
  useEffect(() => {
    if (!examId) {
      return;
    }

    const socket = ensureSocketConnection();
    const connectAndJoin = () => joinExamChannel(examId);

    const onForceSubmit = () => {
      if (!submitting) {
        void submitFinal("auto");
      }
    };

    connectAndJoin();
    socket.on("connect", connectAndJoin);
    socket.on(SOCKET_EVENTS.FORCE_SUBMIT, onForceSubmit);

    return () => {
      leaveExamChannel(examId);
      socket.off("connect", connectAndJoin);
      socket.off(SOCKET_EVENTS.FORCE_SUBMIT, onForceSubmit);
    };
  }, [examId, submitting]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      void submitFinal("auto");
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  const lowTime = timeLeft < 5 * 60;
  const criticalTime = timeLeft < 60;

  const status = useCallback(
    (i: number): Status => {
      if (marked.has(i)) return "review";
      if (i in answers) return "answered";
      if (visited.has(i)) return "skipped";
      return "unvisited";
    },
    [answers, marked, visited],
  );

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(questions.length - 1, i));
      setCurrent(clamped);
      setVisited((v) => new Set(v).add(clamped));
    },
    [questions.length],
  );

  const select = useCallback(
    (opt: number) => {
      setAnswers((a) => ({ ...a, [current]: opt }));
    },
    [current],
  );

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["a", "b", "c", "d"].includes(k)) select(k.charCodeAt(0) - 97);
      else if (k === "n" || e.key === "ArrowRight") goTo(current + 1);
      else if (k === "p" || e.key === "ArrowLeft") goTo(current - 1);
      else if (k === "r") setMarked((m) => {
        const next = new Set(m);
        next.has(current) ? next.delete(current) : next.add(current);
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo, select]);

  const counts = useMemo(() => {
    let answered = 0, review = 0, skipped = 0, unvisited = 0;
    for (let i = 0; i < questions.length; i++) {
      const s = status(i);
      if (s === "answered") answered++;
      else if (s === "review") review++;
      else if (s === "skipped") skipped++;
      else unvisited++;
    }
    return { answered, review, skipped, unvisited };
  }, [status]);

  const q = questions[current];
  const selected = answers[current];
  const isMarked = marked.has(current);

  async function submitFinal(trigger: "manual" | "auto" = "manual") {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    const resolvedExamId = examId || activeExamId || getActiveExamId();
    const answerPayload = buildFinalPayload();

    try {
      try {
        await syncAnswers(true);
      } catch {
        // Final submit still includes the full answer sheet below.
      }

      if (resolvedExamId) {
        await submitExamApi({
          examId: resolvedExamId,
          trigger,
          answers: answerPayload,
        });
      }
    } catch {
      // Submit failed, navigate anyway so user isn't stuck
    } finally {
      if (resolvedExamId) {
        markExamSubmitted(resolvedExamId);
      }
      navigate({ to: "/result" });
    }
  }

  function submit() {
    void submitFinal("manual");
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-focus text-primary-foreground">
        <div className="max-w-md w-full rounded-[2.5rem] bg-white/5 border border-white/10 p-10 text-center backdrop-blur-xl">
          <Shield className="h-16 w-16 text-warning mx-auto mb-6 scale-110" />
          <h2 className="text-display text-3xl font-black mb-3">LOGIN REQUIRED</h2>
          <p className="text-primary-foreground/60 leading-relaxed mb-8">
            Please sign in to your account to participate in this live exam and track your ranking.
          </p>
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-8 font-bold hover:brightness-110 transition-all text-accent-foreground">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !roomId || !activeExamId) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-focus text-primary-foreground">
        <div className="max-w-md w-full rounded-[2.5rem] bg-white/5 border border-white/10 p-10 text-center backdrop-blur-xl">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-6 scale-110" />
          <h2 className="text-display text-3xl font-black mb-3">ACCESS DENIED</h2>
          <p className="text-primary-foreground/60 leading-relaxed mb-8">
            You must join the arena through the official lobby to participate in this battle.
          </p>
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-12 items-center justify-center rounded-xl bg-white/10 px-8 font-bold hover:bg-white/20 transition-all">
            Back to Base
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-focus text-primary-foreground">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin text-accent" />
          <div className="text-display text-xl font-bold">Synchronizing Arena...</div>
          <div className="mt-2 text-sm opacity-60">Preparing real-time questions and leaderboard</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-focus text-primary-foreground">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-warning" />
          <div className="text-display text-2xl font-bold">Exam Sync Failed</div>
          <div className="mt-2 text-primary-foreground/60 max-w-xs mx-auto">{error}</div>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-white/10 px-6 py-2 font-bold hover:bg-white/20 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-focus text-primary-foreground">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-warning" />
          <div className="text-display text-2xl font-bold">No Questions Found</div>
          <div className="mt-2 text-primary-foreground/60 max-w-xs mx-auto">The arena is empty. Please contact admin to seed questions.</div>
          <button onClick={() => navigate({ to: "/" })} className="mt-6 rounded-xl bg-white/10 px-6 py-2 font-bold hover:bg-white/20 transition-colors">
            Return to Base
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b-2 border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-14 flex items-center justify-between gap-2 overflow-hidden">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">SSC CGL · Tier 1</div>
            <div className="text-sm font-semibold truncate">Section: <span className="text-primary">{q.section}</span></div>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 font-mono tabular text-lg font-bold transition-colors",
              criticalTime
                ? "bg-destructive text-destructive-foreground animate-pulse-ring"
                : lowTime
                  ? "bg-warning/20 text-warning-foreground border border-warning"
                  : "bg-primary text-primary-foreground",
            )}
          >
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-sm sm:text-lg">{formatTime(timeLeft)}</span>
            {lowTime && <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />}
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-soft hover:shadow-glow transition-all disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm font-bold">Submit</span>
            <span className="hidden sm:inline"> Exam</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 grid lg:grid-cols-12 gap-6">
        {/* Left: Question (70%) */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-border bg-card p-5 md:p-7 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Question <span className="font-bold text-foreground tabular">{current + 1}</span> of {questions.length}
              </div>
              <button
                onClick={() => setMarked((m) => {
                  const next = new Set(m);
                  next.has(current) ? next.delete(current) : next.add(current);
                  return next;
                })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  isMarked
                    ? "bg-warning/20 text-warning-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                <Bookmark className={cn("h-3.5 w-3.5", isMarked && "fill-current")} />
                {isMarked ? "Marked for review" : "Mark for review"}
              </button>
            </div>

            <h2 className="mt-4 text-xl md:text-2xl font-bold leading-relaxed">
              {q.text}
            </h2>

            <div className="mt-8 grid gap-4">
              {q.options.map((opt, i) => {
                const isSel = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => select(i)}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                      isSel
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular transition-all",
                        isSel
                          ? "bg-primary text-primary-foreground scale-105"
                          : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      {isSel ? <Check className="h-5 w-5" /> : String.fromCharCode(65 + i)}
                    </div>
                    <span className={cn("text-base md:text-lg font-medium", isSel && "font-bold")}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="mt-5 flex items-center justify-between gap-2 sm:gap-3">
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 py-2.5 text-sm font-semibold disabled:opacity-40 hover:bg-secondary active:scale-[0.98] transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> <span className="sm:inline">Prev</span>
            </button>

            <div className="text-[10px] text-muted-foreground hidden md:block">
              Shortcuts: <kbd className="rounded bg-secondary px-1.5 py-0.5 text-mono">A B C D</kbd> · <kbd className="rounded bg-secondary px-1.5 py-0.5 text-mono">N</kbd> next
            </div>

            <div className="flex flex-[2] sm:flex-none items-center gap-2">
              <button
                onClick={() => {
                  setMarked((m) => new Set(m).add(current));
                  goTo(current + 1);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-warning/40 bg-warning/10 text-warning-foreground px-4 py-2.5 text-sm font-semibold hover:bg-warning/20 transition-all"
              >
                <Flag className="h-4 w-4" /> Review
              </button>
              <button
                onClick={() => goTo(current + 1)}
                disabled={current === questions.length - 1}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 sm:px-6 py-2.5 text-sm font-bold disabled:opacity-40 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-soft"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Palette */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-32 rounded-3xl border border-border bg-card overflow-hidden shadow-soft">
            <div className="p-5 border-b border-border bg-secondary/30">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-display font-bold">Question Palette</h3>
                <div className="text-xs font-bold text-primary tabular-nums">
                  {counts.answered}/{questions.length} Answered
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">SSC CGL · Tier 1 Navigation</div>
            </div>

            <div className="p-5">
              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <PaletteLegend 
                  icon={<div className="h-6 w-6 rounded-md bg-success flex items-center justify-center text-[10px] font-bold text-white">45</div>} 
                  count={counts.answered} 
                  label="Answered" 
                />
                <PaletteLegend 
                  icon={<div className="h-6 w-6 rounded-md bg-destructive flex items-center justify-center text-[10px] font-bold text-white">45</div>} 
                  count={counts.skipped} 
                  label="Not Answered" 
                />
                <PaletteLegend 
                  icon={<div className="h-6 w-6 rounded-md bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">45</div>} 
                  count={counts.unvisited} 
                  label="Not Visited" 
                />
                <PaletteLegend 
                  icon={<div className="h-6 w-6 rounded-md bg-warning flex items-center justify-center text-[10px] font-bold text-white">45</div>} 
                  count={counts.review} 
                  label="Mark for Review" 
                />
                <div className="col-span-2">
                  <PaletteLegend 
                    icon={
                      <div className="relative h-6 w-6 rounded-md bg-warning flex items-center justify-center text-[10px] font-bold text-white">
                        45
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                      </div>
                    } 
                    count={0} 
                    label="Answered & Marked for Review" 
                  />
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2.5">
                  {questions.map((qq, i) => {
                    const s = status(i);
                    const isCurrent = i === current;
                    const hasAns = i in answers;
                    const isM = marked.has(i);
                    
                    let bgClass = "bg-secondary text-muted-foreground border-transparent";
                    if (isM) bgClass = "bg-warning text-white border-transparent";
                    else if (hasAns) bgClass = "bg-success text-white border-transparent";
                    else if (visited.has(i)) bgClass = "bg-destructive text-white border-transparent";

                    return (
                      <button
                        key={qq.id}
                        onClick={() => goTo(i)}
                        className={cn(
                          "relative h-10 w-full rounded-lg text-xs font-black tabular transition-all border-2",
                          bgClass,
                          isCurrent ? "ring-2 ring-primary ring-offset-2 scale-110 z-10" : "hover:scale-105",
                        )}
                      >
                        {i + 1}
                        {isM && hasAns && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-success border-2 border-warning" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border flex flex-col gap-3">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-soft hover:shadow-pop transition-all disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting…" : "Submit Exam"}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PaletteLegend({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <div className="min-w-0">
        <div className="text-[10px] font-black leading-none mb-0.5">{count}</div>
        <div className="text-[10px] text-muted-foreground font-bold leading-none truncate uppercase tracking-tight">{label}</div>
      </div>
    </div>
  );
}


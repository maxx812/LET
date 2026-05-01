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
        const socket = ensureSocketConnection();
        if (socket.connected) {
          const socketResult = await new Promise<{ ok: boolean }>((resolve) => {
            socket.timeout(2000).emit(
              SOCKET_EVENTS.SUBMIT_ANSWERS_BATCH,
              { examId, answers: payload },
              (_error: unknown, response: { ok?: boolean } | undefined) => {
                resolve({ ok: Boolean(response?.ok) });
              },
            );
          });

          if (!socketResult.ok) {
            await syncExamAnswers({
              examId,
              answers: payload,
            });
          }
        } else {
          await syncExamAnswers({
            examId,
            answers: payload,
          });
        }
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
            You must join the examination through the official waiting area to participate in this session.
          </p>
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-12 items-center justify-center rounded-xl bg-white/10 px-8 font-bold hover:bg-white/20 transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl w-full p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-3xl border border-border p-5">
            <div className="skeleton h-5 w-1/4 rounded mb-4" />
            <div className="skeleton h-8 w-3/4 rounded mb-6" />
            <div className="space-y-3">
              <div className="skeleton h-14 w-full rounded-2xl" />
              <div className="skeleton h-14 w-full rounded-2xl" />
              <div className="skeleton h-14 w-full rounded-2xl" />
              <div className="skeleton h-14 w-full rounded-2xl" />
            </div>
          </div>
          <div className="lg:col-span-4 rounded-3xl border border-border p-5">
            <div className="skeleton h-5 w-1/2 rounded mb-4" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="skeleton h-8 w-full rounded-md" />
              ))}
            </div>
          </div>
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
          <div className="mt-2 text-primary-foreground/60 max-w-xs mx-auto">The session environment is currently empty. Please contact the administrator.</div>
          <button onClick={() => navigate({ to: "/" })} className="mt-6 rounded-xl bg-white/10 px-6 py-2 font-bold hover:bg-white/20 transition-colors">
            Return to Dashboard
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
          <div className="min-w-0 flex-1">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-black">SSC CGL · Tier 1</div>
            <div className="text-xs sm:text-sm font-bold truncate text-foreground/80">Section: <span className="text-primary">{q.section}</span></div>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 font-mono tabular text-sm sm:text-lg font-black transition-colors shrink-0",
              criticalTime
                ? "bg-destructive text-destructive-foreground animate-pulse-ring"
                : lowTime
                  ? "bg-warning/20 text-warning-foreground border border-warning"
                  : "bg-primary/10 text-primary border border-primary/20",
            )}
          >
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-accent px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-accent-foreground shadow-soft hover:shadow-glow transition-all disabled:opacity-60 shrink-0"
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 grid lg:grid-cols-12 gap-6">
        {/* Left: Question (70%) */}
        <div className="lg:col-span-8">
          <div className="rounded-[1.5rem] md:rounded-3xl border border-border bg-card p-4 md:p-7 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] md:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                Q. <span className="text-foreground tabular">{current + 1}</span> / {questions.length}
              </div>
              <button
                onClick={() => setMarked((m) => {
                  const next = new Set(m);
                  next.has(current) ? next.delete(current) : next.add(current);
                  return next;
                })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] md:text-xs font-black uppercase tracking-tight transition-all",
                  isMarked
                    ? "bg-warning/20 text-warning-foreground border border-warning/30"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80",
                )}
              >
                <Bookmark className={cn("h-3 w-3 md:h-3.5 md:w-3.5", isMarked && "fill-current")} />
                {isMarked ? "Reviewing" : "Review Later"}
              </button>
            </div>

            <h2 className="mt-4 text-lg md:text-2xl font-bold leading-tight md:leading-relaxed text-foreground/90">
              {q.text}
            </h2>

            <div className="mt-6 md:mt-8 grid gap-3 md:gap-4">
              {q.options.map((opt, i) => {
                const isSel = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => select(i)}
                    className={cn(
                      "group flex items-center gap-3 md:gap-4 rounded-xl md:rounded-2xl border p-3 md:p-4 text-left transition-all active:scale-[0.99]",
                      isSel
                        ? "border-primary bg-primary/5 shadow-soft ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg md:rounded-xl text-xs md:text-sm font-black tabular transition-all",
                        isSel
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "bg-secondary text-muted-foreground group-hover:bg-primary/10",
                      )}
                    >
                      {isSel ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : String.fromCharCode(65 + i)}
                    </div>
                    <span className={cn("text-sm md:text-lg font-medium", isSel && "font-bold text-foreground")}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="mt-4 md:mt-5 flex items-center justify-between gap-2">
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3 md:py-2.5 text-xs md:text-sm font-bold disabled:opacity-40 hover:bg-secondary active:scale-[0.98] transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> <span>Prev</span>
            </button>

            <div className="text-[10px] text-muted-foreground hidden lg:block">
              Shortcuts: <kbd className="rounded bg-secondary px-1.5 py-0.5 text-mono">A B C D</kbd> · <kbd className="rounded bg-secondary px-1.5 py-0.5 text-mono">N</kbd> next
            </div>

            <button
              onClick={() => goTo(current + 1)}
              disabled={current === questions.length - 1}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 md:px-8 py-3 md:py-2.5 text-xs md:text-sm font-black disabled:opacity-40 hover:brightness-110 active:scale-[0.98] transition-all shadow-glow"
            >
              <span>Next</span> <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: Palette */}
        <aside className="lg:col-span-4 mt-4 lg:mt-0">
          <div className="lg:sticky lg:top-24 rounded-[1.5rem] md:rounded-3xl border border-border bg-card overflow-hidden shadow-soft">
            <div className="p-4 md:p-5 border-b border-border bg-secondary/20">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm md:text-base font-black uppercase tracking-tight">Question Palette</h3>
                <div className="text-[10px] md:text-xs font-black text-primary tabular-nums bg-primary/10 px-2 py-0.5 rounded-md">
                  {counts.answered}/{questions.length} COMPLETED
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-2 md:gap-3 mb-5">
                <PaletteLegend
                  icon={<div className="h-5 w-5 rounded-md bg-success flex items-center justify-center text-[9px] font-bold text-white shadow-sm">✓</div>}
                  count={counts.answered}
                  label="Answered"
                />
                <PaletteLegend
                  icon={<div className="h-5 w-5 rounded-md bg-destructive flex items-center justify-center text-[9px] font-bold text-white shadow-sm">✕</div>}
                  count={counts.skipped}
                  label="Skipped"
                />
                <PaletteLegend
                  icon={<div className="h-5 w-5 rounded-md bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground">?</div>}
                  count={counts.unvisited}
                  label="Unvisited"
                />
                <PaletteLegend
                  icon={<div className="h-5 w-5 rounded-md bg-warning flex items-center justify-center text-[9px] font-bold text-white shadow-sm">!</div>}
                  count={counts.review}
                  label="Review"
                />
              </div>

              <div className="max-h-[220px] md:max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-5 gap-2">
                  {questions.map((qq, i) => {
                    const s = status(i);
                    const isCurrent = i === current;
                    const hasAns = i in answers;
                    const isM = marked.has(i);

                    let bgClass = "bg-secondary/50 text-muted-foreground border-transparent";
                    if (isM) bgClass = "bg-warning text-white border-transparent";
                    else if (hasAns) bgClass = "bg-success text-white border-transparent";
                    else if (visited.has(i)) bgClass = "bg-destructive/80 text-white border-transparent";

                    return (
                      <button
                        key={qq.id}
                        onClick={() => goTo(i)}
                        className={cn(
                          "relative h-9 md:h-10 w-full rounded-lg text-[10px] md:text-xs font-black tabular transition-all border-2",
                          bgClass,
                          isCurrent ? "ring-2 ring-primary ring-offset-1 scale-105 z-10" : "hover:brightness-110",
                        )}
                      >
                        {i + 1}
                        {isM && hasAns && (
                          <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
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



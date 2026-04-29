import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Target, Clock, Sparkles, ArrowRight, RotateCcw, CheckCircle2, XCircle, MinusCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CircularProgress } from "@/components/CircularProgress";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";
import { cn } from "@/lib/utils";
import { fetchExamResult, getApiError } from "@/services/api";
import { getStoredUser } from "@/lib/authService";
import { getActiveExamId, markExamSubmitted } from "@/services/examSession";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Your Result — ExamStrike" },
      { name: "description", content: "See your score, rank, accuracy, and topic-wise performance breakdown." },
      { property: "og:title", content: "Your Result — ExamStrike" },
    ],
  }),
  component: ResultPage,
});

type TopicBreakdown = {
  topic: string;
  score: number;
  weak?: boolean;
  maxScore?: number;
};

function ResultPage() {
  const [reveal, setReveal] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setReveal(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function load() {
      const examId = getActiveExamId();
      if (!examId) { setLoading(false); return; }
      try {
        markExamSubmitted(examId);
        const data = await fetchExamResult(examId);
        setResult(data);
      } catch (err) {
        setError(getApiError(err, "Unable to load result").message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const user = getStoredUser();
  const att = result || {};
  const SCORE = att.score ?? 0;
  const RANK_GLOBAL = att.rank ?? att.globalRank ?? 0;
  const ACCURACY = att.accuracy ?? 0;
  const CORRECT = att.correctCount ?? 0;
  const WRONG = att.wrongCount ?? 0;
  const SKIPPED = att.skippedCount ?? 0;
  const TOTAL = CORRECT + WRONG + SKIPPED || 50;
  const TIME_SEC = att.timeTakenSeconds ?? 0;
  const QUALIFIED = att.qualified || att.qualificationStatus === "qualified";
  const timeMinutes = Math.floor(TIME_SEC / 60);
  const timeSec = TIME_SEC % 60;
  const totalPossibleScore = att.totalPossibleScore ?? SCORE;

  const answerSheet: Array<{
    questionCode: string;
    selectedOptionKey: string | null;
    correct?: boolean;
    isCorrect?: boolean;
  }> = att.answerSheet || [];

  const topicBreakdown: TopicBreakdown[] =
    Array.isArray(att.topicBreakdown) && att.topicBreakdown.length > 0
      ? att.topicBreakdown
      : [
          {
            topic: "Overall",
            score: SCORE,
            weak: ACCURACY < 60,
            maxScore: totalPossibleScore,
          },
        ];

  const topperTopicBreakdown: TopicBreakdown[] =
    Array.isArray(att.topperTopicBreakdown) && att.topperTopicBreakdown.length > 0
      ? att.topperTopicBreakdown
      : topicBreakdown.map((topic) => ({
          topic: topic.topic,
          score: topic.maxScore ?? topic.score,
        }));

  const topicData = topicBreakdown.map((topic) => ({
    topic: topic.topic,
    score: topic.score,
    weak: Boolean(topic.weak),
  }));

  const topperTopicMap = new Map(
    topperTopicBreakdown.map((topic) => [topic.topic, topic.score]),
  );

  const radarData = topicBreakdown.map((topic) => ({
    subject: topic.topic,
    you: topic.score,
    topper: topperTopicMap.get(topic.topic) ?? topic.maxScore ?? topic.score,
  }));

  const QUESTION_RECAP = answerSheet.length > 0
    ? answerSheet.map((a: any, i: number) => {
        let status: "correct" | "wrong" | "skipped" = "skipped";
        if (!a.selectedOptionKey) status = "skipped";
        else if (a.correct === true || a.isCorrect === true) status = "correct";
        else if (a.correct === false || a.isCorrect === false) status = "wrong";
        return { questionNumber: i + 1, status };
      })
    : Array.from({ length: TOTAL }, (_, i) => {
        const qn = i + 1;
        if (qn <= CORRECT) return { questionNumber: qn, status: "correct" as const };
        if (qn <= CORRECT + WRONG) return { questionNumber: qn, status: "wrong" as const };
        return { questionNumber: qn, status: "skipped" as const };
      });

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <RefreshCw className="mx-auto h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-3">{error}</p>
          <button className="rounded-xl bg-secondary px-4 py-2" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
      {/* Hero result card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary text-primary-foreground p-6 md:p-10 shadow-pop">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-success/20 blur-3xl" />

        <div className="relative grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-success/20 border border-success/40 px-3 py-1 text-xs font-bold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> {QUALIFIED ? "QUALIFIED" : "NOT QUALIFIED"} · Rank #{RANK_GLOBAL}
            </div>
            <h1 className="mt-4 text-display text-4xl md:text-5xl font-extrabold">{QUALIFIED ? "Great run" : "Keep pushing"}, {user?.name?.split(" ")[0] || "Warrior"}.</h1>
            <p className="mt-3 max-w-md text-primary-foreground/80">
              You answered <span className="text-accent font-bold">{CORRECT}</span> correctly out of <span className="text-accent font-bold">{TOTAL}</span> questions with <span className="text-accent font-bold">{ACCURACY}%</span> accuracy.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/leaderboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground hover:-translate-y-0.5 transition-transform"
              >
                See full leaderboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/lobby"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/15"
              >
                <RotateCcw className="h-4 w-4" /> Next battle
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <CircularProgress
              value={reveal ? ACCURACY / 100 : 0}
              size={260}
              stroke={16}
              trackClass="stroke-white/10"
              barClass="stroke-accent"
            >
              <div className="text-center">
                <div className="text-[11px] uppercase tracking-[0.3em] text-primary-foreground/60">Score</div>
                <div className="text-display text-7xl font-extrabold tabular">
                  <AnimatedNumber value={reveal ? SCORE : 0} duration={1100} />
                </div>
                <div className="text-xs text-primary-foreground/70">out of {totalPossibleScore}</div>
              </div>
            </CircularProgress>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={Award} label="Global rank" value={RANK_GLOBAL} prefix="#" tone="primary" />
        <KPI icon={Target} label="Accuracy" value={ACCURACY} suffix="%" tone="success" />
        <KPI icon={CheckCircle2} label="Correct" value={CORRECT} tone="accent" />
        <KPI icon={Clock} label="Time taken" value={timeMinutes} suffix={`m ${timeSec}s`} tone="info" />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-display text-lg font-bold">Topic-wise performance</h3>
              <p className="text-xs text-muted-foreground">Weak areas highlighted in coral.</p>
            </div>
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={topicData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="topic" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  {topicData.map((t, i) => (
                    <Cell key={i} fill={t.weak ? "var(--destructive)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {topicData.filter((t) => t.weak).map((t) => (
              <span key={t.topic} className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1">
                <MinusCircle className="h-3 w-3" /> Weak: {t.topic}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-display text-lg font-bold">You vs Topper</h3>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Compare</span>
          </div>
          <div className="mt-2 h-64">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Radar name="Topper" dataKey="topper" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} />
                <Radar name="You" dataKey="you" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> You</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Topper</span>
          </div>
        </div>
      </div>

      {/* Question recap strip */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-display text-lg font-bold">Question recap</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> {CORRECT} correct</span>
            <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /> {WRONG} wrong</span>
            <span className="flex items-center gap-1"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" /> {SKIPPED} skipped</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-10 sm:grid-cols-12 lg:grid-cols-[repeat(25,minmax(0,1fr))] gap-1.5">
          {QUESTION_RECAP.map((item) => {
            const cls =
              item.status === "correct"
                ? "bg-success"
                : item.status === "wrong"
                  ? "bg-destructive"
                  : "bg-muted";

            return (
              <div
                key={item.questionNumber}
                className={cn("h-7 rounded-md", cls)}
                title={`Q${item.questionNumber}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPI({
  icon: Icon, label, value, prefix = "", suffix = "", tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  tone: "accent" | "primary" | "success" | "info";
}) {
  const map = {
    accent: "bg-accent/15 text-accent-foreground border-accent/30",
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/30",
    info: "bg-info/10 text-info border-info/30",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border", map[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</div>
      <div className="text-display text-2xl md:text-3xl font-extrabold tabular mt-1">
        {prefix}<AnimatedNumber value={value} />{suffix}
      </div>
    </div>
  );
}

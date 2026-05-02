import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Swords,
  Trophy,
  Users,
  Flame,
  ArrowRight,
  Sparkles,
  Target,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  Zap,
  BookOpen,
  UserCircle,
  Calendar,
  CheckCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useCountdown, useLeaderboard } from "@/hooks/useLiveData";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/AuthModal";
import {
  fetchLiveExams,
  getApiError,
  joinExam,
  fetchGlobalStats,
} from "@/services/api";
import { getStoredUser } from "@/lib/authService";

const LIVE_EXAMS_CACHE_KEY = "examstrike_live_exams_cache_v1";
const LIVE_EXAMS_CACHE_TTL_MS = 30_000;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamStrike — Live Competitive Exam Arena" },
      {
        name: "description",
        content:
          "Compete in real-time mock exams for SSC, Banking, UPSC. Live leaderboard, daily battles, prize pools.",
      },
      {
        property: "og:title",
        content: "ExamStrike — Live Competitive Exam Arena",
      },
    ],
  }),
  component: HomePage,
});

const translations = {
  en: {
    heroKicker: "Maharashtra's Premier Bharti Platform",
    heroTitle1: "Master the.",
    heroTitle2: "Maha-Exams.",
    heroDesc: "Maharashtra's dedicated platform for Police Bharti, Talathi, and Saralseva aspirants. Practice with precision, compete with thousands, and secure your state government post.",
    btnStart: "Start Mock Test",
    btnRankings: "State Rankings",
    statStudents: "Students",
    statJoined: "Joined Today",
    statAccuracy: "Selection",
    statRate: "Accuracy Rate",
    statExams: "Exams",
    statCats: "Categories",
    liveSession: "LIVE SESSION",
    nextMock: "Next All India Mock Test",
    fetching: "Fetching next test...",
    noUpcoming: "No Upcoming Tests",
    days: "Days",
    hours: "Hrs",
    minutes: "Min",
    seconds: "Sec",
    topPerformers: "Top Performers",
    syncing: "Syncing Live Toppers...",
    liveUpdate: "Updates in real-time as battle starts",
    statAttendance: "Daily Attendance",
    testsActive: "exams active right now",
    studentsAttempting: "Students across Maharashtra attempting tests",
    statSchedule: "Exam Schedule",
    testsToday: "Tests Today",
    nextTest: "Next test starts at",
    slotsUpdated: "New Maharashtra Bharti mocks updated daily",
    statProgress: "My State Rank",
    statLogin: "Aspirant Login",
    signInForRank: "Sign in for State Analysis",
    examTracks: "Bharti tracks active",
    saveScores: "Check your rank against thousands of students",
    liveNow: "LIVE NOW",
    upcoming: "UPCOMING",
    completed: "COMPLETED",
    startAt: "Start At",
    duration: "Duration",
    enterArena: "Enter Arena",
    joinSoon: "Join Soon",
    viewScore: "View Score",
    targetJob: "Sarkari Naukri cha Swapna kara Purna!",
    readyTitle: "Ready for your",
    readySubtitle: "Maharashtra Bharti?",
    readyDesc: "Sign up now to access full-length mock tests, State Rankings, and pro-level analytics that help you crack Group C & D exams.",
    googleBtn: "Continue with Google",
    viewRanks: "View State Rankings",
  },
  mr: {
    heroKicker: "महाराष्ट्राचे नंबर १ भरती प्लॅटफॉर्म",
    heroTitle1: "यशस्वी व्हा.",
    heroTitle2: "महा-परीक्षांमध्ये.",
    heroDesc: "पोलीस भरती, तलाठी आणि सरलसेवा इच्छुकांसाठी महाराष्ट्राचे समर्पित व्यासपीठ. अचूकतेने सराव करा, हजारो विद्यार्थ्यांशी स्पर्धा करा आणि तुमचे सरकारी पद निश्चित करा.",
    btnStart: "मॉक टेस्ट सुरू करा",
    btnRankings: "राज्य रँकिंग",
    statStudents: "विद्यार्थी",
    statJoined: "आज सामील झाले",
    statAccuracy: "निवड",
    statRate: "अचूकता दर",
    statExams: "परीक्षा",
    statCats: "श्रेणी",
    liveSession: "लाईव्ह सत्र",
    nextMock: "पुढील ऑल इंडिया मॉक टेस्ट",
    fetching: "पुढील परीक्षा शोधत आहे...",
    noUpcoming: "कोणतीही आगामी परीक्षा नाही",
    days: "दिवस",
    hours: "तास",
    minutes: "मिन",
    seconds: "सेक",
    topPerformers: "सर्वोत्कृष्ट विद्यार्थी",
    syncing: "लाईव्ह टॉपर शोधत आहे...",
    liveUpdate: "स्पर्धा सुरू होताच अपडेट्स मिळतील",
    statAttendance: "दैनिक उपस्थिती",
    testsActive: "परीक्षा सध्या सुरू आहेत",
    studentsAttempting: "महाराष्ट्रभरातील विद्यार्थी परीक्षा देत आहेत",
    statSchedule: "परीक्षा वेळापत्रक",
    testsToday: "आजच्या परीक्षा",
    nextTest: "पुढील परीक्षा सुरू होईल",
    slotsUpdated: "नवीन महाराष्ट्र भरती मॉक दररोज अपडेट केले जातात",
    statProgress: "माझा राज्य रँक",
    statLogin: "विद्यार्थी लॉगिन",
    signInForRank: "राज्य विश्लेषणासाठी लॉगिन करा",
    examTracks: "भरती ट्रॅक्स सक्रिय",
    saveScores: "हजारो विद्यार्थ्यांमध्ये तुमचा रँक तपासा",
    liveNow: "सध्या सुरू",
    upcoming: "आगामी",
    completed: "पूर्ण",
    startAt: "सुरुवात",
    duration: "कालावधी",
    enterArena: "प्रवेश करा",
    joinSoon: "लवकरच सामील व्हा",
    viewScore: "निकाल पहा",
    targetJob: "सरकारी नोकरीचे स्वप्न करा पूर्ण!",
    readyTitle: "तुम्ही तयार आहात का?",
    readySubtitle: "महाराष्ट्र भरतीसाठी?",
    readyDesc: "पूर्ण-लांबीच्या मॉक टेस्ट, राज्य रँकिंग आणि प्रो-लेव्हल ॲनालिटिक्समध्ये प्रवेश मिळवण्यासाठी आता साइन अप करा.",
    googleBtn: "Google सह पुढे जा",
    viewRanks: "राज्य रँकिंग पहा",
  },
};

function HomePage() {
  const [lang, setLang] = useState<"en" | "mr">(() => {
    return (localStorage.getItem("examstrike_lang") as "en" | "mr") || "en";
  });
  const t = translations[lang];

  const [targetTime, setTargetTime] = useState<Date | null>(null);
  const cd = useCountdown(targetTime);
  const navigate = useNavigate();

  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [stats, setStats] = useState({
    activeAspirants: 0,
    successRate: 94,
    examTypesCount: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [nextExam, setNextExam] = useState<any>(null);
  const currentUser = getStoredUser();
  const liveExam = liveExams.find((exam: any) => exam.status === "live");
  const featuredLeaderboardExamId =
    liveExam?.id || liveExam?._id || nextExam?.id || nextExam?._id || "";
  const topPlayers = useLeaderboard(featuredLeaderboardExamId).slice(0, 5);
  const liveCount = liveExams.filter(
    (exam: any) => exam.status === "live",
  ).length;
  const scheduledCount = liveExams.filter(
    (exam: any) => exam.status === "scheduled",
  ).length;
  const categoryCount = new Set(
    liveExams.map((exam: any) => exam.examType?.name || "General Assessment"),
  ).size;
  const totalParticipants = liveExams.reduce(
    (sum, exam: any) => sum + Number(exam.participantCount || 0),
    0,
  );

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
              Date.now() - Number(cached?.updatedAt || 0) <
              LIVE_EXAMS_CACHE_TTL_MS;
            if (isFresh && Array.isArray(cached?.exams)) {
              setLiveExams(cached.exams);
              const nextUpcoming = cached.exams.find(
                (e: any) => e.status === "scheduled",
              );
              const firstLive = cached.exams.find(
                (e: any) => e.status === "live",
              );
              const priorityExam = nextUpcoming || firstLive || cached.exams[0];

              setNextExam(priorityExam);
              setTargetTime(
                priorityExam
                  ? new Date(
                    priorityExam.scheduledStartAt || priorityExam.startsAt,
                  )
                  : null,
              );
              setLoading(false);
            }
          } catch {
            // Ignore malformed cache and fetch fresh.
          }
        }

        const [data, globalStats] = await Promise.all([
          fetchLiveExams(),
          fetchGlobalStats().catch(() => null),
        ]);
        if (data.exams && data.exams.length > 0) {
          setLiveExams(data.exams);

          // Find the next upcoming (scheduled) exam for the countdown card
          const nextUpcoming = data.exams.find(
            (e: any) => e.status === "scheduled",
          );
          const firstLive = data.exams.find((e: any) => e.status === "live");

          const priorityExam = nextUpcoming || firstLive || data.exams[0];
          setNextExam(priorityExam);
          setTargetTime(
            new Date(priorityExam.scheduledStartAt || priorityExam.startsAt),
          );

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

        if (globalStats) {
          setStats(globalStats);
        }
      } catch (requestError) {
        setError(
          getApiError(requestError, "Unable to load live exam data").message,
        );
        setLiveExams([]);
        setTargetTime(null);
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, []);

  const isLateToJoin =
    targetTime && new Date().getTime() > targetTime.getTime();

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
      const roomId =
        assignment?.roomId || assignment?.room?._id || data?.roomId;
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
        const existingRoomId =
          errorData?.roomId || errorData?.assignment?.roomId;

        if (existingRoomId) {
          sessionStorage.setItem("arena_authorized", "true");
          localStorage.setItem(
            "active_exam_id",
            liveExams[0].id || liveExams[0]._id,
          );
          localStorage.setItem("active_room_id", existingRoomId);
          navigate({ to: "/lobby" });
          return;
        }

        setJoinError(
          "You are already in this session. Please refresh the page to sync.",
        );
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
    <div className="relative min-h-screen page-aura text-foreground overflow-hidden">
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

      {/* Language Switcher - Very clean, no UI shift */}
      <div className="fixed top-20 right-4 z-[100] sm:right-12">
        <div className="flex bg-background/80 backdrop-blur-md border border-border/50 rounded-full p-1 shadow-glow scale-90 sm:scale-100">
          <button
            onClick={() => {
              setLang("en");
              localStorage.setItem("examstrike_lang", "en");
              window.dispatchEvent(new Event("lang:changed"));
            }}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
              lang === "en" ? "bg-primary text-white shadow-pop" : "text-muted-foreground hover:text-foreground"
            )}
          >
            English
          </button>
          <button
            onClick={() => {
              setLang("mr");
              localStorage.setItem("examstrike_lang", "mr");
              window.dispatchEvent(new Event("lang:changed"));
            }}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
              lang === "mr" ? "bg-primary text-white shadow-pop" : "text-muted-foreground hover:text-foreground"
            )}
          >
            मराठी
          </button>
        </div>
      </div>

      <main className="container mx-auto max-w-7xl px-4 pt-8 pb-24 h-full relative z-10">
        <section className="surface-panel-strong relative overflow-hidden px-5 py-8 sm:px-6 sm:py-10 md:px-12 md:py-14 lg:px-16">
          {/* Background effects */}
          <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center relative z-10">
            {/* Hero text & CTA */}
            <div className="lg:col-span-7 space-y-8 md:space-y-10 animate-slide-up text-center lg:text-left flex flex-col items-center lg:items-start">
              <div className="surface-kicker mx-auto lg:mx-0 group cursor-default">
                <div className="relative">
                  <Sparkles size={14} className="animate-pulse text-accent" />
                  <div className="absolute inset-0 blur-sm bg-accent/20 animate-pulse" />
                </div>
                <span className="tracking-[0.2em]">{t.heroKicker}</span>
              </div>

              <h1 className={cn(
                "text-display text-[2.2rem] sm:text-6xl md:text-7xl lg:text-[6rem] font-black tracking-tighter",
                lang === "mr" ? "leading-[1.3] sm:leading-[1.2]" : "leading-[1.1] sm:leading-[0.95]"
              )}>
                {t.heroTitle1}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] animate-shimmer px-1">
                  {t.heroTitle2}
                </span>
              </h1>

              <p className={cn(
                "text-sm sm:text-lg lg:text-xl text-muted-foreground/80 max-w-xl mx-auto lg:mx-0 font-medium px-6 sm:px-0 mt-4",
                lang === "mr" ? "leading-relaxed" : "leading-relaxed"
              )}>
                {t.heroDesc}
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
                  disabled={
                    Boolean(isLateToJoin) ||
                    joining ||
                    loading ||
                    liveExams.length === 0
                  }
                  className={cn(
                    "group relative flex h-[64px] sm:h-[70px] items-center justify-center gap-3 rounded-2xl sm:rounded-[1.5rem] px-8 sm:px-12 font-black shadow-pop transition-all active:scale-[0.98] w-full sm:w-auto hover-lift interactive-active",
                    isLateToJoin || loading || liveExams.length === 0
                      ? "bg-secondary text-muted-foreground cursor-not-allowed opacity-70"
                      : "bg-gradient-accent text-accent-foreground hover:shadow-[0_15px_40px_-10px_var(--accent)]",
                  )}
                >
                  <div className="absolute inset-0 rounded-2xl sm:rounded-[1.5rem] bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Swords size={20} className="sm:w-6 sm:h-6" />
                  <span className="text-base sm:text-xl tracking-tight uppercase">
                    {loading
                      ? "Wait..."
                      : joining
                        ? "Connecting..."
                        : isLateToJoin
                          ? "Test Ended"
                          : liveExams.length === 0
                            ? "No Live Test"
                            : nextExam?.hasJoined
                              ? "Resume Test"
                              : "Start Mock Test"}
                  </span>
                  {!isLateToJoin && (
                    <ArrowRight
                      size={18}
                      className="sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1.5"
                    />
                  )}
                </button>

                <Link
                  to="/leaderboard"
                  className="flex h-[64px] sm:h-[70px] items-center justify-center gap-3 rounded-2xl sm:rounded-[1.5rem] border-2 border-border/80 bg-background/50 px-8 sm:px-12 font-bold text-foreground backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] w-full sm:w-auto hover-lift"
                >
                  <Trophy size={18} className="sm:w-5 sm:h-5 text-primary" />
                  <span className="text-base sm:text-xl tracking-tight uppercase">
                    {t.btnRankings}
                  </span>
                </Link>
              </div>

              {/* Micro stats */}
              <div className="grid w-full grid-cols-3 gap-3 pt-8 sm:gap-6">
                {[
                  {
                    icon: Users,
                    label: t.statStudents,
                    val: `${(stats.activeAspirants + 5000).toLocaleString()}+`,
                    sub: t.statJoined,
                  },
                  {
                    icon: Target,
                    label: t.statAccuracy,
                    val: `${stats.successRate}%`,
                    sub: t.statRate,
                  },
                  {
                    icon: Award,
                    label: t.statExams,
                    val: `${stats.examTypesCount}+`,
                    sub: t.statCats,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center sm:items-start p-3 sm:p-4 text-center sm:text-left group/stat hover:bg-white/50 rounded-2xl transition-all duration-300"
                  >
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground/50 group-hover/stat:text-primary transition-all">
                      <s.icon size={12} className="sm:w-4 sm:h-4 group-hover/stat:scale-110" />
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                        {s.label}
                      </span>
                    </div>
                    <div className="text-[16px] sm:text-3xl font-display font-black tracking-tight text-foreground group-hover/stat:scale-105 transition-transform origin-left">
                      {s.val}
                    </div>
                    <div className="text-[7px] sm:text-[10px] text-muted-foreground/30 font-bold uppercase mt-1 tracking-[0.15em]">
                      {s.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live countdown card */}
            <div className="lg:col-span-5 relative mt-8 sm:mt-12 lg:mt-0">
              {/* Background glow */}
              <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-br from-accent/30 via-primary/20 to-transparent blur-2xl opacity-60 pointer-events-none" />

              <div className="surface-panel relative overflow-hidden animate-slide-up group/card hover:shadow-glow transition-all duration-500 hover-lift">
                {/* Ticket cutouts */}
                <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-r-2 border-accent/20 bg-background z-20 hidden md:block" />
                <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-l-2 border-accent/20 bg-background z-20 hidden md:block" />
                <div className="absolute top-1/2 w-full border-t border-dashed border-border/50 z-10 hidden md:block" />

                <div className="p-6 md:p-8 relative">
                  <div className="absolute top-0 right-5 md:right-8 rounded-b-xl bg-accent px-3 md:px-4 py-1 md:py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-accent-foreground shadow-lg flex items-center gap-1.5 z-20">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </div>
                    {t.liveSession}
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5 relative z-20">
                    <div className="flex items-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest mb-1">
                      <div className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                      </div>
                      {t.nextMock}
                    </div>
                    <h3 className="text-display text-lg sm:text-2xl md:text-3xl font-black text-foreground leading-tight tracking-tight group-hover/card:text-primary transition-colors">
                      {loading
                        ? t.fetching
                        : nextExam?.title || t.noUpcoming}
                    </h3>
                    <div className="flex items-center gap-2.5 text-[10px] sm:text-xs text-muted-foreground mt-1 font-bold">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {nextExam ? `${nextExam.durationMinutes} min` : "--"}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>English</span>
                      <span className="rounded-lg bg-success/10 px-2 py-0.5 text-[9px] font-black text-success uppercase border border-success/20">
                        Official
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-6 md:px-8 pb-6 md:pb-8 grid grid-cols-4 gap-2">
                  {[
                    { v: cd.days, l: t.days },
                    { v: cd.hours, l: t.hours },
                    { v: cd.minutes, l: t.minutes },
                    { v: cd.seconds, l: t.seconds },
                  ].map((u, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center justify-center rounded-xl md:rounded-2xl bg-background border border-border/50 py-3 md:py-4 relative overflow-hidden group"
                    >
                      <span className="text-base md:text-2xl font-display font-bold tracking-tight tabular-nums">
                        {String(Math.max(0, u.v)).padStart(2, "0")}
                      </span>
                      <span className="text-[8px] md:text-[10px] font-medium text-muted-foreground uppercase mt-0.5">
                        {u.l}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/60 bg-secondary/60 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                      <Trophy size={14} className="text-accent" /> {t.topPerformers}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {topPlayers.length > 0 ? (
                      topPlayers.slice(0, 3).map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                                idx === 0
                                  ? "bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_-3px_var(--accent)]"
                                  : "bg-background border-border text-muted-foreground",
                              )}
                            >
                              #{idx + 1}
                            </div>
                            <span className="font-bold text-xs tracking-wide text-foreground truncate max-w-[120px]">
                              {p.username}
                            </span>
                          </div>
                          <div className="font-mono font-bold text-xs text-muted-foreground">
                            {p.score.toLocaleString()} pts
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-8 text-center text-xs text-muted-foreground">
                        <Users size={24} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold tracking-tight">{t.syncing}</p>
                        <p className="text-[10px] opacity-60 mt-1">{t.liveUpdate}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 px-4 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
            {[
              {
                icon: Users,
                label: t.statAttendance,
                value:
                  totalParticipants > 0
                    ? `${totalParticipants.toLocaleString()}+`
                    : stats.activeAspirants > 0 
                      ? `${stats.activeAspirants.toLocaleString()}+`
                      : "0+",
                note:
                  liveCount > 0
                    ? `${liveCount} ${t.testsActive}`
                    : t.studentsAttempting,
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: Calendar,
                label: t.statSchedule,
                value: scheduledCount > 0 ? `${scheduledCount} ${t.testsToday}` : t.noUpcoming,
                note: nextExam
                  ? `${t.nextTest}: ${new Date(nextExam.scheduledStartAt || nextExam.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`
                  : t.slotsUpdated,
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: currentUser ? Trophy : UserCircle,
                label: currentUser ? t.statProgress : t.statLogin,
                value: currentUser ? currentUser.name : t.signInForRank,
                note: currentUser
                  ? t.examTracks
                  : t.saveScores,
                color: "text-success",
                bg: "bg-success/10",
              },
            ].map((item) => (
              <div 
                key={item.label} 
                className="surface-panel p-5 sm:p-7 hover-lift group/statcard interactive-active overflow-hidden relative"
              >
                {/* Mobile-optimized background accent */}
                <div className={cn("absolute -right-6 -top-6 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700", item.bg)} />
                
                <div className="flex items-center sm:items-start justify-between gap-4 relative z-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 sm:mb-4">
                      <div className={cn("flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", item.bg, item.color)}>
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-primary transition-colors">
                        {item.label}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:gap-1">
                      <div className="text-xl sm:text-3xl font-display font-black tracking-tight text-foreground truncate">
                        {item.value}
                      </div>
                      <p className="text-[10px] sm:text-sm leading-relaxed text-muted-foreground/50 font-medium line-clamp-1 sm:line-clamp-2">
                        {item.note}
                      </p>
                    </div>
                  </div>
                  
                  {/* Subtle chevron for mobile affordance */}
                  <div className="sm:hidden text-muted-foreground/20">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16 md:mt-20 surface-panel p-5 md:p-8">
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 sm:px-0 pt-8 sm:pt-0">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
              Maharashtra Live Mock Tests
            </h2>
            <Link
              to="/leaderboard"
              className="text-sm font-bold text-primary hidden sm:inline-flex items-center gap-1.5 group"
            >
              State Leaderboard{" "}
              <ChevronRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
          {/* Category Tabs */}
          {!loading && liveExams.length > 0 && (
            <div className="mb-8 relative">
              <div className="overflow-x-auto pb-4 custom-scrollbar flex items-center gap-2 sm:gap-3 pr-8">
                {[
                  { name: "All", icon: Sparkles },
                  ...Array.from(new Set(
                    liveExams.map(
                      (e: any) => e.examType?.name || "General Assessment",
                    ),
                  )).map(name => {
                    let Icon = BookOpen;
                    if (name.includes("SSC")) Icon = Target;
                    if (name.includes("RRB") || name.includes("Railway")) Icon = Zap;
                    if (name.includes("IBPS") || name.includes("Bank")) Icon = Award;
                    if (name.includes("UPSC")) Icon = Shield;
                    return { name, icon: Icon };
                  })
                ].map((cat: any) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={cn(
                      "px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2.5 group",
                      selectedCategory === cat.name
                        ? "bg-primary text-primary-foreground border-primary shadow-pop scale-105"
                        : "bg-white text-muted-foreground border-border/70 hover:border-primary/30 hover:bg-primary/5",
                    )}
                  >
                    <cat.icon size={14} className={cn(
                      "transition-transform group-hover:scale-110",
                      selectedCategory === cat.name ? "text-accent" : "text-muted-foreground/40"
                    )} />
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="surface-panel h-[400px] p-8">
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
            <div className="surface-panel-muted text-center py-24 border-dashed mx-6 sm:mx-0 mb-8 sm:mb-0">
              <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground/20 mb-6" />
              <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-xs">
                No active tests scheduled
              </p>
            </div>
          ) : (
            <div className="space-y-24">
              {Object.entries(
                liveExams.reduce((acc: any, exam) => {
                  const category = exam.examType?.name || "General Assessment";
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(exam);
                  return acc;
                }, {}),
              )
                .filter(
                  ([category]) =>
                    selectedCategory === "All" || category === selectedCategory,
                )
                .map(([category, exams]: [string, any]) => {
                  // Separate and sort
                  const live = exams.filter((e: any) => e.status === "live");
                  const scheduled = exams.filter(
                    (e: any) => e.status === "scheduled",
                  );
                  const completed = exams
                    .filter(
                      (e: any) => e.status === "completed" || e.hasFinished,
                    )
                    .slice(0, 3);

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
                            <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">
                              {category}
                            </h3>
                          </div>
                          <p className="text-[9px] md:text-[10px] font-black text-muted-foreground/40 tracking-[0.25em] uppercase">
                            Attempt live for Maharashtra State Ranking
                          </p>
                        </div>
                        <div className="flex items-center justify-center sm:justify-end gap-2">
                          <div className="h-px w-24 bg-gradient-to-r from-transparent to-border hidden lg:block" />
                          <Link
                            to="/leaderboard"
                            className="surface-panel-muted px-5 py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all hidden sm:flex items-center gap-2 hover:border-primary/30 hover:bg-primary/5"
                          >
                            State Ranks <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>

                      {/* Slider Container */}
                      <div className="relative group/slider">
                        <div className="flex gap-4 md:gap-8 overflow-x-auto pb-12 px-4 md:px-2 no-scrollbar scroll-smooth snap-x snap-mandatory">
                          {displayExams.map((exam) => {
                            const status = String(
                              exam.status || "",
                            ).toLowerCase();
                            const startAt = new Date(
                              exam.scheduledStartAt || exam.startsAt,
                            );
                            const isLive = status === "live";
                            const isUpcoming = status === "scheduled";
                            const isCompleted =
                              status === "completed" || exam.hasFinished;

                            const statusConfig = {
                              live: {
                                label: t.liveNow,
                                color: "text-destructive",
                                bg: "bg-destructive/10",
                                border: "border-destructive/20",
                                icon: (
                                  <Flame size={12} className="animate-pulse" />
                                ),
                              },
                              scheduled: {
                                label: t.upcoming,
                                color: "text-info",
                                bg: "bg-info/10",
                                border: "border-info/20",
                                icon: <Calendar size={12} />,
                              },
                              completed: {
                                label: t.completed,
                                color: "text-muted-foreground",
                                bg: "bg-muted/5",
                                border: "border-border/50",
                                icon: <CheckCircle size={12} />,
                              },
                            };

                            const config =
                              statusConfig[
                              isLive
                                ? "live"
                                : isUpcoming
                                  ? "scheduled"
                                  : "completed"
                              ];

                            return (
                              <div
                                key={exam.id || exam._id}
                                className={cn(
                                  "surface-panel snap-start shrink-0 w-[82vw] sm:w-[400px] group relative p-6 sm:p-8 flex flex-col transition-all duration-500 hover:shadow-lift hover:border-primary/20 hover-lift",
                                  isLive && "ring-2 ring-destructive/20",
                                )}
                              >
                                {/* Status Header */}
                                <div className="flex items-center justify-between mb-8 sm:mb-10 relative z-10">
                                  <div
                                    className={cn(
                                      "inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border backdrop-blur-md",
                                      config.bg,
                                      config.color,
                                      config.border,
                                    )}
                                  >
                                    {config.icon} {config.label}
                                  </div>
                                  <div className="flex -space-x-1.5 sm:-space-x-2">
                                    {[1, 2, 3].map((i) => (
                                      <div
                                        key={i}
                                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden"
                                      >
                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                                      </div>
                                    ))}
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-background bg-accent/20 flex items-center justify-center text-[7px] sm:text-[8px] font-black text-accent backdrop-blur-sm">
                                      +
                                      {(
                                        exam.participantCount || 0
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                {/* Content Section */}
                                <div className="relative z-10 mb-6 sm:mb-8">
                                  <h4 className="font-display font-black text-xl sm:text-3xl leading-[1.1] text-foreground group-hover:text-primary transition-all line-clamp-2 min-h-[3rem] sm:min-h-[4rem] tracking-tighter">
                                    {exam.title || "Elite Session"}
                                  </h4>
                                  <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground/50 font-medium line-clamp-1 italic tracking-wide">
                                    {exam.description ||
                                      "Compete with the nation's best aspirants in real-time."}
                                  </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10 mb-8 sm:mb-10">
                                  <div className="surface-panel-muted p-3 sm:p-4 group-hover:border-accent/10 group-hover:bg-accent/5 transition-all flex flex-col justify-center">
                                    <div className="text-[8px] sm:text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest mb-1.5 flex items-center gap-1.5">
                                      <Calendar size={10} /> {t.startAt}
                                    </div>
                                    <div className="font-bold text-foreground text-xs sm:text-base tracking-tight">
                                      {Number.isNaN(startAt.getTime())
                                        ? "--"
                                        : startAt.toLocaleTimeString("en-IN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                    </div>
                                  </div>
                                  <div className="surface-panel-muted p-3 sm:p-4 group-hover:border-primary/10 group-hover:bg-primary/5 transition-all flex flex-col justify-center">
                                    <div className="text-[8px] sm:text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest mb-1.5 flex items-center gap-1.5">
                                      <Clock size={10} /> {t.duration}
                                    </div>
                                    <div className="font-bold text-foreground text-xs sm:text-base tracking-tight">
                                      {exam.durationMinutes || 0} {t.minutes}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Button */}
                                <div className="mt-auto relative z-10">
                                  {!isCompleted ? (
                                    <button
                                      type="button"
                                      disabled={isUpcoming || joining}
                                      onClick={
                                        isLive ? handleJoinBattle : undefined
                                      }
                                      className={cn(
                                        "w-full h-14 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-sm uppercase tracking-[0.15em] transition-all relative overflow-hidden active:scale-[0.98]",
                                        isLive
                                          ? "bg-gradient-accent text-accent-foreground shadow-glow hover:shadow-pop hover:brightness-110"
                                          : "bg-background text-muted-foreground/40 cursor-default border border-border/60",
                                      )}
                                    >
                                      {isLive ? (
                                        <>
                                          <Zap
                                            size={16}
                                            className="sm:w-[18px] sm:h-[18px]"
                                            fill="currentColor"
                                          />
                                          <span>{t.enterArena}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clock
                                            size={16}
                                            className="sm:w-[18px] sm:h-[18px]"
                                          />
                                          <span>{t.joinSoon}</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <Link
                                      to="/result"
                                      className="w-full h-14 sm:h-16 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-sm uppercase tracking-[0.15em] bg-background text-foreground hover:bg-secondary border border-border/60 transition-all"
                                    >
                                      <Award
                                        size={16}
                                        className="sm:w-[18px] sm:h-[18px] text-accent"
                                      />
                                      <span>{t.viewScore}</span>
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
            <span>POLICE BHARTI</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>TALATHI BHARTI</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>MPSC GROUP C</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>ZP BHARTI</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>SARALSEVA</span>
            <span className="hidden sm:block text-accent/50 w-2 h-2 rounded-full" />
            <span>GRAMSEVAK</span>
          </div>
        </div>

        {/* Features row */}
        <div
          className="mt-20 md:mt-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          {[
            {
              icon: Clock,
              color: "var(--accent)",
              title: "Speed & Accuracy",
              desc: "Train in a simulated exam environment. Master your speed and accuracy before the real battle.",
            },
            {
              icon: UserCircle,
              color: "var(--primary)",
              title: "Maharashtra Ranks",
              desc: "Don't just solve papers; compete with thousands of aspirants across Maharashtra and find your true rank.",
            },
            {
              icon: TrendingUp,
              color: "var(--success)",
              title: "Live Score Card",
              desc: "Get instant results and detailed performance analysis after every test to identify weak areas.",
            },
            {
              icon: BookOpen,
              color: "oklch(0.65 0.15 300)",
              title: "Latest Bharti Pattern",
              desc: "Tests designed by experts, strictly following the latest Maharashtra State Board and TCS/IBPS patterns.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="surface-panel group p-6 sm:p-8 transition-all duration-500 hover:-translate-y-2 hover:border-primary/30 hover:shadow-pop relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                style={{
                  backgroundColor: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
                  color: feature.color,
                  border: `1px solid color-mix(in srgb, ${feature.color} 20%, transparent)`,
                }}
              >
                <feature.icon size={22} />
              </div>
              <h3 className="font-black text-sm sm:text-lg text-foreground mb-2 sm:mb-3 tracking-tight uppercase">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground/70 leading-relaxed font-medium">
                {feature.desc}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Learn More <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>

        {/* Registration CTA Section */}
        {!getStoredUser() && (
          <div
            className="mt-24 md:mt-32 mb-12 sm:mb-24 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="relative overflow-hidden rounded-[3rem] bg-zinc-950 p-10 sm:p-24 text-center border border-white/10 shadow-2xl mx-1 sm:mx-0 group">
              {/* Background effects */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,100,0,0.1),transparent_70%)] opacity-50" />
              <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
              <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/20 blur-[120px] pointer-events-none group-hover:bg-primary/30 transition-all duration-1000" />
              <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent/20 blur-[120px] pointer-events-none group-hover:bg-accent/30 transition-all duration-1000" />

              <div className="relative z-10 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2.5 rounded-full bg-white/5 border border-white/10 px-6 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-accent mb-10 backdrop-blur-md">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </div>
                  {t.targetJob}
                </div>

                <h2 className="text-display text-3xl sm:text-6xl font-black text-white leading-[1.1] tracking-tight uppercase mb-8">
                  {t.readyTitle} <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-white to-primary bg-[length:200%_auto] animate-shimmer">
                    {t.readySubtitle}
                  </span>
                </h2>

                <p className="text-sm sm:text-lg text-zinc-400 font-medium leading-relaxed px-4 mb-12 max-w-2xl mx-auto">
                  {t.readyDesc}
                </p>

                <div className="flex flex-col items-center justify-center gap-8">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="group/btn w-full sm:w-auto h-[64px] sm:h-[80px] px-10 sm:px-16 rounded-2xl sm:rounded-[2.5rem] bg-white text-black font-black text-lg sm:text-2xl hover:scale-[1.02] transition-all shadow-[0_25px_60px_-15px_rgba(255,255,255,0.2)] active:scale-95 flex items-center justify-center gap-4 shrink-0 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 relative z-10" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="relative z-10">Continue with Google</span>
                  </button>

                  <Link
                    to="/leaderboard"
                    className="text-zinc-500 hover:text-white text-xs sm:text-lg font-bold transition-colors py-2 flex items-center gap-2 group/link"
                  >
                    View State Rankings <ChevronRight size={20} className="group-hover/link:translate-x-1 transition-transform" />
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

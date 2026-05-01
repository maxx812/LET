import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, memo } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Search, Filter } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLiveData";
import { cn } from "@/lib/utils";
import { fetchMyProfile, fetchExamTypes } from "@/services/api";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Live Leaderboard — ExamStrike" },
      { name: "description", content: "Real-time rankings of India's top exam aspirants. Live performance updates." },
      { property: "og:title", content: "Live Leaderboard — ExamStrike" },
      { property: "og:description", content: "Watch the rankings shuffle in real-time based on session performance." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const rows = useLeaderboard();
  const [tab, setTab] = useState<"room" | "global">("global");
  const [query, setQuery] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [examTypes, setExamTypes] = useState<any[]>([]);

  useEffect(() => {
    fetchMyProfile().then(setUserProfile).catch(console.error);
    fetchExamTypes().then(data => setExamTypes(data.examTypes || [])).catch(console.error);
  }, []);

  const targetType = examTypes.find(t => t._id === userProfile?.targetExamTypeId);

  // Filter by user's exam field (targetExamTypeId)
  const fieldRows = userProfile?.targetExamTypeId
    ? rows.filter(r => r.examTypeId === userProfile.targetExamTypeId)
    : rows;

  const filtered = fieldRows.filter((r) => r.username.toLowerCase().includes(query.toLowerCase()));
  const top3 = fieldRows.slice(0, 3);
  const you = fieldRows.find((r) => r.isYou);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE · updates every 2.5s
          </div>
          <h1 className="mt-3 text-display text-3xl md:text-4xl font-extrabold">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">
            {targetType ? `${targetType.name} Aspirants` : "Real-time rankings"} · Today's Session
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1">
          {(["room", "global"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "room" ? "Room" : "Global"}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div className="mt-8 grid grid-cols-3 gap-3 md:gap-5">
        {[1, 0, 2].map((idx, pos) => {
          const r = top3[idx];
          if (!r) return null;
          const heights = ["h-32 md:h-40", "h-40 md:h-52", "h-28 md:h-36"];
          const colors = [
            "bg-secondary text-foreground",
            "bg-gradient-accent text-accent-foreground",
            "bg-muted text-foreground",
          ];
          return (
            <div key={r.id} className="flex flex-col items-center justify-end">
              <div className="relative">
                {idx === 0 && <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 h-6 w-6 text-accent fill-accent" />}
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-display text-lg font-extrabold border-4 border-card shadow-pop">
                  {r.username.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="font-bold text-sm truncate max-w-[120px]">{r.username}</div>
                <div className="text-mono tabular text-xs text-muted-foreground">{r.score} XP</div>
              </div>
              <div
                className={cn(
                  "mt-2 w-full rounded-t-2xl flex items-center justify-center text-display font-extrabold",
                  heights[pos],
                  colors[pos],
                )}
              >
                <span className="text-3xl md:text-5xl">{idx + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Your card */}
      {you && (
        <div className="mt-8 rounded-2xl bg-gradient-primary text-primary-foreground p-5 shadow-pop relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center text-display text-xl font-extrabold">
                {you.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest opacity-70">Your Merit Position</div>
                <div className="text-display text-2xl font-extrabold">#{you.rank} · {you.username}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-right">
              <div>
                <div className="text-xs opacity-70">Score</div>
                <div className="text-display text-2xl font-bold tabular">{you.score}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Accuracy</div>
                <div className="text-display text-2xl font-bold tabular">{you.accuracy.toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-xs opacity-70">To #1</div>
                <div className="text-display text-2xl font-bold tabular text-accent">{Math.max(0, (fieldRows[0]?.score || 0) - you.score)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-8 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search aspirants…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-secondary">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground font-semibold bg-secondary/40">
          <div className="col-span-1">Pos</div>
          <div className="col-span-3">Candidate</div>
          <div className="col-span-2 text-right">Room</div>
          <div className="col-span-2 text-right">Score</div>
          <div className="col-span-2 text-right">Time</div>
          <div className="col-span-2 text-right">Updated At</div>
        </div>
        <ul>
          {filtered.map((r) => (
            <LeaderboardRow key={r.id} r={r} />
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" /> Final rankings lock when the timer hits zero.
      </div>
    </div>
  );
}

const LeaderboardRow = memo(({ r }: { r: any }) => {
  const delta = r.prevRank - r.rank;
  return (
    <li
      className={cn(
        "grid grid-cols-2 md:grid-cols-12 gap-3 items-center px-4 md:px-5 py-3.5 border-b border-border/60 last:border-0 transition-colors",
        r.isYou && "bg-accent/10 ring-1 ring-accent/30",
        delta !== 0 && "animate-rank-jump",
      )}
    >
      <div className="md:col-span-1 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold tabular",
            r.rank === 1 && "bg-accent text-accent-foreground",
            r.rank === 2 && "bg-secondary text-foreground",
            r.rank === 3 && "bg-muted text-foreground",
            r.rank > 3 && "bg-secondary/60 text-muted-foreground",
          )}
        >
          {r.rank}
        </span>
      </div>
      <div className="md:col-span-3 flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {r.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate flex items-center gap-2">
            {r.username}
            {r.isYou && <span className="text-[10px] font-bold uppercase rounded bg-accent text-accent-foreground px-1.5 py-0.5">You</span>}
          </div>
          <div className="text-xs text-muted-foreground md:hidden">{r.score} XP · {r.roomCode}</div>
        </div>
      </div>
      <div className="hidden md:block md:col-span-2 text-right font-mono text-xs text-accent bg-accent/5 py-1 px-2 rounded-lg">{r.roomCode || "GLOBAL"}</div>
      <div className="hidden md:block md:col-span-2 text-right text-display text-lg font-bold tabular">{r.score}</div>
      <div className="hidden md:block md:col-span-2 text-right text-mono text-sm text-muted-foreground tabular">
        {Math.floor(r.timeSec / 60)}m {r.timeSec % 60}s
      </div>
      <div className="hidden md:block md:col-span-2 text-right text-xs text-muted-foreground tabular">
        {r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"}
      </div>
      <div className="md:col-span-1 flex md:justify-end">
        {delta > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-success font-bold text-sm tabular">
            <TrendingUp className="h-3.5 w-3.5" /> {delta}
          </span>
        ) : delta < 0 ? (
          <span className="inline-flex items-center gap-0.5 text-destructive font-bold text-sm tabular">
            <TrendingDown className="h-3.5 w-3.5" /> {Math.abs(delta)}
          </span>
        ) : (
          <span className="inline-flex items-center text-muted-foreground">
            <Minus className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </li>
  );
});

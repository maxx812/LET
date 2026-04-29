import { useState, useEffect, useCallback } from "react";
import { Trophy, RefreshCw, AlertTriangle, Crown, Target, Award, Users, Download } from "lucide-react";
import { fetchLeaderboard, fetchExams } from "../services/apiClient";
import { cn } from "../lib/utils";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalRanked: 0, highestScore: 0, avgScore: 0, passRate: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lbData, examsData] = await Promise.all([
        fetchLeaderboard(selectedExam || null),
        fetchExams()
      ]);
      
      const list = lbData.entries || [];
      setEntries(list);
      setExams(examsData.items || examsData.exams || []);

      if (list.length > 0) {
        const scores = list.map(e => e.score);
        const highestScore = Math.max(...scores);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const passCount = list.filter(e => e.accuracy >= 40).length;
        
        setStats({
          totalRanked: list.length,
          highestScore,
          avgScore: Math.round(avgScore),
          passRate: Math.round((passCount / list.length) * 100)
        });
      } else {
        setStats({ totalRanked: 0, highestScore: 0, avgScore: 0, passRate: 0 });
      }
    } catch {
      // Backend error
    } finally {
      setLoading(false);
    }
  }, [selectedExam]);

  useEffect(() => { loadData(); }, [loadData]);
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Leaderboard Control</h1>
          <p className="admin-page-subtitle">Manage rankings, recalculate scores, and override positions</p>
        </div>
        <div className="admin-action-row">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto">
            <Download size={14} /> Export Rankings
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Ranked", value: stats.totalRanked || "—", icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Highest Score", value: stats.highestScore || "—", icon: Crown, color: "bg-accent/12 text-accent-foreground" },
          { label: "Average Score", value: stats.avgScore ? `${stats.avgScore}` : "—", icon: Target, color: "bg-info/10 text-info" },
          { label: "Pass Rate", value: stats.passRate ? `${stats.passRate}%` : "—", icon: Award, color: "bg-success/10 text-success" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="admin-card p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", s.color)}>
                <Icon size={18} />
              </div>
              <div>
                <div className="font-display text-xl font-extrabold tabular-nums">{s.value}</div>
                <div className="text-[0.625rem] uppercase tracking-widest font-bold text-muted-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="admin-card">
        <div className="p-5 border-b border-border bg-accent/5">
          <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
            <div className="w-8 h-8 rounded-xl bg-accent/12 flex items-center justify-center">
              <Trophy size={16} className="text-accent-foreground" />
            </div>
            Ranking Management
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Filter by Exam</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer"
                value={selectedExam}
                onChange={e => setSelectedExam(e.target.value)}
              >
                <option value="">All Exams</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id}>{exam.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-pop transition-all disabled:opacity-50"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Recalculate
              </button>
            </div>
            <div className="flex items-end">
              <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-warning/12 text-warning-foreground border border-warning/20 hover:bg-warning hover:text-white transition-all">
                <AlertTriangle size={16} /> Manual Override
              </button>
            </div>
          </div>
          
          {entries.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-2xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-accent flex items-center justify-center mx-auto mb-4 shadow-glow animate-float">
                <Trophy size={28} className="text-accent-foreground" />
              </div>
              <div className="font-display font-bold text-lg mb-1">Rankings Ready</div>
              <p className="text-muted-foreground text-sm font-medium max-w-[340px] mx-auto">
                No attempt data available for the selected filters.
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr className="admin-table-head">
                    <th className="admin-th w-16">Rank</th>
                    <th className="admin-th">Candidate</th>
                    <th className="admin-th">Score</th>
                    <th className="admin-th">Accuracy</th>
                    <th className="admin-th">Time Taken</th>
                    <th className="admin-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="admin-td">
                        <span className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-xl font-bold text-sm",
                          entry.rank === 1 ? "bg-warning/15 text-warning border border-warning/30" :
                          entry.rank === 2 ? "bg-muted text-muted-foreground border border-border" :
                          entry.rank === 3 ? "bg-[#CD7F32]/15 text-[#CD7F32] border border-[#CD7F32]/30" :
                          "bg-muted/30 text-muted-foreground"
                        )}>
                          {entry.rank || idx + 1}
                        </span>
                      </td>
                      <td className="admin-td">
                        <div className="font-bold text-sm text-foreground">{entry.userName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{entry.userEmail}</div>
                      </td>
                      <td className="admin-td">
                        <span className="font-bold text-base tabular-nums">{entry.score}</span>
                        <span className="text-xs text-muted-foreground ml-1">pts</span>
                      </td>
                      <td className="admin-td">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", entry.accuracy >= 50 ? "bg-success" : "bg-warning")} style={{ width: `${entry.accuracy}%` }}></div>
                          </div>
                          <span className="text-xs font-bold">{entry.accuracy}%</span>
                        </div>
                      </td>
                      <td className="admin-td font-mono text-sm">
                        {Math.floor(entry.timeTakenSeconds / 60)}m {entry.timeTakenSeconds % 60}s
                      </td>
                      <td className="admin-td">
                        {entry.accuracy >= 40 ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20">Passed</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">Failed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

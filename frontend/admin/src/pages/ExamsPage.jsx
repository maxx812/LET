import { useEffect, useState, useCallback } from "react";
import { fetchExams, createExam as createExamApi, publishExam, deleteExam } from "../services/apiClient";
import { ClipboardList, Plus, Calendar, Clock, Shuffle, Trash2, RefreshCw, Radio, CheckCircle, Database, Eye, ArrowRight, Zap, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "bg-warning/12", text: "text-warning-foreground", border: "border-warning/20", dot: "bg-warning" },
  scheduled: { label: "Scheduled", bg: "bg-info/12", text: "text-info", border: "border-info/20", dot: "bg-info" },
  live: { label: "Live", bg: "bg-success/12", text: "text-success", border: "border-success/20", dot: "bg-success" },
  completed: { label: "Completed", bg: "bg-muted", text: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground" },
};

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [creating, setCreating] = useState(false);

  function showToastMsg(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchExams();
      const list = data.items || data.exams || [];
      setExams(list);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title || !startsAt || !durationMinutes) return;

    setCreating(true);
    try {
      const date = new Date(startsAt).toISOString();
      await createExamApi({ title, scheduledStartAt: date, durationMinutes, totalQuestions, topics: ["Law", "GK", "Reasoning", "Maths"] });
      setTitle(""); setStartsAt(""); setDurationMinutes(60); setTotalQuestions(50);
      setShowCreate(false);
      showToastMsg("Exam created successfully!");
      loadExams();
    } catch (err) {
      showToastMsg(err?.response?.data?.message || "Failed to create exam", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish(id) {
    if (!window.confirm("Publish this exam? Students will be able to join.")) return;
    try {
      await publishExam(id);
      showToastMsg("Exam published!");
      loadExams();
    } catch { }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this exam permanently?")) return;
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((ex) => (ex._id || ex.id) !== id));
      showToastMsg("Exam deleted");
    } catch { }
  }

  const examStats = {
    total: exams.length,
    live: exams.filter(e => e.status === "live").length,
    draft: exams.filter(e => e.status === "draft").length,
    completed: exams.filter(e => e.status === "completed").length,
  };

  return (
    <div className="admin-page">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-bold shadow-pop animate-slide-up border",
          toast.type === "error" ? "bg-destructive text-destructive-foreground border-destructive/30" : "bg-success text-success-foreground border-success/30"
        )}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Exam Management</h1>
          <p className="admin-page-subtitle">Create, schedule and manage exam sessions</p>
        </div>
        <div className="admin-action-row">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto"
            onClick={loadExams}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop sm:w-auto"
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? <X size={14} /> : <Plus size={14} />}
            {showCreate ? "Cancel" : "Create Exam"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: examStats.total, icon: Database, color: "primary" },
          { label: "Live", value: examStats.live, icon: Radio, color: "success" },
          { label: "Draft", value: examStats.draft, icon: ClipboardList, color: "warning" },
          { label: "Completed", value: examStats.completed, icon: CheckCircle, color: "info" },
        ].map(s => {
          const Icon = s.icon;
          const colorClasses = {
            primary: "bg-primary/10 text-primary",
            success: "bg-success/10 text-success",
            warning: "bg-warning/12 text-warning-foreground",
            info: "bg-info/10 text-info",
          };
          return (
            <div key={s.label} className="admin-card p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", colorClasses[s.color])}>
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

      {/* Create */}
      {showCreate && (
        <div className="admin-card animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-5 border-b border-border flex items-center bg-primary/5">
            <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Plus size={16} className="text-primary" />
              </div>
              Create New Exam
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Exam Title *</label>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium"
                    placeholder="e.g. Morning Mock 01"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Schedule *</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium"
                    value={startsAt}
                    onChange={e => setStartsAt(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Duration (min)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium"
                    placeholder="60"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Questions Count</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium"
                    placeholder="50"
                    value={totalQuestions}
                    onChange={e => setTotalQuestions(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-pop transition-all w-full sm:w-auto disabled:opacity-50"
                  disabled={creating}
                >
                  <Zap size={16} /> {creating ? "Creating..." : "Create Exam"}
                </button>
                <button type="button" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-card border border-border text-foreground hover:bg-secondary transition-all w-full sm:w-auto">
                  <Shuffle size={16} /> Auto Select Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exams List — Card Layout */}
      <div className="admin-card">
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
            <div className="w-8 h-8 rounded-xl bg-accent/12 flex items-center justify-center">
              <ClipboardList size={16} className="text-accent-foreground" />
            </div>
            All Exams
          </div>
          <span className="admin-chip bg-info/12 text-info border border-info/20">{exams.length} exams</span>
        </div>

        {exams.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={28} className="text-muted-foreground/40" />
            </div>
            <div className="font-display font-bold text-lg mb-1">No exams yet</div>
            <p className="text-sm text-muted-foreground">Create your first exam to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {exams.map((ex) => {
              const config = STATUS_CONFIG[ex.status] || STATUS_CONFIG.draft;
              return (
                <div key={ex._id} className="p-5 hover:bg-secondary/20 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Left side */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="font-display font-bold text-base tracking-tight truncate">{ex.title}</span>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[0.625rem] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider border shrink-0",
                          config.bg, config.text, config.border
                        )}>
                          {ex.status === "live" && <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.dot)} />}
                          {config.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="shrink-0" />
                          {new Date(ex.scheduledStartAt || ex.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} className="shrink-0" />
                          {ex.durationMinutes} min
                        </span>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      {ex.status === "draft" && (
                        <button
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.75rem] font-bold bg-success/10 text-success border border-success/20 hover:bg-success hover:text-success-foreground transition-all hover:shadow-soft"
                          onClick={() => handlePublish(ex._id)}
                        >
                          <Radio size={13} /> Publish
                        </button>
                      )}
                      <button
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="p-2 rounded-xl text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                        onClick={() => handleDelete(ex._id)}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

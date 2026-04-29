import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { fetchQuestions, deleteQuestion as deleteQuestionApi, createQuestion, bulkUploadQuestions, fetchExamTypes, fetchSubjects } from "../services/apiClient";
import { FileQuestion, Upload, Save, Search, Pencil, Trash2, RefreshCw, Database, ChevronDown, CheckCircle2, X, AlertCircle, Hash, BookOpen } from "lucide-react";
import { cn } from "../lib/utils";

const DIFFICULTY_COLORS = {
  easy: "bg-success/12 text-success border-success/20",
  Easy: "bg-success/12 text-success border-success/20",
  medium: "bg-warning/12 text-warning-foreground border-warning/20",
  Medium: "bg-warning/12 text-warning-foreground border-warning/20",
  hard: "bg-destructive/12 text-destructive border-destructive/20",
  Hard: "bg-destructive/12 text-destructive border-destructive/20",
};

const TOPIC_COLORS = {
  Law: "bg-primary/10 text-primary border-primary/15",
  GK: "bg-info/10 text-info border-info/15",
  Reasoning: "bg-accent/12 text-accent-foreground border-accent/15",
  Maths: "bg-success/10 text-success border-success/15",
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [filterExamType, setFilterExamType] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOptionKey: "", formTopic: "Law", formDifficulty: "Medium",
    examTypeId: "", subjectId: ""
  });
  const [examTypes, setExamTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const csvInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const types = await fetchExamTypes();
        setExamTypes(types.examTypes || []);
      } catch {}
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function loadSubjectsForType() {
      if (!formData.examTypeId) {
        setSubjects([]);
        return;
      }
      try {
        const subs = await fetchSubjects(formData.examTypeId);
        setSubjects(subs.subjects || []);
      } catch {}
    }
    loadSubjectsForType();
  }, [formData.examTypeId]);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAddQuestion() {
    if (!formData.title || !formData.correctOptionKey || !formData.optionA || !formData.examTypeId || !formData.subjectId) {
      showToast("Fill required fields including Exam and Subject", "error");
      return;
    }
    
    setLoading(true);
    try {
      await createQuestion({
        questionText: formData.title,
        options: [
          { key: "A", text: formData.optionA },
          { key: "B", text: formData.optionB },
          { key: "C", text: formData.optionC },
          { key: "D", text: formData.optionD }
        ].filter(o => o.text !== ""),
        correctOptionKey: formData.correctOptionKey,
        topic: formData.formTopic,
        difficulty: formData.formDifficulty.toLowerCase(),
        examTypeId: formData.examTypeId,
        subjectId: formData.subjectId
      });
      setFormData({ 
        title: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOptionKey: "", formTopic: "Law", formDifficulty: "Medium",
        examTypeId: formData.examTypeId, subjectId: "" 
      });
      showToast("Question added successfully!");
      setShowForm(false);
      loadQuestions();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to add question", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!filterExamType || !filterSubject) {
      if (!window.confirm("No Exam/Subject selected in filters. CSV must contain these IDs in columns. Continue?")) {
        if (csvInputRef.current) csvInputRef.current.value = "";
        return;
      }
    }

    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (filterExamType) fd.append("examTypeId", filterExamType);
      if (filterSubject) fd.append("subjectId", filterSubject);
      
      const data = await bulkUploadQuestions(fd);
      const summary = data.report?.summary || data.report || { insertedCount: 0 };
      setUploadResult(summary);
      
      const message = `Result: ${summary.insertedCount} added, ${summary.skippedCount} skipped, ${summary.invalidCount} invalid`;
      showToast(message, summary.insertedCount > 0 ? "success" : "error");
      
      loadQuestions();
    } catch (err) {
      showToast(err?.response?.data?.message || "CSV upload failed", "error");
    } finally {
      setUploading(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuestions({ 
        examTypeId: filterExamType || undefined, 
        subjectId: filterSubject || undefined,
        topic: topic !== "" ? topic : undefined
      });
      const list = data.items || data.questions || [];
      setQuestions(list.map((q) => ({
        id: q._id || q.id,
        questionText: q.questionText || q.title || "",
        topic: q.topic || "General",
        difficulty: q.difficulty || "medium",
        correctAnswer: q.correctOptionKey || q.correctAnswer || "A",
      })));
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to load questions", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions, filterExamType, filterSubject]);

  const filtered = useMemo(
    () => questions.filter(
      (q) => (!topic || q.topic === topic) && (!difficulty || q.difficulty === difficulty) && (!searchText || q.questionText.toLowerCase().includes(searchText.toLowerCase())),
    ),
    [questions, topic, difficulty, searchText],
  );

  async function handleDelete(id) {
    if (!window.confirm("Delete this question permanently?")) return;
    try {
      await deleteQuestionApi(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      showToast("Question deleted");
    } catch { /* fallback */ }
  }

  const topicStats = useMemo(() => {
    const counts = {};
    questions.forEach(q => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
    return counts;
  }, [questions]);

  return (
    <div className="admin-page">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-bold shadow-pop animate-slide-up border",
          toast.type === "error"
            ? "bg-destructive text-destructive-foreground border-destructive/30"
            : "bg-success text-success-foreground border-success/30"
        )}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Questions</h1>
          <p className="admin-page-subtitle">Create, edit and manage your question bank</p>
        </div>
        <div className="admin-action-row">
          <span className="admin-chip bg-info/12 text-info border border-info/20 hidden sm:inline-flex">
            <Database size={12} /> {questions.length} total
          </span>
          <button 
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto" 
            onClick={loadQuestions} 
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop sm:w-auto"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X size={14} /> : <FileQuestion size={14} />}
            {showForm ? "Close" : "Add Question"}
          </button>
        </div>
      </div>

      {/* Topic Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["Law", "GK", "Reasoning", "Maths"].map(t => (
          <button
            key={t}
            onClick={() => setTopic(topic === t ? "" : t)}
            className={cn(
              "admin-card p-4 text-left transition-all hover:shadow-soft hover:-translate-y-0.5",
              topic === t && "ring-2 ring-primary shadow-soft"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border", TOPIC_COLORS[t] || "bg-muted")}>
                <BookOpen size={14} />
              </div>
              {topic === t && <CheckCircle2 size={14} className="text-primary" />}
            </div>
            <div className="font-display font-extrabold text-xl tabular-nums">{topicStats[t] || 0}</div>
            <div className="text-[0.625rem] uppercase tracking-widest font-bold text-muted-foreground mt-0.5">{t}</div>
          </button>
        ))}
      </div>

      {/* Add/Edit Question */}
      {showForm && (
        <div className="admin-card animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <FileQuestion size={16} className="text-primary" />
              </div>
              New Question
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="lg:col-span-4">
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Question Text *</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all min-h-[5rem] resize-none" 
                  placeholder="Type your question here..." 
                  rows="2" 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                />
              </div>
              {["A", "B", "C", "D"].map((opt) => (
                <div key={opt}>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Option {opt} {opt === "A" && "*"}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {opt}
                    </span>
                    <input 
                      className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all" 
                      placeholder={`Option ${opt}`} 
                      value={formData[`option${opt}`]} 
                      onChange={e => setFormData({ ...formData, [`option${opt}`]: e.target.value })} 
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Exam Type *</label>
                <select 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer" 
                  value={formData.examTypeId} 
                  onChange={e => setFormData({ ...formData, examTypeId: e.target.value, subjectId: "" })}
                >
                  <option value="">Select Exam</option>
                  {examTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Subject *</label>
                <select 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer" 
                  value={formData.subjectId} 
                  onChange={e => {
                    const sub = subjects.find(s => s._id === e.target.value);
                    setFormData({ ...formData, subjectId: e.target.value, formTopic: sub ? sub.name : formData.formTopic });
                  }}
                  disabled={!formData.examTypeId}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Correct Answer *</label>
                <select 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer" 
                  value={formData.correctOptionKey} 
                  onChange={e => setFormData({ ...formData, correctOptionKey: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Topic</label>
                <select 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer" 
                  value={formData.formTopic} 
                  onChange={e => setFormData({ ...formData, formTopic: e.target.value })}
                >
                  <option value="Law">Law</option><option value="GK">GK</option><option value="Reasoning">Reasoning</option><option value="Maths">Maths</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Difficulty</label>
                <select 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer" 
                  value={formData.formDifficulty} 
                  onChange={e => setFormData({ ...formData, formDifficulty: e.target.value })}
                >
                  <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-accent text-accent-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-glow transition-all disabled:opacity-50" 
                  onClick={handleAddQuestion} 
                  disabled={loading}
                >
                  <Save size={16} /> Save Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank */}
      <div className="admin-card">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-secondary/30">
          <div className="font-display font-bold flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/12 flex items-center justify-center">
              <Search size={16} className="text-accent-foreground" />
            </div>
            Question Bank
            <span className="text-muted-foreground text-sm font-medium ml-1">({filtered.length})</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-card hover:bg-secondary transition-all hover:shadow-soft" 
              onClick={() => csvInputRef.current?.click()} 
              disabled={uploading}
            >
              <Upload size={14} /> {uploading ? "Uploading…" : "CSV Upload"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/40 bg-secondary/15">
          <div className="flex items-center bg-background border border-border/60 rounded-xl px-3 py-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all flex-1 max-w-[280px]">
            <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-foreground font-medium"
            />
          </div>
          <select 
            className="px-3.5 py-2 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none font-medium cursor-pointer min-w-[130px]" 
            value={filterExamType} 
            onChange={(e) => { setFilterExamType(e.target.value); setFilterSubject(""); }}
          >
            <option value="">All Exams</option>
            {examTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <select 
            className="px-3.5 py-2 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none font-medium cursor-pointer min-w-[130px]" 
            value={filterSubject} 
            onChange={(e) => setFilterSubject(e.target.value)}
            disabled={!filterExamType}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select 
            className="px-3.5 py-2 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none font-medium cursor-pointer min-w-[130px]" 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">All Topics</option>
            <option value="Law">Law</option><option value="GK">GK</option>
            <option value="Reasoning">Reasoning</option><option value="Maths">Maths</option>
          </select>
          <select 
            className="px-3.5 py-2 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none font-medium cursor-pointer min-w-[130px]" 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">All Difficulty</option>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
          {(topic || difficulty || searchText || filterExamType || filterSubject) && (
            <button
              onClick={() => { setTopic(""); setDifficulty(""); setSearchText(""); setFilterExamType(""); setFilterSubject(""); }}
              className="text-xs font-bold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-head">
                <th className="admin-th w-16">#</th>
                <th className="admin-th w-2/5">Question</th>
                <th className="admin-th">Topic</th>
                <th className="admin-th">Difficulty</th>
                <th className="admin-th">Answer</th>
                <th className="admin-th w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="admin-td py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <FileQuestion size={24} className="text-muted-foreground/50" />
                    </div>
                    <div className="text-muted-foreground font-medium">No questions found</div>
                    <div className="text-xs text-muted-foreground/60">Try adjusting your filters or add a new question</div>
                  </div>
                </td></tr>
              ) : filtered.map((q, idx) => (
                <tr key={q.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors group">
                  <td className="admin-td">
                    <span className="font-mono text-[0.6875rem] text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg font-bold">{idx + 1}</span>
                  </td>
                  <td className="admin-td max-w-[320px]">
                    <span className="text-sm font-medium leading-snug line-clamp-2">{q.questionText}</span>
                  </td>
                  <td className="admin-td">
                    <span className={cn("inline-flex items-center gap-1.5 text-[0.6875rem] font-bold px-2.5 py-1 rounded-lg border", TOPIC_COLORS[q.topic] || "bg-muted text-muted-foreground")}>
                      {q.topic}
                    </span>
                  </td>
                  <td className="admin-td">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-[0.6875rem] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border",
                      DIFFICULTY_COLORS[q.difficulty] || "bg-muted text-muted-foreground"
                    )}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="admin-td">
                    <span className="font-bold text-sm w-8 h-8 inline-flex bg-success/10 text-success items-center justify-center rounded-xl border border-success/20">
                      {q.correctAnswer}
                    </span>
                  </td>
                  <td className="admin-td">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="p-2 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all" onClick={() => handleDelete(q.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border/40 bg-secondary/15 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Showing {filtered.length} of {questions.length} questions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

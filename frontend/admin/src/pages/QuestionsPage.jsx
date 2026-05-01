import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { fetchQuestions, deleteQuestion as deleteQuestionApi, createQuestion, bulkUploadQuestions, fetchExamTypes, fetchSubjects } from "../services/apiClient";
import { FileQuestion, Upload, Save, Search, Pencil, Trash2, RefreshCw, Database, ChevronDown, CheckCircle2, X, AlertCircle, Hash, BookOpen, Loader2, Plus, ChevronRight } from "lucide-react";
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadReport, setUploadReport] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [modalSelections, setModalSelections] = useState({ examTypeId: "", subjectId: "" });
  const [modalSubjects, setModalSubjects] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const types = await fetchExamTypes();
        setExamTypes(types.examTypes || []);
      } catch { }
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
      } catch { }
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
      setPendingFile(file);
      setModalSelections({ examTypeId: filterExamType, subjectId: filterSubject });
      setUploadReport({
        type: "configure",
        title: "Configure Upload",
        message: "Specify where these questions should be added.",
        fileName: file.name
      });
      setShowUploadModal(true);
      if (csvInputRef.current) csvInputRef.current.value = "";
      return;
    }

    performUpload(file, filterExamType, filterSubject);
  }

  async function performUpload(file, examId, subjectId) {
    setUploading(true);
    setUploadReport(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("examTypeId", examId);
      fd.append("subjectId", subjectId);

      const data = await bulkUploadQuestions(fd);
      const report = data.report || data;
      setUploadReport({
        type: "result",
        fileName: file.name,
        summary: report.summary || { insertedCount: 0, skippedCount: 0, invalidCount: 0 },
        validationErrors: report.validationErrors || [],
        duplicateRows: report.duplicateRows || []
      });
      setShowUploadModal(true);
      setPendingFile(null);
      loadQuestions();
    } catch (err) {
      const errorData = err?.response?.data?.error || err?.response?.data;
      setUploadReport({
        type: "error",
        title: "Upload Failed",
        message: errorData?.message || "An unexpected error occurred during the CSV upload.",
        details: errorData?.details || null,
        code: errorData?.code
      });
      setShowUploadModal(true);
    } finally {
      setUploading(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  useEffect(() => {
    async function loadModalSubjects() {
      if (!modalSelections.examTypeId) {
        setModalSubjects([]);
        return;
      }
      try {
        const data = await fetchSubjects(modalSelections.examTypeId);
        setModalSubjects(data.subjects || []);
      } catch { }
    }
    if (showUploadModal && uploadReport?.type === "configure") {
      loadModalSubjects();
    }
  }, [modalSelections.examTypeId, showUploadModal, uploadReport?.type]);

  function handleDownloadTemplate() {
    const headers = "questionText,optionA,optionB,optionC,optionD,correctOption,topic,difficulty,explanation,language,marks,negativeMarks\n";
    const sample = '"What is the capital of India?","Mumbai","Pune","New Delhi","Nagpur","C","GK","easy","New Delhi is the capital of India.","en",1,0\n';
    const blob = new Blob([headers + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exam_questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="admin-page animate-in fade-in duration-500">
      {/* Upload Status Modal */}
      {showUploadModal && uploadReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-card w-full max-w-xl rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-300 relative my-8">
            <div className="p-6 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  uploadReport.type === "instruction" || uploadReport.type === "configure" ? "bg-warning/15 text-warning" :
                    uploadReport.type === "error" ? "bg-destructive/15 text-destructive" :
                      "bg-primary/15 text-primary"
                )}>
                  {uploadReport.type === "error" ? <X size={24} /> : uploadReport.type === "configure" || uploadReport.type === "instruction" ? <AlertCircle size={24} /> : <Upload size={24} />}
                </div>
                <div>
                  <h2 className="font-bold text-xl tracking-tight text-foreground">
                    {uploadReport.type === "configure" ? uploadReport.title :
                      uploadReport.type === "error" ? uploadReport.title :
                        uploadReport.type === "instruction" ? uploadReport.title : "Bulk Upload Results"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadReport.type === "configure" || uploadReport.type === "error" ? "System action required" : uploadReport.fileName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
              {uploadReport.type === "configure" ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-soft">
                      <FileQuestion size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">File to upload</div>
                      <div className="text-sm font-bold text-foreground truncate max-w-[300px]">{uploadReport.fileName}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">Target Exam Type *</label>
                      <select
                        className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
                        value={modalSelections.examTypeId}
                        onChange={e => setModalSelections(prev => ({ ...prev, examTypeId: e.target.value, subjectId: "" }))}
                      >
                        <option value="">Select Exam</option>
                        {examTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">Target Subject *</label>
                      <select
                        className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none shadow-sm"
                        value={modalSelections.subjectId}
                        onChange={e => setModalSelections(prev => ({ ...prev, subjectId: e.target.value }))}
                        disabled={!modalSelections.examTypeId}
                      >
                        <option value="">Select Subject</option>
                        {modalSubjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-secondary/30 rounded-xl p-4 border border-border/60">
                    <p className="text-[0.7rem] text-muted-foreground font-medium leading-relaxed italic uppercase tracking-wider">
                      Note: Questions will be categorized under the selected Exam and Subject.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => performUpload(pendingFile, modalSelections.examTypeId, modalSelections.subjectId)}
                      disabled={!modalSelections.examTypeId || !modalSelections.subjectId || uploading}
                      className="group w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:shadow-soft active:scale-[0.99] transition-all"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" /> Processing Upload...
                        </>
                      ) : (
                        <>
                          Confirm & Start Import <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : uploadReport.type === "error" ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-4">
                    <AlertCircle size={20} className="shrink-0 mt-1" />
                    <div>
                      <div className="font-bold text-sm mb-1">{uploadReport.message}</div>
                      {uploadReport.code && <div className="text-[10px] uppercase font-black tracking-widest opacity-70">Error Code: {uploadReport.code}</div>}
                    </div>
                  </div>

                  {uploadReport.details?.missingHeaders && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Missing Required Columns:</h3>
                      <div className="flex flex-wrap gap-2">
                        {uploadReport.details.missingHeaders.map((h, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadReport.details?.received && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">File Format Received:</h3>
                      <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 text-xs font-mono text-destructive">
                        {uploadReport.details.received}
                      </div>
                    </div>
                  )}

                  <div className="bg-secondary/15 rounded-2xl p-5 border border-border/40">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">How to fix this:</h3>
                    <ul className="space-y-3">
                      <li className="text-xs font-medium text-foreground/80 flex gap-2">
                        <span className="text-primary">•</span>
                        <span>Ensure your CSV headers match the required names exactly.</span>
                      </li>
                      <li className="text-xs font-medium text-foreground/80 flex gap-2">
                        <span className="text-primary">•</span>
                        <span>Use the "Download Template" button below to get the correct structure.</span>
                      </li>
                      <li className="text-xs font-medium text-foreground/80 flex gap-2">
                        <span className="text-primary">•</span>
                        <span>Make sure you are uploading a <strong>valid .CSV</strong> file, not an Excel (.xlsx) file.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : uploadReport.type === "instruction" ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                    {uploadReport.message}
                  </p>
                  <div className="bg-secondary/20 rounded-2xl p-5 border border-border/50">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Steps to fix:</h3>
                    <ul className="space-y-2.5">
                      {uploadReport.tips.map((tip, i) => (
                        <li key={i} className="flex gap-3 text-sm font-medium">
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:shadow-pop transition-all"
                    >
                      Got it, thanks!
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-success/10 border border-success/20 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-display font-black text-success tabular-nums">{uploadReport.summary.insertedCount}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-success/70 mt-1">Added</div>
                    </div>
                    <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-display font-black text-warning-foreground tabular-nums">{uploadReport.summary.skippedCount}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-warning-foreground/70 mt-1">Skipped</div>
                    </div>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-display font-black text-destructive tabular-nums">{uploadReport.summary.invalidCount}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-destructive/70 mt-1">Invalid</div>
                    </div>
                  </div>

                  {/* Skipped / Duplicates */}
                  {uploadReport.summary.skippedCount > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <RefreshCw size={14} className="text-warning" />
                        Skipped Duplicates ({uploadReport.summary.skippedCount})
                      </h3>
                      <div className="p-4 rounded-2xl bg-warning/5 border border-warning/10">
                        <p className="text-xs font-medium text-warning-foreground leading-relaxed">
                          These rows were skipped because they already exist in your question bank (duplicate content) or are repeated in the file.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {uploadReport.validationErrors.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <AlertCircle size={14} className="text-destructive" />
                        Critical Problems ({uploadReport.validationErrors.length})
                      </h3>
                      <div className="space-y-2">
                        {uploadReport.validationErrors.slice(0, 10).map((err, i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10 items-start">
                            <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 uppercase tabular">Row {err.rowNumber}</span>
                            <span className="text-xs font-medium leading-normal text-foreground/80">{err.reason}</span>
                          </div>
                        ))}
                        {uploadReport.validationErrors.length > 10 && (
                          <div className="text-xs text-center text-muted-foreground py-2 italic">
                            ...and {uploadReport.validationErrors.length - 10} more errors. Please check your CSV format.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Guide / Tips */}
                  <div className="bg-secondary/15 rounded-2xl p-5 border border-border/40">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <BookOpen size={14} className="text-primary" />
                        CSV Structure Guide
                      </h3>
                      <button
                        onClick={handleDownloadTemplate}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg"
                      >
                        <Database size={10} /> Download Template
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Required Columns</span>
                          <p className="text-xs font-medium">Question, OptionA, OptionB, OptionC, OptionD, CorrectOption, Topic, Difficulty</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Correct Option</span>
                          <p className="text-xs font-medium">Must be A, B, C, or D (or 1, 2, 3, 4)</p>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <p className="text-xs font-medium text-foreground/70">• Question text must be at least 5 characters long.</p>
                        <p className="text-xs font-medium text-foreground/70">• Difficulty must be easy, medium, or hard.</p>
                        <p className="text-xs font-medium text-foreground/70">• Topic should match one of: Law, GK, Reasoning, Maths.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-secondary/15 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 h-11 rounded-xl border border-border bg-card font-bold text-sm hover:bg-secondary transition-all"
              >
                Close Window
              </button>
              {(uploadReport.type === "result" || uploadReport.type === "error") && (
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    csvInputRef.current?.click();
                  }}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:shadow-pop transition-all flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> NEW UPLOAD
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileQuestion className="text-primary" size={24} />
            Question Bank
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and organize your examination questions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-sm transition-all border border-border shadow-soft"
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            Bulk Upload
          </button>
          <input type="file" ref={csvInputRef} className="hidden" accept=".csv,.json" onChange={handleCsvUpload} />

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:shadow-pop transition-all"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Close Form" : "Add Question"}
          </button>
        </div>
      </div>

      {/* Topic Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {["Law", "GK", "Reasoning", "Maths"].map((t) => (
          <button
            key={t}
            onClick={() => setTopic(topic === t ? "" : t)}
            className={cn(
              "admin-card p-5 text-left transition-all hover:border-primary/50",
              topic === t ? "ring-2 ring-primary bg-primary/5 border-primary/20" : "hover:shadow-soft"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", TOPIC_COLORS[t] || "bg-muted")}>
                <BookOpen size={18} />
              </div>
              {topic === t && <CheckCircle2 size={16} className="text-primary" />}
            </div>
            <div className="text-2xl font-bold tabular-nums">{topicStats[t] || 0}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{t}</div>
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

      <div className="admin-card overflow-hidden">
        <div className="p-5 border-b border-border/40 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-secondary/15">
          <div className="font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Search size={18} />
            </div>
            <span className="text-lg">Database Inventory</span>
            <span className="text-xs font-medium text-muted-foreground ml-1">({filtered.length} total)</span>
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

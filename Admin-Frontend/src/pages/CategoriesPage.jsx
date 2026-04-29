import { useEffect, useState, useCallback } from "react";
import { fetchExamTypes, createExamType, fetchSubjects, createSubject } from "../services/apiClient";
import { FolderOpen, Plus, BookOpen, Clock, Trash2, RefreshCw, X, AlertCircle, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { cn } from "../lib/utils";

export default function CategoriesPage() {
  const [examTypes, setExamTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creatingType, setCreatingType] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [toast, setToast] = useState(null);

  const [newTypeName, setNewTypeName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchExamTypes();
      setExamTypes(data.examTypes || []);
    } catch {
      showToast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async (typeId) => {
    try {
      const data = await fetchSubjects(typeId);
      setSubjects(data.subjects || []);
    } catch {
      showToast("Failed to load subjects", "error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedType) {
      loadSubjects(selectedType._id);
    } else {
      setSubjects([]);
    }
  }, [selectedType, loadSubjects]);

  const handleCreateType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setCreatingType(true);
    try {
      await createExamType({ name: newTypeName.trim() });
      setNewTypeName("");
      showToast("Exam Type created!");
      loadData();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to create exam type", "error");
    } finally {
      setCreatingType(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !selectedType) return;
    setCreatingSubject(true);
    try {
      await createSubject({ name: newSubjectName.trim(), examTypeId: selectedType._id });
      setNewSubjectName("");
      showToast("Subject added!");
      loadSubjects(selectedType._id);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to add subject", "error");
    } finally {
      setCreatingSubject(false);
    }
  };

  return (
    <div className="admin-page">
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
          <h1 className="admin-page-title">Exam Categories & Subjects</h1>
          <p className="admin-page-subtitle">Organize your exams and link subjects to them</p>
        </div>
        <div className="admin-action-row">
          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition-all" onClick={loadData}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Exam Types */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="admin-card">
            <div className="p-5 border-b border-border bg-primary/5 flex items-center justify-between">
              <div className="font-display font-bold flex items-center gap-2.5">
                <FolderOpen size={18} className="text-primary" />
                Exam Types
              </div>
            </div>
            
            <div className="p-5">
              <form onSubmit={handleCreateType} className="flex gap-2 mb-6">
                <input 
                  className="flex-1 px-4 py-2 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                  placeholder="e.g. MPSC 2026"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  required
                />
                <button 
                  type="submit" 
                  disabled={creatingType}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-soft hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {creatingType ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                </button>
              </form>

              <div className="flex flex-col gap-2">
                {examTypes.map(type => (
                  <button
                    key={type._id}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                      selectedType?._id === type._id 
                        ? "bg-primary/10 border-primary text-primary shadow-soft" 
                        : "bg-card border-border hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        selectedType?._id === type._id ? "bg-primary text-white" : "bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      )}>
                        <FolderOpen size={16} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">{type.name}</div>
                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">{type.slug}</div>
                      </div>
                    </div>
                    {selectedType?._id === type._id && <ChevronRight size={16} />}
                  </button>
                ))}
                {examTypes.length === 0 && !loading && (
                  <div className="py-10 text-center text-muted-foreground">
                    <FolderOpen size={32} className="mx-auto mb-3 opacity-20" />
                    <div className="text-sm font-bold">No exam types found</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Subjects */}
        <div className="lg:col-span-7">
          <div className="admin-card min-h-[400px]">
            <div className="p-5 border-b border-border bg-accent/5 flex items-center justify-between">
              <div className="font-display font-bold flex items-center gap-2.5">
                <BookOpen size={18} className="text-accent-foreground" />
                Subjects {selectedType && <span className="text-muted-foreground font-medium ml-1">in {selectedType.name}</span>}
              </div>
            </div>

            <div className="p-6">
              {!selectedType ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mb-4">
                    <FolderOpen size={28} className="text-muted-foreground/30" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Select an Exam Type</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">Pick an exam category from the left to view and manage its subjects</p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleCreateSubject} className="flex gap-2 mb-8">
                    <input 
                      className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                      placeholder={`New subject name for ${selectedType.name}`}
                      value={newSubjectName}
                      onChange={e => setNewSubjectName(e.target.value)}
                      required
                    />
                    <button 
                      type="submit" 
                      disabled={creatingSubject}
                      className="px-6 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm shadow-soft hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                      {creatingSubject ? "Adding..." : "Add Subject"}
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {subjects.map(subject => (
                      <div key={subject._id} className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between group hover:shadow-soft transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent-foreground flex items-center justify-center">
                            <BookOpen size={16} />
                          </div>
                          <div className="font-bold text-sm tracking-tight">{subject.name}</div>
                        </div>
                        <button className="p-2 rounded-lg text-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {subjects.length === 0 && (
                      <div className="col-span-2 py-12 text-center border-2 border-dashed border-border rounded-3xl">
                        <BookOpen size={32} className="mx-auto mb-3 opacity-10" />
                        <div className="text-sm font-bold text-muted-foreground">No subjects added yet</div>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add subjects like Marathi, GK, or Mathematics</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-10 p-5 rounded-2xl bg-info/5 border border-info/10">
                    <div className="flex gap-3">
                      <Zap size={18} className="text-info mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-info-foreground mb-1">Question Linking</div>
                        <p className="text-xs text-info-foreground/70 leading-relaxed">
                          Questions added under these subjects will be strictly locked to <strong>{selectedType.name}</strong>. They won't appear in other exam categories.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

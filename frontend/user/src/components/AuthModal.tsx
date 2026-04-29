import { useEffect, useState } from "react";
import { AlertCircle, X, Loader2, User, Phone, MapPin, GraduationCap, ChevronRight, Check } from "lucide-react";
import { loginWithGoogle } from "@/lib/authService";
import { getApiError, fetchExamTypes, updateProfile } from "@/services/api";
import { cn } from "@/lib/utils";

const DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
];

const CATEGORIES = ["Open", "OBC", "SC", "ST", "VJ/NT", "SBC", "EWS"];

export function AuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (user: { uid: string; name: string; email: string }) => void;
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    phone: "",
    district: "",
    gender: "",
    targetExamTypeId: "",
    category: "",
    education: ""
  });

  useEffect(() => {
    if (step === 2) {
      void loadExamTypes();
    }
  }, [step]);

  async function loadExamTypes() {
    try {
      const data = await fetchExamTypes();
      setExamTypes(data.examTypes || []);
    } catch { /* focus on UI for now */ }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    try {
      const userData = await loginWithGoogle();
      if (!userData) return;
      setUser(userData);
      setStep(2); // Move to Step 2
    } catch (error) {
      const apiError = getApiError(error, "Google login failed. Please try again.");
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalizeRegistration() {
    const { phone, district, gender, targetExamTypeId, category, education } = formData;
    if (!phone || !district || !gender || !targetExamTypeId || !category || !education) {
      setError("Please fill in all required fields.");
      return;
    }

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await updateProfile(formData);
      onSuccess(user);
    } catch (error) {
      const apiError = getApiError(error, "Failed to save profile. Please try again.");
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className={cn(
        "relative w-full rounded-[2.5rem] border border-border bg-card p-8 shadow-pop transition-all duration-500",
        step === 1 ? "max-w-sm animate-slide-up" : "max-w-2xl animate-scale-in"
      )}>
        
        <button onClick={onClose} className="absolute right-6 top-6 p-2 rounded-full hover:bg-secondary text-muted-foreground transition-all">
          <X size={20} />
        </button>

        {step === 1 ? (
          <div className="space-y-6 pt-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                <User size={32} className="text-primary" />
              </div>
              <h2 className="text-3xl font-black font-display tracking-tight text-foreground">Welcome to Battleground</h2>
              <p className="text-muted-foreground mt-2 font-medium">
                Your journey to the top of the leaderboard starts here.
              </p>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive animate-headshake">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="group relative w-full flex h-[60px] items-center justify-center gap-3 rounded-2xl bg-accent px-4 py-3 text-lg font-black text-accent-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-soft overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {loading ? <Loader2 size={24} className="animate-spin" /> : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground px-4 uppercase tracking-widest font-bold opacity-50">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-6 pb-6 border-b border-border">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                <Check size={28} className="text-success" />
              </div>
              <div>
                <h2 className="text-2xl font-black font-display tracking-tight">One Last Step, {user?.name.split(' ')[0]}!</h2>
                <p className="text-sm text-muted-foreground font-medium">Please complete your student profile to get personalized exams.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <Phone size={12} className="text-primary" /> Mobile Number
                </label>
                <input 
                  type="tel" 
                  placeholder="10-digit mobile" 
                  className="w-full h-[54px] rounded-2xl border border-border bg-background px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Gender</label>
                <div className="flex gap-2">
                  {["Male", "Female", "Other"].map(g => (
                    <button
                      key={g}
                      onClick={() => setFormData({...formData, gender: g})}
                      className={cn(
                        "flex-1 h-[54px] rounded-2xl border text-sm font-bold transition-all",
                        formData.gender === g ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-background border-border hover:border-primary/50"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* District */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-primary" /> District
                </label>
                <select 
                  className="w-full h-[54px] rounded-2xl border border-border bg-background px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none"
                  value={formData.district}
                  onChange={e => setFormData({...formData, district: e.target.value})}
                >
                  <option value="">Select District</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Target Exam */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                  <GraduationCap size={12} className="text-primary" /> Target Exam
                </label>
                <select 
                  className="w-full h-[54px] rounded-2xl border border-border bg-background px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none"
                  value={formData.targetExamTypeId}
                  onChange={e => setFormData({...formData, targetExamTypeId: e.target.value})}
                >
                  <option value="">Select Exam</option>
                  {examTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Reservation Category</label>
                <select 
                  className="w-full h-[54px] rounded-2xl border border-border bg-background px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Education */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Education</label>
                <select 
                  className="w-full h-[54px] rounded-2xl border border-border bg-background px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none"
                  value={formData.education}
                  onChange={e => setFormData({...formData, education: e.target.value})}
                >
                  <option value="">Select Highest Education</option>
                  <option value="10th Pass">10th Pass</option>
                  <option value="12th Pass">12th Pass</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Post Graduate">Post Graduate</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive animate-headshake">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <button
              onClick={handleFinalizeRegistration}
              disabled={loading}
              className="group w-full flex h-[60px] items-center justify-center gap-3 rounded-2xl bg-primary px-4 py-3 text-lg font-black text-primary-foreground hover:shadow-pop hover:brightness-110 active:scale-[0.98] transition-all shadow-soft"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : (
                <>
                  Complete Registration <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}


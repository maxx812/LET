import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../services/apiClient";
import { Zap, Mail, Lock, ArrowRight, AlertCircle, Shield, CheckCircle2 } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginAdmin({ email, password });
      if (data.user?.role !== "admin") {
        setError("Access denied. Admin role required.");
        setLoading(false);
        return;
      }
      localStorage.setItem("admin_token", data.accessToken);
      localStorage.setItem("admin_user", JSON.stringify(data.user));
      setSuccess(true);
      setTimeout(() => {
        onLogin(data.user);
        navigate("/");
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check credentials.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-hero relative overflow-hidden px-4">
      {/* Decorative blobs */}
      <div className="absolute top-[-8rem] right-[-4rem] w-[26rem] h-[26rem] rounded-full bg-accent/20 blur-[60px] animate-pulse-accent" />
      <div className="absolute bottom-[-8rem] left-[-4rem] w-[26rem] h-[26rem] rounded-full bg-primary/20 blur-[60px] animate-float" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-[26rem] animate-slide-up z-10">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent shadow-glow text-accent-foreground mb-4 transform transition-transform hover:scale-105 duration-300">
            <Zap size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-display text-3xl font-extrabold text-foreground tracking-tight">
            ExamStrike <span className="text-primary">Admin</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">
            Secure access to the control center
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-[1.5rem] p-8 shadow-pop border border-border/50 relative overflow-hidden backdrop-blur-xl">
          {/* subtle header glow inside card */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-accent rounded-b-full"></div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={18} />
                <span>Authentication successful...</span>
              </div>
            )}

            <div className="space-y-2 text-left">
              <label className="text-sm font-semibold text-foreground/80 block">Email Address</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors duration-300" />
                <input
                  className="w-full bg-input/50 border border-border/50 rounded-xl py-3 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-300"
                  type="email"
                  placeholder="admin@examstrike.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-sm font-semibold text-foreground/80 block">Password</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors duration-300" />
                <input
                  className="w-full bg-input/50 border border-border/50 rounded-xl py-3 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-300"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="group w-full flex items-center justify-center gap-2 bg-gradient-accent text-accent-foreground font-bold py-3.5 rounded-xl shadow-glow hover:scale-[1.02] hover:shadow-pop transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100 disabled:shadow-none"
              disabled={loading || success}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : success ? (
                "Redirecting..."
              ) : (
                <>Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground/80 bg-secondary/30 rounded-lg p-2.5">
            <Shield size={14} className="text-primary" />
            <span>Admin access only. Secured via ExamStrike Core.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

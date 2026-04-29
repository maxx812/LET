import { Swords, Play, Trophy, Users, Award, Ticket, CheckSquare, Save, Settings2, Crown, Clock, Target, ArrowRight, Sparkles, Gift } from "lucide-react";
import { cn } from "../lib/utils";

const PRIZES = [
  { rank: "1st", prize: "₹25,000", icon: Crown, color: "bg-gradient-accent text-accent-foreground shadow-glow" },
  { rank: "2nd", prize: "₹15,000", icon: Award, color: "bg-primary/12 text-primary" },
  { rank: "3rd", prize: "₹10,000", icon: Trophy, color: "bg-info/12 text-info" },
];

export default function TournamentPage() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Tournament Factory</h1>
          <p className="admin-page-subtitle">Orchestrate large-scale events and assign prize pools</p>
        </div>
        <div className="admin-action-row">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto">
            <Save size={14} /> Save Draft
          </button>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop hover:scale-[1.02] active:scale-[0.98] sm:w-auto">
            <Play size={14} /> Go Live
          </button>
        </div>
      </div>

      {/* Prize Pool Banner */}
      <div className="bg-gradient-primary text-primary-foreground rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-pop">
        <div className="absolute w-[16rem] h-[16rem] rounded-full bg-accent/20 blur-[50px] -top-12 -right-12 pointer-events-none animate-float" />
        <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={18} className="text-accent" />
            <span className="text-[0.6875rem] uppercase tracking-[0.2em] font-bold opacity-80">Prize Distribution</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRIZES.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.rank} className="bg-primary-foreground/8 backdrop-blur-sm rounded-2xl p-5 border border-primary-foreground/10 transition-all hover:bg-primary-foreground/12 hover:-translate-y-1">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3", p.color)}>
                    <Icon size={20} />
                  </div>
                  <div className="text-[0.625rem] uppercase tracking-[0.2em] font-bold opacity-60 mb-1">{p.rank} Place</div>
                  <div className="font-display text-2xl font-black">{p.prize}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        
        {/* Left config */}
        <div className="flex flex-col gap-6">
          
          <div className="admin-card">
            <div className="p-5 border-b border-border bg-primary/5">
              <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Settings2 size={16} className="text-primary" />
                </div>
                Core Config
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Tournament Series</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium" placeholder="e.g. UPSC May Sprint" />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Prize Pool (₹)</label>
                <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium" placeholder="50,000" />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Participation Cost</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer">
                  <option>Free Entry</option>
                  <option>Premium Only</option>
                  <option>100 Coins</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Max Players</label>
                  <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium" defaultValue={1024} />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Rounds</label>
                  <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium" defaultValue={3} />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div className="p-5 border-b border-border bg-accent/5">
              <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-accent/12 flex items-center justify-center">
                  <CheckSquare size={16} className="text-accent-foreground" />
                </div>
                Eligibility
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-3">
                {[
                  { label: "Min. Profile Level 5", checked: true },
                  { label: "Account older than 30 days", checked: false },
                  { label: "Phone Verified", checked: true },
                  { label: "Email Verified", checked: true },
                  { label: "Completed 3+ Exams", checked: false },
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-3 text-sm font-medium hover:bg-secondary/40 px-3 py-2.5 rounded-xl cursor-pointer transition-all group">
                    <input type="checkbox" className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary/20 cursor-pointer accent-primary" defaultChecked={item.checked} />
                    <span className="group-hover:text-foreground transition-colors">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview */}
        <div className="admin-card h-full flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
            <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                <Swords size={16} className="text-foreground" />
              </div>
              Live Bracket Setup
            </div>
            <span className="admin-chip bg-primary/10 text-primary border border-primary/15">
              <Users size={12} /> max 1024 cap
            </span>
          </div>
          <div className="p-8 flex-1 flex justify-center items-center">
            <div className="text-center w-full max-w-md">
              <div className="relative mx-auto mb-6 w-20 h-20">
                <div className="w-20 h-20 rounded-3xl bg-gradient-accent flex items-center justify-center shadow-glow animate-float">
                  <Trophy size={32} className="text-accent-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success text-success-foreground flex items-center justify-center text-[0.5rem] font-black border-2 border-card">
                  <Sparkles size={10} />
                </div>
              </div>
              <div className="font-display text-2xl font-extrabold mb-2 tracking-tight">
                Generative Bracket Standby
              </div>
              <p className="text-sm text-muted-foreground font-medium max-w-[320px] mx-auto leading-relaxed">
                The elimination tree will be generated once registration closes and participants are locked in.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-pop transition-all">
                  <Target size={14} /> Preview Bracket
                </button>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-card border border-border text-foreground hover:bg-secondary transition-all">
                  <Clock size={14} /> Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

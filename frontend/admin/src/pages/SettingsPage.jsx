import { Settings, Save, Server, Shield, Calculator, Moon, ExternalLink, ShieldAlert, Cpu, Bell, Globe, Palette, Key, Lock, Eye, EyeOff, ToggleLeft, ToggleRight, Zap, RefreshCw, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useEffect, useCallback } from "react";
import { fetchSettings, saveSettings as saveSettingsApi } from "../services/apiClient";

function ToggleSwitch({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-secondary/30 transition-all cursor-pointer group" onClick={() => onChange(!value)}>
      <div className="flex-1 min-w-0 mr-4">
        <div className="font-semibold text-sm group-hover:text-foreground transition-colors">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className={cn(
        "w-11 h-6 rounded-full flex items-center px-0.5 transition-all cursor-pointer shrink-0",
        value ? "bg-success" : "bg-muted"
      )}>
        <div className={cn(
          "w-5 h-5 rounded-full bg-white shadow-soft transition-transform",
          value ? "translate-x-5" : "translate-x-0"
        )} />
      </div>
    </div>
  );
}

function SettingCard({ icon: Icon, title, color, children }) {
  return (
    <div className="admin-card">
      <div className={cn("p-5 border-b border-border", color)}>
        <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
            color?.includes("destructive") ? "bg-destructive/15 text-destructive" :
              color?.includes("accent") ? "bg-accent/12 text-accent-foreground" :
                color?.includes("primary") ? "bg-primary/15 text-primary" :
                  color?.includes("info") ? "bg-info/15 text-info" :
                    "bg-secondary text-foreground"
          )}>
            <Icon size={16} />
          </div>
          {title}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const DEFAULT_STATE = {
  scoring: {
    basePointsPerQuestion: 10,
    speedMultiplier: 15,
    penaltyPerMistake: -2,
    passThreshold: 40
  },
  security: {
    secureBrowserLock: true,
    ipRateLimiting: true,
    webcamMonitoring: false,
    tabSwitchDetection: true,
    copyPasteProtection: true
  },
  notifications: {
    emailAlerts: true,
    smsNotifications: false,
    pushNotifications: true
  },
  socket: {
    heartbeatMs: 3000,
    leaderboardTickMs: 2500
  },
  appearance: {
    themeMode: "system",
    compactMode: false
  }
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [dirty, setDirty] = useState(false);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSettings();
      const s = data.settings || data;
      setSettings(prev => ({ ...prev, ...s }));
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function updateSection(section, key, value) {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await saveSettingsApi(settings);
      const s = data.settings || data;
      setSettings(prev => ({ ...prev, ...s }));
      setDirty(false);
      showToast("Settings saved successfully!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

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
          <h1 className="admin-page-title">System Settings</h1>
          <p className="admin-page-subtitle">Manage global configuration, security, and game rules</p>
        </div>
        <div className="admin-action-row">
          {dirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-warning-foreground bg-warning/15 px-3 py-1.5 rounded-xl border border-warning/20">
              Unsaved changes
            </span>
          )}
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto"
            onClick={loadSettings}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Reload
          </button>
          <button
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop hover:scale-[1.02] active:scale-[0.98] sm:w-auto disabled:opacity-50",
              dirty ? "bg-primary text-primary-foreground" : "bg-primary/60 text-primary-foreground/70"
            )}
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            <Save size={16} /> {saving ? "Saving…" : "Save All Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column */}
        <div className="flex flex-col gap-6">

          <SettingCard icon={Calculator} title="Scoring & Grading" color="bg-accent/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Base Points Per Q", key: "basePointsPerQuestion" },
                { label: "Speed Multiplier (%)", key: "speedMultiplier" },
                { label: "Penalty Per Mistake", key: "penaltyPerMistake" },
                { label: "Pass Threshold (%)", key: "passThreshold" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">{f.label}</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium tabular-nums"
                    value={settings.scoring[f.key]}
                    onChange={e => updateSection("scoring", f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </SettingCard>

          <SettingCard icon={Shield} title="Security & Anti-Cheat" color="bg-primary/5">
            <div className="flex flex-col -mx-4">
              <ToggleSwitch label="Secure Browser Lock" description="Force fullscreen mode during exam" value={settings.security.secureBrowserLock} onChange={v => updateSection("security", "secureBrowserLock", v)} />
              <ToggleSwitch label="IP Rate Limiting" description="DDoS protection via cloudflare" value={settings.security.ipRateLimiting} onChange={v => updateSection("security", "ipRateLimiting", v)} />
              <ToggleSwitch label="WebCam Monitoring" description="Requires Pro License" value={settings.security.webcamMonitoring} onChange={v => updateSection("security", "webcamMonitoring", v)} />
              <ToggleSwitch label="Tab Switch Detection" description="Flag students who leave the exam tab" value={settings.security.tabSwitchDetection} onChange={v => updateSection("security", "tabSwitchDetection", v)} />
              <ToggleSwitch label="Copy/Paste Protection" description="Disable clipboard during exam" value={settings.security.copyPasteProtection} onChange={v => updateSection("security", "copyPasteProtection", v)} />
            </div>
          </SettingCard>

          <SettingCard icon={Bell} title="Notifications" color="bg-info/5">
            <div className="flex flex-col -mx-4">
              <ToggleSwitch label="Email Alerts" description="Notify admins for critical events" value={settings.notifications.emailAlerts} onChange={v => updateSection("notifications", "emailAlerts", v)} />
              <ToggleSwitch label="SMS Notifications" description="Send SMS for exam start/end" value={settings.notifications.smsNotifications} onChange={v => updateSection("notifications", "smsNotifications", v)} />
              <ToggleSwitch label="Push Notifications" description="Browser push for live events" value={settings.notifications.pushNotifications} onChange={v => updateSection("notifications", "pushNotifications", v)} />
            </div>
          </SettingCard>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">

          <SettingCard icon={Cpu} title="Socket & Live Server" color="bg-destructive/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Heartbeat (ms)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium tabular-nums"
                  value={settings.socket.heartbeatMs}
                  onChange={e => updateSection("socket", "heartbeatMs", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">Leaderboard Tick (ms)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium tabular-nums"
                  value={settings.socket.leaderboardTickMs}
                  onChange={e => updateSection("socket", "leaderboardTickMs", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/5 border border-success/15 mb-5">
              <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shrink-0" />
              <span className="text-sm font-bold text-success">Socket Server Online — 24ms latency</span>
            </div>
            <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border-2 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all hover:shadow-pop">
              <ShieldAlert size={16} /> Emergency: Disconnect All Users
            </button>
          </SettingCard>

          <SettingCard icon={Palette} title="Appearance" color="">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <div className="font-bold text-sm">Theme Mode</div>
                  <div className="text-muted-foreground text-xs font-medium mt-0.5">Dashboard color scheme</div>
                </div>
                <select
                  className="px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-medium appearance-none cursor-pointer min-w-[150px]"
                  value={settings.appearance.themeMode}
                  onChange={e => updateSection("appearance", "themeMode", e.target.value)}
                >
                  <option value="system">System Default</option>
                  <option value="dark">Always Dark</option>
                  <option value="light">Always Light</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                <div>
                  <div className="font-bold text-sm">Compact Mode</div>
                  <div className="text-muted-foreground text-xs font-medium mt-0.5">Reduce spacing for more data</div>
                </div>
                <div
                  className={cn("w-11 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-all", settings.appearance.compactMode ? "bg-success" : "bg-muted")}
                  onClick={() => updateSection("appearance", "compactMode", !settings.appearance.compactMode)}
                >
                  <div className={cn("w-5 h-5 rounded-full bg-white shadow-soft transition-transform", settings.appearance.compactMode ? "translate-x-5" : "translate-x-0")} />
                </div>
              </div>
            </div>
          </SettingCard>

          <SettingCard icon={Key} title="API & Integrations" color="bg-accent/5">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">API Base URL</label>
                <div className="flex items-center gap-2">
                  <input className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all font-mono text-muted-foreground" value={import.meta.env.VITE_API_BASE_URL || "/api"} readOnly />
                  <button className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-all shrink-0">
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest mb-2">JWT Secret</label>
                <div className="flex items-center gap-2">
                  <input type="password" className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none font-mono" value="••••••••••••••••" readOnly />
                  <button className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-all shrink-0">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
}

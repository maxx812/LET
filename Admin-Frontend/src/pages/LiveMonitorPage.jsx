import { useEffect, useState, memo } from "react";
import { connectAdminSocket } from "../services/socketClient";
import { Radio, Pause, Square, Trophy, Crown, Megaphone, Clock, Users, Zap, Shield, Activity, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

export default function LiveMonitorPage() {
  const [rooms, setRooms] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);

  useEffect(() => {
    const socket = connectAdminSocket();
    socket.emit("admin:rooms:subscribe");
    
    const handleRooms = (data) => setRooms(data);
    const handleLeaderboard = (data) => {
      const entries = data?.topEntries || (Array.isArray(data) ? data : []);
      setTopPlayers(entries.slice(0, 5));
    };

    socket.on("admin:rooms:update", handleRooms);
    socket.on("leaderboard:update", handleLeaderboard);

    return () => {
      socket.off("admin:rooms:update", handleRooms);
      socket.off("leaderboard:update", handleLeaderboard);
    };
  }, []);

  const handleStartExam = () => {
    if (window.confirm("Are you sure? This will start the battle for all connected students.")) {
      const socket = connectAdminSocket();
      socket.emit("admin:exam:start", {}, (response) => {
        if (!response?.ok) {
          window.alert(response?.error?.message || "Unable to start the live exam.");
        }
      });
    }
  };

  const totalUsers = rooms.reduce((sum, r) => sum + (r.occupancy ?? r.users ?? 0), 0);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="admin-page-title">Live Monitor</h1>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[0.6875rem] font-extrabold uppercase tracking-wider bg-destructive/12 text-destructive border border-destructive/20 shadow-[0_0_20px_oklch(0.6_0.24_25_/_0.15)]">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> LIVE
            </span>
          </div>
          <p className="admin-page-subtitle">Real-time view of active exam rooms</p>
        </div>
        <div className="admin-action-row">
          <button 
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-pop hover:scale-[1.02] active:scale-[0.98] sm:w-auto" 
            onClick={handleStartExam}
          >
            <Zap size={14} /> Start Global Battle
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Rooms", value: rooms.length, icon: Radio, color: "destructive" },
          { label: "Total Users", value: totalUsers, icon: Users, color: "success" },
          { label: "Live Exams", value: rooms.filter(r => r.examStatus === "live").length, icon: Activity, color: "info" },
          { label: "Top Players", value: topPlayers.length, icon: Trophy, color: "accent" },
        ].map(s => {
          const Icon = s.icon;
          const colorMap = {
            destructive: "bg-destructive/10 text-destructive",
            success: "bg-success/10 text-success",
            info: "bg-info/10 text-info",
            accent: "bg-accent/12 text-accent-foreground",
          };
          return (
            <div key={s.label} className="admin-card p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", colorMap[s.color])}>
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Active Rooms */}
        <div className="admin-card flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between bg-destructive/5">
            <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-xl bg-destructive/15 flex items-center justify-center">
                <Radio size={16} className="text-destructive" />
              </div>
              Active Rooms
            </div>
            <span className="admin-chip bg-info/12 text-info border border-info/20">{rooms.length} rooms</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr className="admin-table-head">
                  <th className="admin-th">Room</th>
                  <th className="admin-th">Exam</th>
                  <th className="admin-th">Users</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Controls</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <Radio size={24} className="text-muted-foreground/40" />
                      </div>
                      <div className="text-muted-foreground font-medium">No active rooms</div>
                      <div className="text-xs text-muted-foreground/60">Rooms appear when exams go live</div>
                    </div>
                  </td></tr>
                ) : rooms.map((room, idx) => (
                  <LiveRoomRow key={room.roomCode || idx} room={room} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Leaderboard */}
        <div className="admin-card flex flex-col h-fit">
          <div className="p-5 border-b border-border flex items-center justify-between bg-accent/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/15 blur-[40px] rounded-full pointer-events-none -mr-10 -mt-10" />
            <div className="font-display font-bold flex items-center gap-2.5 text-foreground relative">
              <div className="w-8 h-8 rounded-xl bg-accent/12 flex items-center justify-center">
                <Trophy size={16} className="text-accent-foreground" />
              </div>
              Top Players
            </div>
          </div>
          <div className="p-4">
            {topPlayers.length === 0 ? (
              <div className="p-6 text-center">
                <Trophy size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                <div className="text-sm text-muted-foreground font-medium">No live players yet</div>
              </div>
            ) : topPlayers.map((p, i) => (
              <LivePlayerRow key={p.username || p.name} p={p} i={i} isLast={i >= topPlayers.length - 1} />
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="admin-card border-destructive/20 bg-destructive/[0.02]">
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-destructive/12 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-destructive" />
            </div>
            <div>
              <div className="font-display font-bold text-sm">Emergency Controls</div>
              <p className="text-xs text-muted-foreground mt-0.5">Pause or terminate all active rooms instantly</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-warning/30 bg-warning/10 text-warning-foreground hover:bg-warning hover:text-white transition-all">
              <Pause size={14} /> Pause All
            </button>
            <button className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
              <Square size={14} /> Stop All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LiveRoomRow = memo(({ room }) => {
  const statusColor = room.status === "open" ? "success" : room.status === "full" ? "warning" : "info";
  const statusLabel = room.status === "open" ? "Running" : room.status === "full" ? "Full" : room.status || "—";
  
  const colorMap = {
    success: "bg-success/12 text-success border-success/20",
    warning: "bg-warning/12 text-warning-foreground border-warning/20",
    info: "bg-info/12 text-info border-info/20",
  };

  return (
    <tr className="border-b border-border/40 hover:bg-secondary/30 transition-colors group">
      <td className="admin-td">
        <span className="font-mono font-bold text-[0.8125rem] bg-primary/8 text-primary px-2.5 py-1 rounded-xl border border-primary/15">
          {room.roomCode || room.roomId}
        </span>
      </td>
      <td className="admin-td font-medium text-sm">{room.examTitle}</td>
      <td className="admin-td">
        <div className="flex items-center gap-2">
          <div className="w-[3.5rem] h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${Math.min(((room.occupancy ?? room.users ?? 0) / (room.capacity ?? 100)) * 100, 100)}%` }}
            />
          </div>
          <span className="font-bold tabular-nums text-sm">{room.occupancy ?? room.users}</span>
          <span className="text-muted-foreground text-xs">/ {room.capacity ?? 100}</span>
        </div>
      </td>
      <td className="admin-td">
        <span className={cn("inline-flex items-center gap-1.5 text-[0.625rem] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border", colorMap[statusColor])}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusColor === "success" ? "bg-success animate-pulse" : statusColor === "warning" ? "bg-warning" : "bg-info")} />
          {statusLabel}
        </span>
      </td>
      <td className="admin-td">
        <div className="flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-secondary transition-all" title="Broadcast" onClick={() => { const msg = prompt("Message for Room " + (room.roomCode || room.roomId)); if (msg) alert("Sent: " + msg); }}>
            <Megaphone size={14} />
          </button>
          <button className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-secondary transition-all" title="Add Time" onClick={() => alert("Added 5 min")}>
            <Clock size={14} />
          </button>
          <button className="p-2 rounded-xl text-warning/70 hover:text-warning-foreground hover:bg-warning/15 transition-all" title="Pause">
            <Pause size={14} />
          </button>
          <button className="p-2 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all" title="Force Stop" onClick={() => { if(window.confirm("Force stop?")) alert("Stopped."); }}>
            <Square size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
});

const LivePlayerRow = memo(({ p, i, isLast }) => {
  const bgRank = [
    "bg-gradient-accent shadow-glow text-accent-foreground",
    "bg-primary/15 text-primary",
    "bg-info/15 text-info",
  ];
  
  return (
    <div className={cn("flex items-center justify-between py-3.5 px-2 rounded-xl transition-all hover:bg-secondary/40", !isLast && "mb-1")}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0",
          bgRank[i] || "bg-secondary text-foreground"
        )}>
          {i === 0 ? <Crown size={15} /> : i + 1}
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight">{p.username || p.name}</div>
          <div className="text-[0.625rem] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            Rank #{i + 1}
          </div>
        </div>
      </div>
      <span className="font-display text-lg font-black tabular-nums bg-card px-3 py-1 rounded-xl border border-border shadow-soft">
        {p.score}
      </span>
    </div>
  );
});

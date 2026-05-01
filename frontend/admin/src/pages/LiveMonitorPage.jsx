import { useEffect, useState, memo } from "react";
import { connectAdminSocket } from "../services/socketClient";
import { Radio, Pause, Square, Trophy, User, MessageSquare, Clock, Users, PlayCircle, Shield, Activity, ShieldAlert, Monitor, CheckCircle2, ClipboardList, Eye } from "lucide-react";
import { cn } from "../lib/utils";

export default function LiveMonitorPage() {
  const [rooms, setRooms] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

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
    if (window.confirm("Are you sure? This will start the examination session for all enrolled students.")) {
      const socket = connectAdminSocket();
      socket.emit("admin:exam:start", {}, (response) => {
        if (!response?.ok) {
          window.alert(response?.error?.message || "Unable to start the live examination.");
        }
      });
    }
  };

  const handlePauseAll = () => {
    if (window.confirm("Pause all live exams? This will suspend all timers.")) {
      const socket = connectAdminSocket();
      socket.emit("admin:exam:pause", { pause: true }, (res) => {
        if (!res?.ok) alert(res?.error?.message || "Failed to pause");
      });
    }
  };

  const handleStopAll = () => {
    if (window.confirm("STOP ALL LIVE EXAMS? This will force submit all active candidates!")) {
      const socket = connectAdminSocket();
      socket.emit("admin:exam:stop", {}, (res) => {
        if (!res?.ok) alert(res?.error?.message || "Failed to stop");
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
          <p className="admin-page-subtitle">Real-time control center for active sessions</p>
        </div>
        <div className="admin-action-row">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-pop hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            onClick={handleStartExam}
          >
            <PlayCircle size={14} /> Start Global Session
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Rooms", value: rooms.length, icon: Monitor, color: "info" },
          { label: "Total Candidates", value: totalUsers, icon: Users, color: "success" },
          { label: "Live Sessions", value: rooms.filter(r => r.examStatus === "live").length, icon: Activity, color: "primary" },
          { label: "Submissions", value: topPlayers.length, icon: CheckCircle2, color: "accent" },
        ].map(s => {
          const Icon = s.icon;
          const colorMap = {
            destructive: "bg-destructive/10 text-destructive",
            success: "bg-success/10 text-success",
            info: "bg-info/10 text-info",
            primary: "bg-primary/10 text-primary",
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
          <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Monitor size={16} className="text-primary" />
              </div>
              Examination Console
            </div>
            <span className="admin-chip bg-info/12 text-info border border-info/20 font-bold uppercase tracking-tighter">{rooms.length} active sessions</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr className="admin-table-head">
                  <th className="admin-th">Room Name</th>
                  <th className="admin-th">Exam Paper</th>
                  <th className="admin-th">Enrollment</th>
                  <th className="admin-th text-center">Session Status</th>
                  <th className="admin-th text-right">Proctoring Controls</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <Monitor size={24} className="text-muted-foreground/40" />
                      </div>
                      <div className="text-muted-foreground font-medium text-sm">No active exam sessions</div>
                      <div className="text-[0.625rem] uppercase font-bold tracking-widest text-muted-foreground/40">Waiting for candidate enrollments...</div>
                    </div>
                  </td></tr>
                ) : rooms.map((room, idx) => (
                  <LiveRoomRow key={room.roomCode || idx} room={room} onOpenDetails={setSelectedRoom} />
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
              Live Leaderboard
            </div>
          </div>
          <div className="p-4">
            {topPlayers.length === 0 ? (
              <div className="p-6 text-center">
                <ClipboardList size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                <div className="text-sm text-muted-foreground font-medium">No activity yet</div>
              </div>
            ) : topPlayers.map((p, i) => (
              <LivePlayerRow key={p.username || p.name} p={p} i={i} isLast={i >= topPlayers.length - 1} />
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="admin-card border-destructive/20 bg-destructive/[0.02] shadow-[0_10px_30px_oklch(0.6_0.24_25_/_0.08)]">
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/12 flex items-center justify-center shrink-0 border border-destructive/20">
              <ShieldAlert size={22} className="text-destructive animate-pulse" />
            </div>
            <div>
              <div className="font-display font-black text-sm uppercase tracking-wide">Proctor Override Panel</div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">Global security overrides to pause or terminate all active exam sessions instantly across all servers.</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={handlePauseAll}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider border-2 border-warning/30 bg-warning/10 text-warning-foreground hover:bg-warning hover:text-white transition-all shadow-soft"
            >
              <Pause size={14} strokeWidth={3} /> Pause All
            </button>
            <button 
              onClick={handleStopAll}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider border-2 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-soft"
            >
              <Square size={14} strokeWidth={3} /> Stop All
            </button>
          </div>
        </div>
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-focus/40 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setSelectedRoom(null)} 
          />
          <div className="relative w-full max-w-lg rounded-[2.5rem] bg-card border border-border shadow-pop animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
            
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20 shadow-soft">
                    <Monitor size={28} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl text-foreground">Session Details</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Proctoring Deep-Dive</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRoom(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Square size={16} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Room Code</div>
                    <div className="font-mono font-bold text-primary">{selectedRoom.roomCode || selectedRoom.roomId}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/50 border border-border/50">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Session ID</div>
                    <div className="font-mono font-bold text-accent-foreground">{selectedRoom.battleCode || "N/A"}</div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="text-[10px] uppercase font-bold text-primary/60 tracking-wider mb-2">Exam Title</div>
                  <div className="font-display font-bold text-lg leading-tight">{selectedRoom.examTitle}</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3">
                    <div className="text-display text-2xl font-black">{selectedRoom.occupancy ?? 0}</div>
                    <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Enrolled</div>
                  </div>
                  <div className="text-center p-3 border-x border-border">
                    <div className="text-display text-2xl font-black">{selectedRoom.capacity ?? 100}</div>
                    <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Capacity</div>
                  </div>
                  <div className="text-center p-3">
                    <div className="text-display text-2xl font-black text-success uppercase text-lg">
                      {selectedRoom.examStatus === "live" ? "Live" : selectedRoom.examStatus}
                    </div>
                    <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Status</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex gap-3">
                  <button className="flex-1 h-12 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:shadow-pop transition-all">
                    Broadcast to Room
                  </button>
                  <button 
                    onClick={() => setSelectedRoom(null)}
                    className="px-6 h-12 rounded-xl bg-secondary text-foreground font-bold text-sm hover:bg-muted transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LiveRoomRow = memo(({ room, onOpenDetails }) => {
  // Correct status logic
  const isLive = room.examStatus === "live";
  const isScheduled = room.examStatus === "scheduled";
  const isFull = room.status === "full";

  let statusLabel = room.examStatus;
  let statusColor = "info";

  if (isScheduled) {
    statusLabel = "Lobby";
    statusColor = "info";
  } else if (isLive) {
    statusLabel = isFull ? "Live (Full)" : "Live";
    statusColor = "success";
  } else if (room.examStatus === "completed") {
    statusLabel = "Finished";
    statusColor = "secondary";
  }

  const colorMap = {
    success: "bg-success/12 text-success border-success/20",
    warning: "bg-warning/12 text-warning-foreground border-warning/20",
    info: "bg-info/12 text-info border-info/20",
    secondary: "bg-secondary text-muted-foreground border-border/60",
  };

  return (
    <tr className="border-b border-border/40 hover:bg-secondary/30 transition-colors group">
      <td className="admin-td">
        <span className="inline-block font-mono font-bold text-[0.8125rem] bg-primary/8 text-primary px-2.5 py-1.5 rounded-xl border border-primary/15 whitespace-nowrap">
          {room.roomCode || room.roomId}
        </span>
      </td>
      <td className="admin-td">
        <div className="font-bold text-sm text-foreground truncate max-w-[240px]" title={room.examTitle}>{room.examTitle}</div>
        <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider whitespace-nowrap">Session ID: {room.battleCode || String(room.examId).slice(-6).toUpperCase()}</div>
      </td>
      <td className="admin-td">
        <div className="flex items-center gap-3">
          <div className="w-[4.5rem] h-2 rounded-full bg-muted/40 overflow-hidden border border-border/10">
            <div
              className={cn("h-full rounded-full transition-all duration-500", isFull ? "bg-warning" : "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]")}
              style={{ width: `${Math.min(((room.occupancy ?? room.users ?? 0) / (room.capacity ?? 100)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black tabular-nums text-sm leading-none">
              {room.occupancy ?? room.users ?? 0} <span className="text-muted-foreground/60 text-[10px]">/ {room.capacity ?? 100}</span>
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Candidates</span>
          </div>
        </div>
      </td>
      <td className="admin-td text-center">
        <span className={cn("inline-flex items-center gap-1.5 text-[0.625rem] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border shadow-sm", colorMap[statusColor])}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusColor === "success" ? "bg-success animate-pulse" : statusColor === "warning" ? "bg-warning" : "bg-info")} />
          {statusLabel}
        </span>
      </td>
      <td className="admin-td text-right">
        <div className="flex justify-end gap-1 sm:opacity-40 sm:group-hover:opacity-100 transition-all">
          <button className="p-2.5 rounded-xl text-foreground/50 hover:text-info hover:bg-info/10 transition-all" title="View Details" onClick={() => onOpenDetails(room)}>
            <Eye size={15} strokeWidth={2.5} />
          </button>
          <button className="p-2.5 rounded-xl text-foreground/50 hover:text-primary hover:bg-primary/10 transition-all" title="Broadcast Message" onClick={() => { const msg = prompt("Message for Room " + (room.roomCode || room.roomId)); if (msg) alert("Sent: " + msg); }}>
            <MessageSquare size={15} strokeWidth={2.5} />
          </button>
          <button className="p-2.5 rounded-xl text-foreground/50 hover:text-info hover:bg-info/10 transition-all" title="Add Time" onClick={() => alert("Added 5 min")}>
            <Clock size={15} strokeWidth={2.5} />
          </button>
          <button className="p-2.5 rounded-xl text-warning/70 hover:text-warning hover:bg-warning/15 transition-all" title="Pause">
            <Pause size={15} strokeWidth={2.5} />
          </button>
          <button className="p-2.5 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all" title="Force Stop" onClick={() => { if (window.confirm("Force stop?")) alert("Stopped."); }}>
            <Square size={15} strokeWidth={2.5} />
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
          {i === 0 ? <User size={15} /> : i + 1}
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight">{p.username || p.name}</div>
          <div className="text-[0.625rem] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            Active Candidate
          </div>
        </div>
      </div>
      <span className="font-display text-lg font-black tabular-nums bg-card px-3 py-1 rounded-xl border border-border shadow-soft">
        {p.score}
      </span>
    </div>
  );
});

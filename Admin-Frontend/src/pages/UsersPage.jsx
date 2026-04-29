import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchUsers, toggleUserStatus } from "../services/apiClient";
import { Users, Eye, Ban, TrendingUp, RefreshCw, Database, Shield, UserCheck, Search, Filter, Mail, Calendar, MoreHorizontal, Download } from "lucide-react";
import { cn } from "../lib/utils";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      const list = data.users || data || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch { /* backend offline */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const admins = users.filter((u) => u.role === "admin").length;
  const students = users.filter((u) => u.role === "student").length;

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter ? u.role === roleFilter : true;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleSuspend = async (id) => {
    const user = users.find(u => u._id === id);
    const action = user?.isActive === false ? "activate" : "suspend";
    const msg = action === "suspend" ? "Suspend this user? They will be logged out." : "Reactivate this user?";
    if(!window.confirm(msg)) return;
    try {
      await toggleUserStatus(id, action);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: action === "activate" } : u));
    } catch {
      // network error
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-subtitle">View user activity, rank history and manage accounts</p>
        </div>
        <div className="admin-action-row">
          <button 
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto" 
            onClick={loadUsers} 
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-all hover:bg-secondary hover:shadow-soft sm:w-auto">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: users.length, icon: Database, color: "bg-primary/10 text-primary" },
          { label: "Students", value: students, icon: UserCheck, color: "bg-success/10 text-success" },
          { label: "Admins", value: admins, icon: Shield, color: "bg-accent/12 text-accent-foreground" },
          { label: "Suspended", value: users.filter(u => u.role === "suspended").length, icon: Ban, color: "bg-destructive/10 text-destructive" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="admin-card p-4 flex items-center gap-3 hover:shadow-soft transition-all">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", s.color)}>
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

      {/* User Table */}
      <div className="admin-card flex flex-col">
        <div className="admin-section-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-secondary/30">
          <div className="font-display font-bold flex items-center gap-2.5 text-foreground">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={16} className="text-primary" />
            </div>
            Registered Users
            <span className="text-muted-foreground text-sm font-medium ml-1">({filteredUsers.length})</span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex items-center bg-background border border-border/60 rounded-xl px-3 py-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all flex-1 sm:flex-initial sm:max-w-[220px]">
              <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
              <input 
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-sm w-full text-foreground font-medium"
              />
            </div>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)} 
              className="px-3.5 py-2 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium appearance-none cursor-pointer min-w-[110px]"
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-muted-foreground/40" />
            </div>
            <div className="text-muted-foreground font-medium">No users match your filters</div>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredUsers.map((u) => (
              <div key={u._id || u.email} className="p-4 sm:px-5 hover:bg-secondary/20 transition-all group">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={cn(
                    "w-11 h-11 rounded-2xl text-xs font-extrabold flex items-center justify-center shrink-0 ring-2 transition-all",
                    u.role === "admin" ? "bg-gradient-accent text-accent-foreground ring-accent/25" :
                    u.role === "suspended" ? "bg-destructive/15 text-destructive ring-destructive/15" :
                    "bg-primary/12 text-primary ring-primary/15"
                  )}>
                    {u.name?.split(" ").map((w) => w[0]).join("").toUpperCase() || "?"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm tracking-tight truncate">{u.name}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[0.5625rem] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider border shrink-0",
                        u.role === "admin" ? "bg-accent/12 text-accent-foreground border-accent/20" :
                        u.role === "suspended" ? "bg-destructive/12 text-destructive border-destructive/20" :
                        "bg-primary/8 text-primary border-primary/15"
                      )}>
                        {u.role === "admin" ? <Shield size={9} /> : u.role === "suspended" ? <Ban size={9} /> : <UserCheck size={9} />}
                        {u.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={11} /> {u.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} /> {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="View Profile">
                      <Eye size={15} />
                    </button>
                    <button 
                      className="p-2 rounded-xl text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-30" 
                      title="Suspend"
                      onClick={() => handleSuspend(u._id)}
                      disabled={u.role === "admin"}
                    >
                      <Ban size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {filteredUsers.length > 0 && (
          <div className="px-5 py-3 border-t border-border/40 bg-secondary/15 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

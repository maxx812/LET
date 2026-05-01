import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { connectAdminSocket, disconnectAdminSocket } from "./services/socketClient";
import { fetchDashboard } from "./services/apiClient";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import LoginPage from "./pages/LoginPage";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const QuestionsPage = lazy(() => import("./pages/QuestionsPage"));
const ExamsPage = lazy(() => import("./pages/ExamsPage"));
const LiveMonitorPage = lazy(() => import("./pages/LiveMonitorPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const TournamentPage = lazy(() => import("./pages/TournamentPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));

const FALLBACK_METRICS = {
  activeExams: "—",
  usersOnline: "—",
  examsToday: "—",
  topPerformer: "—",
  systemHealth: "Checking…",
  totalUsers: 0,
  totalQuestions: 0,
  totalExams: 0,
  liveExams: 0,
};

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full p-2 md:p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4">
          <div className="skeleton h-5 w-1/2 rounded mb-3" />
          <div className="skeleton h-4 w-2/3 rounded mb-2" />
          <div className="skeleton h-4 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("admin_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [metrics, setMetrics] = useState(FALLBACK_METRICS);
  const [socketState, setSocketState] = useState("disconnected");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Fetch dashboard stats from backend
  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetchDashboard();
      const stats = response.stats || response;
      setMetrics((prev) => ({
        ...prev,
        ...stats,
        activeExams: stats.liveExams ?? prev.activeExams,
        usersOnline: prev.usersOnline === "—" ? 0 : prev.usersOnline,
        examsToday: stats.totalExams ?? prev.examsToday,
        topPerformer: prev.topPerformer,
        systemHealth: "Healthy",
      }));
    } catch {
      // Backend offline — use fallback
      setMetrics((prev) => ({
        ...prev,
        systemHealth: "Offline",
      }));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user, loadDashboard]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Socket connection
  useEffect(() => {
    if (!user) return;

    const socket = connectAdminSocket();
    const handleConnect = () => setSocketState("connected");
    const handleDisconnect = () => setSocketState("disconnected");
    const handleOnlineUsers = (count) =>
      setMetrics((prev) => ({ ...prev, usersOnline: count }));

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("users:online:update", handleOnlineUsers);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("users:online:update", handleOnlineUsers);
      disconnectAdminSocket();
    };
  }, [user]);

  function handleLogin(userData) {
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setUser(null);
    disconnectAdminSocket();
  }

  // Login page — no sidebar/topbar
  if (location.pathname === "/login" || !user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      {isMobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          socketState={socketState}
          systemHealth={metrics.systemHealth}
          onMenuClick={() => setIsMobileSidebarOpen((prev) => !prev)}
        />
        <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 max-w-7xl mx-auto w-full">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={
                <ProtectedRoute user={user}>
                  <DashboardPage data={metrics} onRefresh={loadDashboard} />
                </ProtectedRoute>
              } />
              <Route path="/questions" element={
                <ProtectedRoute user={user}><QuestionsPage /></ProtectedRoute>
              } />
              <Route path="/exams" element={
                <ProtectedRoute user={user}><ExamsPage /></ProtectedRoute>
              } />
              <Route path="/live-monitor" element={
                <ProtectedRoute user={user}><LiveMonitorPage /></ProtectedRoute>
              } />
              <Route path="/leaderboard" element={
                <ProtectedRoute user={user}><LeaderboardPage /></ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute user={user}><UsersPage /></ProtectedRoute>
              } />
              <Route path="/tournament" element={
                <ProtectedRoute user={user}><TournamentPage /></ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute user={user}><AnalyticsPage /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute user={user}><SettingsPage /></ProtectedRoute>
              } />
              <Route path="/categories" element={
                <ProtectedRoute user={user}><CategoriesPage /></ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

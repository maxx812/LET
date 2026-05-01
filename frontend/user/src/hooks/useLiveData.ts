import { useEffect, useRef, useState } from "react";
import {
  ensureSocketConnection,
  joinExamChannel,
  leaveExamChannel,
  SOCKET_EVENTS,
  subscribeLeaderboard,
} from "@/services/socket";

/**
 * Hook for real-time live counters (players online, countdown).
 */
export function useOnlineUserCount(initial = 0) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const socket = ensureSocketConnection();
    const handler = (n: number) => setCount(n);
    socket.on(SOCKET_EVENTS.ONLINE_USERS, handler);
    socket.emit(SOCKET_EVENTS.SUBSCRIBE_ONLINE_USERS);

    return () => {
      socket.off(SOCKET_EVENTS.ONLINE_USERS, handler);
    };
  }, []);

  return count;
}

export function useLobbyPlayerCount(examId = "", enabled = true, initial = 0) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    if (!enabled || !examId) {
      return;
    }

    const socket = ensureSocketConnection();
    const handler = (next: number | { count?: number; participantCount?: number }) => {
      if (typeof next === "number") {
        setCount(next);
        return;
      }

      setCount(next?.count ?? next?.participantCount ?? 0);
    };
    const join = () => joinExamChannel(examId);
    const leave = () => leaveExamChannel(examId);

    socket.on(SOCKET_EVENTS.PLAYER_COUNT, handler);
    join();
    socket.on("connect", join);

    return () => {
      leave();
      socket.off(SOCKET_EVENTS.PLAYER_COUNT, handler);
      socket.off("connect", join);
    };
  }, [enabled, examId]);

  return count;
}

/**
 * Countdown to a target Date. Updates every second.
 * Returns { days, hours, minutes, seconds, totalMs }.
 */
export function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };

  const totalMs = Math.max(0, target.getTime() - now);
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return { days, hours, minutes, seconds, totalMs };
}

export type LeaderboardEntry = {
  id: string;
  rank: number;
  prevRank: number;
  username: string;
  score: number;
  accuracy: number;
  timeSec: number;
  isYou?: boolean;
  avatar?: string;
  examTypeId?: string;
  roomCode?: string;
  updatedAt?: string;
};

export function useExamLeaderboard(examId = "") {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const prevRowsRef = useRef<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!examId) {
      setRows([]);
      prevRowsRef.current = [];
      return;
    }

    const socket = ensureSocketConnection();
    const storedUserId = (() => {
      try { return JSON.parse(localStorage.getItem("user_data") || "{}").id || ""; }
      catch { return ""; }
    })();

    const handler = (next: any) => {
      // Backend sends { topEntries, examId, participantCount, updatedAt }
      const entries = next?.topEntries || (Array.isArray(next) ? next : []);
      const prevMap = new Map(prevRowsRef.current.map((r) => [r.id, r.rank]));

      const mapped: LeaderboardEntry[] = entries.map((e: any) => {
        const id = e.userId || e.id || "";
        const prevRank = prevMap.get(id) ?? e.rank ?? 0;
        return {
          id,
          rank: e.rank ?? 0,
          prevRank,
          username: e.name || e.username || "Unknown",
          score: e.score ?? 0,
          accuracy: e.accuracy ?? 0,
          timeSec: e.timeTakenSeconds ?? e.timeSec ?? 0,
          isYou: id === storedUserId,
          examTypeId: e.examTypeId,
          roomCode: e.roomCode,
          updatedAt: e.updatedAt,
        };
      });

      prevRowsRef.current = mapped;
      setRows(mapped);
    };

    const subscribe = () => {
      joinExamChannel(examId);
      subscribeLeaderboard(examId);
    };
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handler);
    socket.on("connect", subscribe);
    subscribe();

    return () => {
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE, handler);
      socket.off("connect", subscribe);
    };
  }, [examId]);

  return rows;
}

export function useLeaderboard(examId?: string) {
  const activeExamId =
    examId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("active_exam_id") || ""
      : "");
  return useExamLeaderboard(activeExamId);
}

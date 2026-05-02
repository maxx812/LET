import { useEffect, useRef, useState } from "react";
import {
  ensureSocketConnection,
  leaveExamChannel,
  SOCKET_EVENTS,
  subscribeLeaderboard,
  joinExamChannel,
} from "@/services/socket";
import { fetchExamLeaderboard, fetchLiveExams } from "@/services/api";

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
    const handler = (
      next: number | { count?: number; participantCount?: number },
    ) => {
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

const LEADERBOARD_CACHE_PREFIX = "examstrike_leaderboard_cache_v1:";

function getStoredUserId() {
  try {
    return JSON.parse(localStorage.getItem("user_data") || "{}").id || "";
  } catch {
    return "";
  }
}

function mapLeaderboardRows(
  payload: any,
  prevRows: LeaderboardEntry[],
  storedUserId: string,
) {
  const entries =
    payload?.topEntries || (Array.isArray(payload) ? payload : []);
  const prevMap = new Map(prevRows.map((row) => [row.id, row.rank]));

  return entries.map((entry: any) => {
    const id = entry.userId || entry.id || "";
    const prevRank = prevMap.get(id) ?? entry.rank ?? 0;
    return {
      id,
      rank: entry.rank ?? 0,
      prevRank,
      username: entry.name || entry.username || "Unknown",
      score: entry.score ?? 0,
      accuracy: entry.accuracy ?? 0,
      timeSec: entry.timeTakenSeconds ?? entry.timeSec ?? 0,
      isYou: id === storedUserId,
      examTypeId: entry.examTypeId,
      roomCode: entry.roomCode,
      updatedAt: entry.updatedAt,
    } satisfies LeaderboardEntry;
  });
}

function getLeaderboardCacheKey(examId: string) {
  return `${LEADERBOARD_CACHE_PREFIX}${examId}`;
}

function readCachedLeaderboard(examId: string) {
  try {
    const raw = sessionStorage.getItem(getLeaderboardCacheKey(examId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedLeaderboard(examId: string, payload: any) {
  try {
    sessionStorage.setItem(
      getLeaderboardCacheKey(examId),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore storage quota/transient errors and keep live UI flowing.
  }
}

export function useExamLeaderboard(examId = "") {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const prevRowsRef = useRef<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!examId) {
      setRows([]);
      prevRowsRef.current = [];
      return;
    }

    let cancelled = false;
    const socket = ensureSocketConnection();
    const storedUserId = getStoredUserId();
    const receivedLiveUpdateRef = { current: false };

    const applyRows = (payload: any, source: "cache" | "http" | "socket") => {
      if (cancelled) {
        return;
      }

      const mapped = mapLeaderboardRows(
        payload,
        prevRowsRef.current,
        storedUserId,
      );
      prevRowsRef.current = mapped;
      setRows(mapped);

      if (source !== "cache") {
        writeCachedLeaderboard(examId, payload);
      }
    };

    const cached = readCachedLeaderboard(examId);
    if (cached) {
      applyRows(cached, "cache");
    }

    const handler = (next: any) => {
      receivedLiveUpdateRef.current = true;
      applyRows(next, "socket");
    };

    const subscribe = () => {
      subscribeLeaderboard(examId);
    };

    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handler);
    socket.on("connect", subscribe);
    subscribe();

    void fetchExamLeaderboard(examId)
      .then((snapshot) => {
        if (!receivedLiveUpdateRef.current) {
          applyRows(snapshot, "http");
        }
      })
      .catch(() => {
        // REST hydrate is a fast-path fallback; socket updates continue regardless.
      });

    return () => {
      cancelled = true;
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


export function useLiveExamCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchLiveExams();
        if (!active) return;
        const liveCount = data.exams.filter((e: any) => e.status === "live").length;
        setCount(liveCount);
      } catch {
        // Fallback to 0
      }
    };
    load();
    const interval = setInterval(load, 30000); // Check every 30s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}

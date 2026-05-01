import { io, type Socket } from "socket.io-client";
import { getSocketUrl } from "@/lib/runtimeConfig";

let socket: Socket | null = null;

function getSocketAuth() {
  const token = localStorage.getItem("user_token");
  return token ? { token } : {};
}

function createSocket() {
  const url = getSocketUrl();
  const options = {
    autoConnect: false,
    transports: ["websocket"],
    path: "/socket.io",
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
    timeout: 5000,
    auth: getSocketAuth(),
  };

  return url ? io(url, options) : io(options);
}

export const SOCKET_EVENTS = {
  ONLINE_USERS: "users:online:update",
  PLAYER_COUNT: "lobby:player_count",
  COUNTDOWN: "exam:countdown",
  EXAM_START: "exam:start",
  LEADERBOARD_UPDATE: "leaderboard:update",
  FORCE_SUBMIT: "forceSubmit",
  SUBSCRIBE_ONLINE_USERS: "users:online:subscribe",
  JOIN_EXAM: "exam:join",
  LEAVE_EXAM: "exam:leave",
  SUBSCRIBE_LEADERBOARD: "leaderboard:subscribe",
  SUBMIT_ANSWERS_BATCH: "exam:answers:batch"
} as const;

export function getSocket() {
  if (!socket) {
    socket = createSocket();
  }

  socket.auth = getSocketAuth();
  return socket;
}

export function ensureSocketConnection() {
  const client = getSocket();

  if (!client.connected && !client.active) {
    client.connect();
  }

  return client;
}

export function refreshSocketSession() {
  const client = getSocket();
  client.auth = getSocketAuth();

  if (client.connected || client.active) {
    client.disconnect();
  }

  client.connect();
  return client;
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
}

export function joinExamChannel(examId: string) {
  if (!examId) {
    return;
  }

  const client = ensureSocketConnection();
  client.emit(SOCKET_EVENTS.JOIN_EXAM, { examId });
}

export function leaveExamChannel(examId: string) {
  if (!socket || !examId) {
    return;
  }

  socket.emit(SOCKET_EVENTS.LEAVE_EXAM, { examId });
}

export function subscribeLeaderboard(examId: string) {
  if (!examId) {
    return;
  }

  const client = ensureSocketConnection();
  client.emit(SOCKET_EVENTS.SUBSCRIBE_LEADERBOARD, { examId });
}

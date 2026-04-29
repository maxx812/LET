const ACTIVE_EXAM_ID_KEY = "active_exam_id";
const ACTIVE_ROOM_ID_KEY = "active_room_id";
const ARENA_AUTHORIZED_KEY = "arena_authorized";

export type ActiveExamSession = {
  examId: string;
  roomId: string;
  authorized: boolean;
};

function hasBrowserStorage() {
  return typeof window !== "undefined";
}

export function getActiveExamId() {
  if (!hasBrowserStorage()) {
    return "";
  }

  return localStorage.getItem(ACTIVE_EXAM_ID_KEY) || "";
}

export function getActiveRoomId() {
  if (!hasBrowserStorage()) {
    return "";
  }

  return localStorage.getItem(ACTIVE_ROOM_ID_KEY) || "";
}

export function isArenaAuthorized() {
  if (!hasBrowserStorage()) {
    return false;
  }

  return sessionStorage.getItem(ARENA_AUTHORIZED_KEY) === "true";
}

export function getActiveExamSession(): ActiveExamSession {
  return {
    examId: getActiveExamId(),
    roomId: getActiveRoomId(),
    authorized: isArenaAuthorized(),
  };
}

export function setActiveExamSession({
  examId,
  roomId,
}: {
  examId: string;
  roomId: string;
}) {
  if (!hasBrowserStorage()) {
    return;
  }

  localStorage.setItem(ACTIVE_EXAM_ID_KEY, examId);
  localStorage.setItem(ACTIVE_ROOM_ID_KEY, roomId);
  sessionStorage.setItem(ARENA_AUTHORIZED_KEY, "true");
}

export function markExamSubmitted(examId = getActiveExamId()) {
  if (!hasBrowserStorage()) {
    return;
  }

  if (examId) {
    localStorage.setItem(ACTIVE_EXAM_ID_KEY, examId);
  }

  localStorage.removeItem(ACTIVE_ROOM_ID_KEY);
  sessionStorage.removeItem(ARENA_AUTHORIZED_KEY);
}

export function clearActiveExamSession({ keepExamId = false } = {}) {
  if (!hasBrowserStorage()) {
    return;
  }

  if (!keepExamId) {
    localStorage.removeItem(ACTIVE_EXAM_ID_KEY);
  }

  localStorage.removeItem(ACTIVE_ROOM_ID_KEY);
  sessionStorage.removeItem(ARENA_AUTHORIZED_KEY);
}

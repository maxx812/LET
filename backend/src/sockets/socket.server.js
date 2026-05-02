import { examEngineService } from "../services/exam-engine.service.js";
import { examService } from "../services/exam.service.js";
import { AppError } from "../shared/errors/app-error.js";
import { verifyAccessToken } from "../shared/utils/jwt.js";

function examChannel(examId) {
  return `exam:${examId}`;
}

const EMIT_DEBOUNCE_MS = 400;
let adminSnapshotTimer = null;
const lobbyCountTimers = new Map();

function formatSocketError(error) {
  return {
    code: error.code || "SOCKET_ERROR",
    message: error.message || "Unexpected socket error",
    details: error.details || null
  };
}

function buildCountdownPayload(examId, examSession) {
  const endAt = new Date(examSession?.scheduledEndAt || 0).getTime();
  const now = Date.now();
  return {
    examId,
    serverNow: new Date(now),
    remainingMs: Math.max(0, endAt - now)
  };
}

async function emitAdminRoomSnapshot(io) {
  const rooms = await examService.getRoomMonitoringSnapshot();
  io.to("admins").emit("admin:rooms:update", rooms);
}

function scheduleAdminRoomSnapshot(io) {
  if (adminSnapshotTimer) {
    clearTimeout(adminSnapshotTimer);
  }

  adminSnapshotTimer = setTimeout(() => {
    adminSnapshotTimer = null;
    emitAdminRoomSnapshot(io).catch(() => {});
  }, EMIT_DEBOUNCE_MS);
}

async function emitLobbyPlayerCount(io, examId) {
  const participantCount = await examService.getParticipantCount(examId);
  io.to(examChannel(examId)).emit("lobby:player_count", {
    examId,
    participantCount
  });
}

function scheduleLobbyPlayerCount(io, examId) {
  const key = String(examId);
  const existing = lobbyCountTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    lobbyCountTimers.delete(key);
    emitLobbyPlayerCount(io, examId).catch(() => {});
  }, EMIT_DEBOUNCE_MS);

  lobbyCountTimers.set(key, timer);
}

async function handleJoinExam(io, socket, examId, ack) {
  try {
    if (socket.user?.role !== "user") {
      throw new AppError(403, "Only candidates can join exam rooms", {
        code: "FORBIDDEN"
      });
    }

    if (!examId || !/^[0-9a-fA-F]{24}$/.test(String(examId))) {
      throw new AppError(400, "A valid examId is required", {
        code: "EXAM_ID_INVALID"
      });
    }

    const session = await examEngineService.joinExamSession(examId, socket.user.sub);
    await examService.markUserConnected(examId, socket.user.sub, socket.id);

    socket.join(examChannel(examId));
    socket.data.examId = examId;
    socket.data.roomId = session.assignment.roomId;

    socket.emit("roomAssigned", session.assignment);
    socket.emit("exam:countdown", buildCountdownPayload(examId, session.examSession));
    if (session.examSession.status === "live") {
      const payload = {
        examId,
        roomCode: session.assignment.roomCode,
        startedAt: session.examSession.startedAt || session.examSession.scheduledStartAt,
        scheduledEndAt: session.examSession.scheduledEndAt,
        deliveryMode: session.examSession.questionDeliveryMode,
        fetchQuestionsPath: `/api/user/exams/${examId}/questions`
      };
      socket.emit("exam:start", payload);
    }

    ack?.({ ok: true, ...session });
    scheduleAdminRoomSnapshot(io);
    scheduleLobbyPlayerCount(io, examId);
  } catch (error) {
    const payload = { ok: false, error: formatSocketError(error) };
    socket.emit("joinError", payload.error);
    ack?.(payload);
  }
}

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        socket.user = verifyAccessToken(token);
      }
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    io.emit("users:online:update", io.engine.clientsCount);

    if (socket.user?.role === "admin") {
      socket.join("admins");
    }

    socket.on("users:online:subscribe", () => {
      socket.emit("users:online:update", io.engine.clientsCount);
    });

    socket.on("admin:rooms:subscribe", async (_payload, ack) => {
      try {
        if (socket.user?.role !== "admin") {
          throw new AppError(403, "Admin access is required", {
            code: "FORBIDDEN"
          });
        }

        socket.join("admins");
        const rooms = await examService.getRoomMonitoringSnapshot();
        socket.emit("admin:rooms:update", rooms);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: formatSocketError(error) });
      }
    });

    socket.on("admin:exam:start", async ({ examId } = {}, ack) => {
      try {
        if (socket.user?.role !== "admin") {
          throw new AppError(403, "Admin access is required", {
            code: "FORBIDDEN"
          });
        }

        const startedExams = await examService.forceStartExams(examId || null);
        for (const exam of startedExams) {
          const payload = await examEngineService.onExamStarted(exam.id);
          io.to(examChannel(exam.id)).emit("exam:start", payload);
          scheduleLobbyPlayerCount(io, exam.id);
        }

        scheduleAdminRoomSnapshot(io);
        ack?.({
          ok: true,
          startedExamIds: startedExams.map((exam) => exam.id)
        });
      } catch (error) {
        ack?.({ ok: false, error: formatSocketError(error) });
      }
    });
    
    socket.on("admin:exam:pause", async ({ examId, pause } = {}, ack) => {
      try {
        if (socket.user?.role !== "admin") {
          throw new AppError(403, "Admin access is required", { code: "FORBIDDEN" });
        }
        
        // Broadcast pause event to target exam channel or all live exams
        const target = examId ? examChannel(examId) : "admins"; // Placeholder: logic for global pause
        io.emit(pause ? "exam:pause" : "exam:resume", { examId });
        
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: formatSocketError(error) });
      }
    });

    socket.on("admin:exam:stop", async ({ examId } = {}, ack) => {
      try {
        if (socket.user?.role !== "admin") {
          throw new AppError(403, "Admin access is required", { code: "FORBIDDEN" });
        }
        
        const examsToStop = await examService.forceStopExams(examId || null);
        for (const exam of examsToStop) {
          io.to(examChannel(exam.id)).emit("forceSubmit", {
            examId: exam.id,
            reason: "admin_termination",
            serverNow: new Date(),
            submitExamPath: `/api/user/exams/${exam.id}/submit-exam`
          });

          // Finalize immediately to calculate results and update leaderboard
          await examEngineService.finalizeExam(exam.id).catch(err => {
            console.error(`Finalization failed for exam ${exam.id}:`, err);
          });
        }
        
        scheduleAdminRoomSnapshot(io);
        ack?.({ ok: true, stoppedCount: examsToStop.length });
      } catch (error) {
        ack?.({ ok: false, error: formatSocketError(error) });
      }
    });

    socket.on("exam:join", async ({ examId } = {}, ack) => {
      await handleJoinExam(io, socket, examId, ack);
    });

    socket.on("joinExam", async ({ examId } = {}, ack) => {
      await handleJoinExam(io, socket, examId, ack);
    });

    socket.on("exam:leave", async ({ examId } = {}, ack) => {
      const targetExamId = examId || socket.data.examId;
      if (targetExamId) {
        socket.leave(examChannel(targetExamId));
      }
      ack?.({ ok: true });
    });

    socket.on("leaderboard:subscribe", async ({ examId } = {}, ack) => {
      try {
        const targetExamId = examId || socket.data.examId;
        if (!targetExamId) {
          throw new AppError(400, "examId is required to subscribe to leaderboard", {
            code: "EXAM_ID_REQUIRED"
          });
        }

        socket.join(examChannel(targetExamId));
        const leaderboard = await examEngineService.getLeaderboard(targetExamId);
        socket.emit("leaderboard:update", leaderboard);
        ack?.({ ok: true, leaderboard });
      } catch (error) {
        ack?.({ ok: false, error: formatSocketError(error) });
      }
    });

    socket.on("exam:answers:batch", async ({ examId, answers } = {}, ack) => {
      try {
        if (socket.user?.role !== "user") {
          throw new AppError(403, "Only candidates can submit answers", {
            code: "FORBIDDEN"
          });
        }

        const targetExamId = examId || socket.data.examId;
        if (!targetExamId) {
          throw new AppError(400, "examId is required", { code: "EXAM_ID_REQUIRED" });
        }

        const result = await examEngineService.submitAnswer(
          targetExamId,
          socket.user.sub,
          { answers: Array.isArray(answers) ? answers : [] },
          "socket"
        );

        ack?.({ ok: true, ...result });
      } catch (error) {
        ack?.({ ok: false, error: formatSocketError(error) });
      }
    });

    socket.on("disconnect", () => {
      io.emit("users:online:update", io.engine.clientsCount);
    });
  });
}

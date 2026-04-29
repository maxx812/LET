import { examEngineService } from "../services/exam-engine.service.js";
import { examService } from "../services/exam.service.js";
import { AppError } from "../shared/errors/app-error.js";
import { verifyAccessToken } from "../shared/utils/jwt.js";

function examChannel(examId) {
  return `exam:${examId}`;
}

function formatSocketError(error) {
  return {
    code: error.code || "SOCKET_ERROR",
    message: error.message || "Unexpected socket error",
    details: error.details || null
  };
}

async function emitAdminRoomSnapshot(io) {
  const rooms = await examService.getRoomMonitoringSnapshot();
  io.to("admins").emit("admin:rooms:update", rooms);
}

async function emitLobbyPlayerCount(io, examId) {
  const participantCount = await examService.getParticipantCount(examId);
  io.to(examChannel(examId)).emit("lobby:player_count", {
    examId,
    participantCount
  });
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
    await Promise.all([
      emitAdminRoomSnapshot(io),
      emitLobbyPlayerCount(io, examId)
    ]);
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
          await emitLobbyPlayerCount(io, exam.id);
        }

        await emitAdminRoomSnapshot(io);
        ack?.({
          ok: true,
          startedExamIds: startedExams.map((exam) => exam.id)
        });
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

        const leaderboard = await examEngineService.getLeaderboard(targetExamId);
        socket.emit("leaderboard:update", leaderboard);
        ack?.({ ok: true, leaderboard });
      } catch (error) {
        ack?.({ ok: false, error: formatSocketError(error) });
      }
    });

    socket.on("disconnect", () => {
      io.emit("users:online:update", io.engine.clientsCount);
    });
  });
}

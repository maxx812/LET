import { config } from "../config/env.js";
import { examEngineService } from "./exam-engine.service.js";
import { examService } from "./exam.service.js";

let scheduleIntervalHandle = null;
let flushIntervalHandle = null;
let leaderboardIntervalHandle = null;

function examChannel(examId) {
  return `exam:${examId}`;
}

export function startExamScheduler(io) {
  if (scheduleIntervalHandle || flushIntervalHandle || leaderboardIntervalHandle) return;

  const scheduleTick = async () => {
    try {
      const { startedExams, completedExams } = await examService.runScheduleTick();

      for (const exam of startedExams) {
        const payload = await examEngineService.onExamStarted(exam.id);
        io.to(examChannel(exam.id)).emit("exam:start", payload);
      }

      for (const exam of completedExams) {
        io.to(examChannel(exam.id)).emit("forceSubmit", {
          examId: exam.id,
          reason: "time_up",
          serverNow: new Date(),
          submitExamPath: `/api/user/exams/${exam.id}/submit-exam`
        });

        const finalization = await examEngineService.finalizeExam(exam.id);
        const leaderboard = await examEngineService.getLeaderboard(exam.id);
        io.to(examChannel(exam.id)).emit("leaderboard:update", leaderboard);
        io.to(examChannel(exam.id)).emit("examEnd", {
          examId: exam.id,
          reason: "time_up",
          resultReady: true,
          resultPath: `/api/user/exams/${exam.id}/result`,
          totalAttempts: finalization.totalAttempts
        });
      }

      if (startedExams.length > 0 || completedExams.length > 0) {
        const rooms = await examService.getRoomMonitoringSnapshot();
        io.to("admins").emit("admin:rooms:update", rooms);
      }
    } catch (error) {
      console.error("Exam scheduler tick failed", error);
    }
  };

  const flushTick = async () => {
    try {
      await examEngineService.flushDirtyAttempts();
    } catch (error) {
      console.error("Attempt flush tick failed", error);
    }
  };

  const leaderboardTick = async () => {
    try {
      await examEngineService.broadcastDirtyLeaderboards(io);
    } catch (error) {
      console.error("Leaderboard broadcast tick failed", error);
    }
  };

  scheduleTick().catch(console.error);
  flushTick().catch(console.error);
  leaderboardTick().catch(console.error);

  scheduleIntervalHandle = setInterval(scheduleTick, config.schedulerPollIntervalMs);
  flushIntervalHandle = setInterval(flushTick, config.answerFlushIntervalMs);
  leaderboardIntervalHandle = setInterval(leaderboardTick, config.leaderboardBroadcastIntervalMs);
}

export function stopExamScheduler() {
  if (scheduleIntervalHandle) {
    clearInterval(scheduleIntervalHandle);
    scheduleIntervalHandle = null;
  }

  if (flushIntervalHandle) {
    clearInterval(flushIntervalHandle);
    flushIntervalHandle = null;
  }

  if (leaderboardIntervalHandle) {
    clearInterval(leaderboardIntervalHandle);
    leaderboardIntervalHandle = null;
  }
}

import mongoose from "mongoose";
import { config } from "../config/env.js";
import { ExamRegistrationModel } from "../models/exam-registration.model.js";
import { ExamRoomModel } from "../models/exam-room.model.js";
import { ExamModel } from "../models/exam.model.js";
import { QuestionModel } from "../models/question.model.js";
import { AppError } from "../shared/errors/app-error.js";
import { connectRedis } from "../shared/redis/redis.client.js";
import { redisKeys } from "./exam-engine.redis.js";

const DISTRIBUTION_RATIOS = [
  { key: "easy", ratio: 0.3, priority: 2 },
  { key: "medium", ratio: 0.5, priority: 3 },
  { key: "hard", ratio: 0.2, priority: 1 }
];

function applySession(query, session) {
  return session ? query.session(session) : query;
}

function shuffle(items) {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isTransactionUnsupported(error) {
  return /replica set member|Transaction numbers are only allowed/i.test(error?.message || "");
}

async function withOptionalTransaction(work) {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

function calculateDifficultyDistribution(totalQuestions) {
  const provisional = DISTRIBUTION_RATIOS.map((item) => {
    const raw = totalQuestions * item.ratio;
    return {
      ...item,
      count: Math.floor(raw),
      fraction: raw - Math.floor(raw)
    };
  });

  let remaining = totalQuestions - provisional.reduce((sum, item) => sum + item.count, 0);
  provisional.sort((left, right) => {
    if (right.fraction !== left.fraction) {
      return right.fraction - left.fraction;
    }
    return right.priority - left.priority;
  });

  for (const bucket of provisional) {
    if (remaining <= 0) break;
    bucket.count += 1;
    remaining -= 1;
  }

  return provisional.reduce(
    (accumulator, item) => ({
      ...accumulator,
      [item.key]: item.count
    }),
    {}
  );
}

function buildQuestionSnapshot(question) {
  return {
    bankQuestionId: question._id,
    questionCode: question.questionCode,
    questionText: question.questionText,
    options: question.options,
    correctOptionKey: question.correctOptionKey,
    explanation: question.explanation,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    language: question.language,
    marks: question.marks,
    negativeMarks: question.negativeMarks
  };
}

function sanitizeQuestionForCandidate(questionSnapshot) {
  return {
    bankQuestionId: questionSnapshot.bankQuestionId,
    questionCode: questionSnapshot.questionCode,
    questionText: questionSnapshot.questionText,
    options: questionSnapshot.options,
    topic: questionSnapshot.topic,
    subtopic: questionSnapshot.subtopic,
    difficulty: questionSnapshot.difficulty,
    language: questionSnapshot.language,
    marks: questionSnapshot.marks,
    negativeMarks: questionSnapshot.negativeMarks
  };
}

function serializeExamSummary(exam) {
  return {
    id: exam._id.toString(),
    battleCode: exam.battleCode,
    title: exam.title,
    description: exam.description,
    instructions: exam.instructions,
    scheduledStartAt: exam.scheduledStartAt,
    scheduledEndAt: exam.scheduledEndAt,
    durationMinutes: exam.durationMinutes,
    status: exam.status,
    totalQuestions: exam.totalQuestions,
    topics: exam.questionFilters?.topics || [],
    difficultyDistribution: exam.difficultyDistribution,
    maxUsersPerRoom: exam.maxUsersPerRoom,
    questionDeliveryMode: exam.questionDeliveryMode || "bulk",
    qualificationCount: exam.qualificationCount || config.qualificationCount,
    startedAt: exam.startedAt,
    completedAt: exam.completedAt,
    resultsGeneratedAt: exam.resultsGeneratedAt || null,
    examTypeId: exam.examTypeId?._id || exam.examTypeId,
    examType: (exam.examTypeId && typeof exam.examTypeId === "object" && exam.examTypeId.name) ? {
      id: exam.examTypeId._id.toString(),
      name: exam.examTypeId.name,
      slug: exam.examTypeId.slug
    } : null,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt
  };
}

function generateBattleCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EXM-${code}`;
}

function serializeAssignment(registration, exam) {
  const room = registration.roomId;

  return {
    examId: exam._id.toString(),
    examTitle: exam.title,
    examStatus: exam.status,
    scheduledStartAt: exam.scheduledStartAt,
    roomId: room._id.toString(),
    roomCode: room.roomCode,
    roomNumber: room.roomNumber,
    seatNumber: registration.seatNumber,
    roomCapacity: room.capacity
  };
}


async function buildExamQuestions(payload) {
  const { totalQuestions, topics, examTypeId } = payload;
  
  const match = {
    status: "active",
    examTypeId: new mongoose.Types.ObjectId(payload.examTypeId),
    topic: { $in: payload.topics }
  };

  // 1. Get actual availability for each difficulty
  const availabilityRows = await QuestionModel.aggregate([
    { $match: match },
    { $group: { _id: "$difficulty", count: { $sum: 1 } } }
  ]);

  const availability = { easy: 0, medium: 0, hard: 0 };
  for (const row of availabilityRows) {
    availability[row._id] = row.count;
  }

  const totalAvailable = Object.values(availability).reduce((a, b) => a + b, 0);

  if (totalAvailable < totalQuestions) {
    throw new AppError(422, "Not enough active questions to generate this exam", {
      code: "INSUFFICIENT_QUESTION_BANK",
      details: {
        required: totalQuestions,
        available: totalAvailable,
        byDifficulty: availability,
        hint: "Add more questions or reduce the total questions count for the exam."
      }
    });
  }

  // 2. Calculate ideal distribution
  const idealDistribution = calculateDifficultyDistribution(totalQuestions);

  // 3. Adjust distribution based on actual availability
  const samplingPlan = { ...idealDistribution };
  let shortage = 0;

  // First pass: identify shortages
  for (const difficulty of ["hard", "medium", "easy"]) {
    if (samplingPlan[difficulty] > availability[difficulty]) {
      shortage += (samplingPlan[difficulty] - availability[difficulty]);
      samplingPlan[difficulty] = availability[difficulty];
    }
  }

  // Second pass: distribute shortage to other buckets that have surplus
  if (shortage > 0) {
    // Fill from medium first, then easy, then hard (preference order)
    const fillOrder = ["medium", "easy", "hard"];
    for (const difficulty of fillOrder) {
      if (shortage <= 0) break;
      const capacity = availability[difficulty] - samplingPlan[difficulty];
      if (capacity > 0) {
        const take = Math.min(capacity, shortage);
        samplingPlan[difficulty] += take;
        shortage -= take;
      }
    }
  }

  // 4. Sample questions based on the plan
  const sampledGroups = await Promise.all(
    Object.entries(samplingPlan)
      .filter(([, count]) => count > 0)
      .map(([difficulty, count]) =>
        QuestionModel.aggregate([
          {
            $match: {
              ...match,
              difficulty
            }
          },
          { $sample: { size: count } }
        ])
      )
  );

  const sampledQuestions = shuffle(sampledGroups.flat());
  
  return {
    difficultyDistribution: samplingPlan,
    questionIds: sampledQuestions.map((question) => question._id),
    questionSnapshots: sampledQuestions.map(buildQuestionSnapshot)
  };
}

async function getJoinableExam(examId, session = null) {
  const exam = await applySession(ExamModel.findById(examId), session);
  if (!exam) {
    throw new AppError(404, "Exam was not found", { code: "EXAM_NOT_FOUND" });
  }

  if (!["scheduled", "live"].includes(exam.status)) {
    throw new AppError(409, "Exam is not available for joining", {
      code: "EXAM_NOT_JOINABLE"
    });
  }

  if (exam.scheduledEndAt <= new Date()) {
    throw new AppError(409, "Exam has already ended", {
      code: "EXAM_ENDED"
    });
  }

  return exam;
}

async function allocateRoom(exam, session = null) {
  const now = new Date();
  let room = await applySession(
    ExamRoomModel.findOneAndUpdate(
      {
        examId: exam._id,
        status: "open",
        occupancy: { $lt: exam.maxUsersPerRoom }
      },
      {
        $inc: { occupancy: 1 },
        $set: { lastAssignedAt: now }
      },
      {
        new: true,
        sort: { roomNumber: 1 }
      }
    ),
    session
  );

  if (!room) {
    const updatedExam = await applySession(
      ExamModel.findByIdAndUpdate(exam._id, { $inc: { roomSequence: 1 } }, { new: true }),
      session
    );

    room = (
      await ExamRoomModel.create(
        [
          {
            examId: exam._id,
            roomNumber: updatedExam.roomSequence,
            roomCode: `${exam.battleCode || "ROOM"}-R${String(updatedExam.roomSequence).padStart(2, "0")}`,
            capacity: exam.maxUsersPerRoom,
            occupancy: 1,
            status: exam.maxUsersPerRoom === 1 ? "full" : "open",
            lastAssignedAt: now
          }
        ],
        session ? { session } : undefined
      )
    )[0];
  }

  if (room.occupancy >= room.capacity && room.status !== "full") {
    room.status = "full";
    await room.save(session ? { session } : undefined);
  }

  return room;
}

export const examService = {
  calculateDifficultyDistribution,

  async createExam(payload, createdBy) {
    const scheduledStartAt = new Date(payload.scheduledStartAt);
    const scheduledEndAt = addMinutes(scheduledStartAt, payload.durationMinutes);
    const now = new Date();

    if (!payload.saveAsDraft && scheduledEndAt <= now) {
      throw new AppError(422, "Scheduled exam end time must be in the future", {
        code: "INVALID_EXAM_WINDOW"
      });
    }

    const { difficultyDistribution, questionIds, questionSnapshots } = await buildExamQuestions({
      totalQuestions: payload.totalQuestions,
      topics: payload.topics,
      examTypeId: payload.examTypeId
    });

    const exam = await ExamModel.create({
      title: payload.title,
      description: payload.description,
      instructions: payload.instructions,
      scheduledStartAt,
      scheduledEndAt,
      durationMinutes: payload.durationMinutes,
      status: payload.saveAsDraft ? "draft" : scheduledStartAt <= now ? "live" : "scheduled",
      totalQuestions: payload.totalQuestions,
      maxUsersPerRoom: payload.maxUsersPerRoom || config.defaultRoomCapacity,
      questionDeliveryMode: "bulk",
      qualificationCount: config.qualificationCount,
      questionFilters: {
        topics: payload.topics
      },
      examTypeId: payload.examTypeId,
      battleCode: generateBattleCode(),
      difficultyDistribution,
      questionIds,
      questionSnapshots,
      createdBy,
      startedAt: payload.saveAsDraft ? null : scheduledStartAt <= now ? now : null
    });

    return serializeExamSummary(exam);
  },

  async listExams(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [exams, total] = await Promise.all([
      ExamModel.find(query).sort({ scheduledStartAt: -1 }).skip(skip).limit(limit).lean(),
      ExamModel.countDocuments(query)
    ]);

    return {
      items: exams.map(serializeExamSummary),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    };
  },

  async updateExam(examId, payload) {
    const exam = await ExamModel.findById(examId);
    if (!exam) {
      throw new AppError(404, "Exam was not found", { code: "EXAM_NOT_FOUND" });
    }

    if (["live", "completed", "cancelled"].includes(exam.status)) {
      throw new AppError(409, "Live or completed exams cannot be edited", {
        code: "EXAM_EDIT_LOCKED"
      });
    }

    const nextScheduledStartAt = payload.scheduledStartAt
      ? new Date(payload.scheduledStartAt)
      : exam.scheduledStartAt;
    const nextDurationMinutes = payload.durationMinutes ?? exam.durationMinutes;
    const nextScheduledEndAt = addMinutes(nextScheduledStartAt, nextDurationMinutes);
    const nextTotalQuestions = payload.totalQuestions ?? exam.totalQuestions;
    const nextTopics = payload.topics ?? exam.questionFilters.topics;
    const now = new Date();

    if ((payload.saveAsDraft === false || exam.status !== "draft") && nextScheduledEndAt <= now) {
      throw new AppError(422, "Updated exam end time must be in the future", {
        code: "INVALID_EXAM_WINDOW"
      });
    }

    let difficultyDistribution = exam.difficultyDistribution;
    let questionIds = exam.questionIds;
    let questionSnapshots = exam.questionSnapshots;

    if (
      Object.prototype.hasOwnProperty.call(payload, "totalQuestions") ||
      Object.prototype.hasOwnProperty.call(payload, "topics")
    ) {
      const selection = await buildExamQuestions({
        totalQuestions: nextTotalQuestions,
        topics: nextTopics,
        examTypeId: payload.examTypeId ?? exam.examTypeId
      });
      difficultyDistribution = selection.difficultyDistribution;
      questionIds = selection.questionIds;
      questionSnapshots = selection.questionSnapshots;
    }

    exam.title = payload.title ?? exam.title;
    exam.description = payload.description ?? exam.description;
    exam.instructions = payload.instructions ?? exam.instructions;
    exam.scheduledStartAt = nextScheduledStartAt;
    exam.scheduledEndAt = nextScheduledEndAt;
    exam.durationMinutes = nextDurationMinutes;
    exam.totalQuestions = nextTotalQuestions;
    exam.maxUsersPerRoom = payload.maxUsersPerRoom ?? exam.maxUsersPerRoom;
    exam.questionFilters = { topics: nextTopics };
    exam.difficultyDistribution = difficultyDistribution;
    exam.questionIds = questionIds;
    exam.questionSnapshots = questionSnapshots;

    if (payload.saveAsDraft === true) {
      exam.status = "draft";
      exam.startedAt = null;
    } else if (payload.saveAsDraft === false && exam.status === "draft") {
      exam.status = nextScheduledStartAt <= now ? "live" : "scheduled";
      exam.startedAt = nextScheduledStartAt <= now ? now : null;
    } else if (exam.status === "scheduled" && nextScheduledStartAt <= now) {
      exam.status = "live";
      exam.startedAt = now;
    }

    await exam.save();
    return serializeExamSummary(exam);
  },

  async publishExam(examId) {
    const exam = await ExamModel.findById(examId);
    if (!exam) {
      throw new AppError(404, "Exam was not found", { code: "EXAM_NOT_FOUND" });
    }

    if (exam.status !== "draft") {
      return serializeExamSummary(exam);
    }

    const now = new Date();
    exam.status = exam.scheduledStartAt <= now ? "live" : "scheduled";
    exam.startedAt = exam.status === "live" ? now : null;
    await exam.save();

    return serializeExamSummary(exam);
  },

  async forceStartExams(examId = null) {
    const now = new Date();
    const query = examId ? { _id: examId, status: "scheduled" } : { status: "scheduled" };
    const examsToStart = await ExamModel.find(query).select("_id durationMinutes");
    const startedExams = [];

    for (const exam of examsToStart) {
      const scheduledEndAt = addMinutes(now, exam.durationMinutes);
      const updatedExam = await ExamModel.findOneAndUpdate(
        {
          _id: exam._id,
          status: "scheduled"
        },
        {
          $set: {
            status: "live",
            startedAt: now,
            scheduledEndAt
          }
        },
        { new: true }
      );

      if (updatedExam) {
        startedExams.push(serializeExamSummary(updatedExam));
      }
    }

    return startedExams;
  },

  async forceStopExams(examId = null) {
    const now = new Date();
    const query = examId ? { _id: examId, status: "live" } : { status: "live" };
    const examsToStop = await ExamModel.find(query).select("_id");
    const stoppedExams = [];

    for (const exam of examsToStop) {
      const updatedExam = await ExamModel.findOneAndUpdate(
        {
          _id: exam._id,
          status: "live"
        },
        {
          $set: {
            status: "completed",
            completedAt: now
          }
        },
        { new: true }
      );

      if (updatedExam) {
        stoppedExams.push(serializeExamSummary(updatedExam));
      }
    }

    return stoppedExams;
  },

  async deleteExam(examId) {
    const exam = await ExamModel.findById(examId);
    if (!exam) {
      throw new AppError(404, "Exam was not found", { code: "EXAM_NOT_FOUND" });
    }

    if (["live", "completed"].includes(exam.status)) {
      throw new AppError(409, "Live or completed exams cannot be deleted", {
        code: "EXAM_DELETE_LOCKED"
      });
    }

    const registrationsCount = await ExamRegistrationModel.countDocuments({ examId });
    if (registrationsCount > 0) {
      throw new AppError(409, "Exam already has registered users and cannot be deleted", {
        code: "EXAM_HAS_REGISTRATIONS"
      });
    }

    await Promise.all([
      ExamRoomModel.deleteMany({ examId }),
      ExamModel.findByIdAndDelete(examId)
    ]);
  },

  async listAvailableExamsForUsers(userId = null) {
    const now = new Date();
    const exams = await ExamModel.find({
      status: { $in: ["scheduled", "live", "completed"] },
      scheduledEndAt: { $gt: new Date(now.getTime() - 48 * 60 * 60 * 1000) }
    })
      .populate("examTypeId", "name slug")
      .sort({ scheduledStartAt: 1 })
      .lean();

    const registrations = userId
      ? await ExamRegistrationModel.find({ userId, examId: { $in: exams.map((e) => e._id) } }).lean()
      : [];

    return exams.map((exam) => {
      const summary = serializeExamSummary(exam);
      const reg = registrations.find((r) => r.examId.toString() === exam._id.toString());
      if (reg) {
        summary.hasJoined = true;
        summary.roomId = reg.roomId?.toString();
        summary.hasFinished = ["submitted", "auto_submitted"].includes(reg?.status) || !!reg?.submittedAt;
      }
      return summary;
    });
  },

  async assignUserToRoom(examId, userId) {
    try {
      return await withOptionalTransaction(async (session) => {
        const existing = await applySession(
          ExamRegistrationModel.findOne({ examId, userId }).populate("roomId"),
          session
        );

        const exam = await getJoinableExam(examId, session);
        if (existing) {
          return serializeAssignment(existing, exam);
        }

        const room = await allocateRoom(exam, session);

        await ExamRegistrationModel.create(
          [
            {
              examId,
              userId,
              roomId: room._id,
              seatNumber: room.occupancy,
              assignedAt: new Date()
            }
          ],
          session ? { session } : undefined
        );

        const createdRegistration = await applySession(
          ExamRegistrationModel.findOne({ examId, userId }).populate("roomId"),
          session
        );

        return serializeAssignment(createdRegistration, exam);
      });
    } catch (error) {
      if (error?.code === 11000) {
        const [exam, registration] = await Promise.all([
          ExamModel.findById(examId),
          ExamRegistrationModel.findOne({ examId, userId }).populate("roomId")
        ]);

        if (exam && registration) {
          return serializeAssignment(registration, exam);
        }
      }

      throw error;
    }
  },

  async markUserConnected(examId, userId, socketId) {
    return ExamRegistrationModel.findOneAndUpdate(
      { examId, userId },
      {
        $set: {
          status: "connected",
          lastSocketId: socketId,
          connectedAt: new Date()
        }
      },
      { new: true }
    ).populate("roomId");
  },

  async getExamQuestionsForUser(examId, userId) {
    const [exam, registration] = await Promise.all([
      ExamModel.findById(examId).lean(),
      ExamRegistrationModel.findOne({ examId, userId }).lean()
    ]);

    if (!exam) {
      throw new AppError(404, "Exam was not found", { code: "EXAM_NOT_FOUND" });
    }

    if (!registration) {
      throw new AppError(403, "Join the exam before fetching questions", {
        code: "EXAM_NOT_JOINED"
      });
    }

    if (exam.status !== "live") {
      throw new AppError(423, "Exam has not started yet", {
        code: "EXAM_NOT_STARTED"
      });
    }

    return {
      exam: serializeExamSummary(exam),
      questions: exam.questionSnapshots.map(sanitizeQuestionForCandidate)
    };
  },

  async getRoomMonitoringSnapshot() {
    return ExamRoomModel.aggregate([
      {
        $lookup: {
          from: "exams",
          localField: "examId",
          foreignField: "_id",
          as: "exam"
        }
      },
      { $unwind: "$exam" },
      {
        $project: {
          _id: 0,
          examId: "$exam._id",
          examTitle: "$exam.title",
          examStatus: "$exam.status",
          roomCode: 1,
          roomNumber: 1,
          occupancy: 1,
          capacity: 1,
          status: 1,
          scheduledStartAt: "$exam.scheduledStartAt"
        }
      },
      { $sort: { scheduledStartAt: 1, roomNumber: 1 } }
    ]);
  },

  async getParticipantCount(examId) {
    try {
      const redis = await connectRedis();
      const cachedCount = await redis.scard(redisKeys.participants(String(examId)));
      if (Number.isFinite(cachedCount) && cachedCount > 0) {
        return cachedCount;
      }
    } catch {
      // Fall through to Mongo count when Redis is unavailable.
    }

    return ExamRegistrationModel.countDocuments({ examId });
  },

  async runScheduleTick() {
    const now = new Date();

    const examsToStart = await ExamModel.find({
      status: "scheduled",
      scheduledStartAt: { $lte: now }
    }).select("_id");

    const startedExams = [];
    for (const exam of examsToStart) {
      const updatedExam = await ExamModel.findOneAndUpdate(
        {
          _id: exam._id,
          status: "scheduled"
        },
        {
          $set: {
            status: "live",
            startedAt: now
          }
        },
        { new: true }
      );

      if (updatedExam) {
        startedExams.push(serializeExamSummary(updatedExam));
      }
    }

    const examsToComplete = await ExamModel.find({
      status: "live",
      scheduledEndAt: { $lte: now }
    }).select("_id");

    const completedExams = [];
    for (const exam of examsToComplete) {
      const updatedExam = await ExamModel.findOneAndUpdate(
        {
          _id: exam._id,
          status: "live"
        },
        {
          $set: {
            status: "completed",
            completedAt: now
          }
        },
        { new: true }
      );

      if (updatedExam) {
        completedExams.push(serializeExamSummary(updatedExam));
      }
    }

    return { startedExams, completedExams };
  },

  async getRealtimeExamClock() {
    const now = new Date();
    const exams = await ExamModel.find({
      status: { $in: ["scheduled", "live"] },
      scheduledEndAt: { $gt: now }
    })
      .select("_id status startedAt scheduledStartAt scheduledEndAt")
      .lean();

    return exams.map((exam) => ({
      id: exam._id.toString(),
      status: exam.status,
      startedAt: exam.startedAt,
      scheduledStartAt: exam.scheduledStartAt,
      scheduledEndAt: exam.scheduledEndAt
    }));
  }
};

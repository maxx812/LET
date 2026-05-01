import mongoose from "mongoose";
import { config } from "../config/env.js";
import { AppError } from "../shared/errors/app-error.js";
import { normalizeCsvHeader, parseCsvText } from "../shared/utils/csv.js";
import { buildQuestionContentHash } from "../shared/utils/question-hash.js";
import {
  buildQuestionDocument,
  normalizeQuestionPayload,
  toQuestionResponse
} from "../shared/utils/question-payload.js";
import { ExamAttemptModel } from "../models/exam-attempt.model.js";
import { ExamRoomModel } from "../models/exam-room.model.js";
import { ExamTypeModel } from "../models/exam-type.model.js";
import { ExamModel } from "../models/exam.model.js";
import { QuestionModel } from "../models/question.model.js";
import { SettingsModel, DEFAULT_SETTINGS } from "../models/settings.model.js";
import { SubjectModel } from "../models/subject.model.js";
import { UserModel } from "../models/user.model.js";
import { createQuestionSchema } from "../validations/admin.validation.js";
import { examService } from "./exam.service.js";

const CSV_HEADER_MAP = {
  questiontext: "questionText",
  question: "questionText",
  optiona: "optionA",
  optionb: "optionB",
  optionc: "optionC",
  optiond: "optionD",
  correctoption: "correctOption",
  correctanswer: "correctOption",
  answer: "correctOption",
  topic: "topic",
  examtype: "examType",
  subject: "subject",
  subtopic: "subtopic",
  difficulty: "difficulty",
  explanation: "explanation",
  language: "language",
  marks: "marks",
  negativemarks: "negativeMarks",
  source: "source"
};

const REQUIRED_CSV_HEADERS = [
  "questionText",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "topic",
  "difficulty"
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCsvQuestionPayload(row) {
  return {
    questionText: String(row.questionText || "").trim(),
    options: [
      { key: "A", text: String(row.optionA || "").trim() },
      { key: "B", text: String(row.optionB || "").trim() },
      { key: "C", text: String(row.optionC || "").trim() },
      { key: "D", text: String(row.optionD || "").trim() }
    ],
    correctOptionKey: (() => {
      const val = String(row.correctOption || "").trim().toUpperCase();
      const map = { "1": "A", "2": "B", "3": "C", "4": "D" };
      return map[val] || val;
    })(),
    topic: String(row.topic || "").trim(),
    examTypeId: row.examType,
    subjectId: row.subject,
    subtopic: String(row.subtopic || "").trim(),
    difficulty: String(row.difficulty || "")
      .trim()
      .toLowerCase(),
    explanation: String(row.explanation || "").trim(),
    language: String(row.language || "mr")
      .trim()
      .toLowerCase(),
    marks: row.marks ?? 1,
    negativeMarks: row.negativeMarks ?? 0,
    source: String(row.source || "").trim()
  };
}

function mapCsvRow(headers, row) {
  return headers.reduce((accumulator, header, index) => {
    if (!header) return accumulator;
    return {
      ...accumulator,
      [header]: row[index] ?? ""
    };
  }, {});
}

export const adminService = {
  // ── Exam Types & Subjects ──
  async listExamTypes() {
    return ExamTypeModel.find({ status: "active" }).sort({ name: 1 }).lean();
  },

  async createExamType(data) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return ExamTypeModel.create({ ...data, slug });
  },

  async listSubjects(examTypeId) {
    const query = { status: "active" };
    if (examTypeId) query.examTypeId = examTypeId;
    return SubjectModel.find(query).sort({ name: 1 }).lean();
  },

  async createSubject(data) {
    return SubjectModel.create(data);
  },

  async createQuestion(data, actorId) {
    const document = buildQuestionDocument(data, actorId);

    try {
      const question = await QuestionModel.create(document);
      return toQuestionResponse(question);
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError(409, "A duplicate question already exists", {
          code: "QUESTION_DUPLICATE"
        });
      }
      throw error;
    }
  },

  async updateQuestion(questionId, data, actorId) {
    const existingQuestion = await QuestionModel.findById(questionId);
    if (!existingQuestion) {
      throw new AppError(404, "Question was not found", {
        code: "QUESTION_NOT_FOUND"
      });
    }

    const nextPayload = normalizeQuestionPayload({
      questionText: data.questionText ?? existingQuestion.questionText,
      options: data.options ?? existingQuestion.options,
      correctOptionKey: data.correctOptionKey ?? existingQuestion.correctOptionKey,
      explanation: data.explanation ?? existingQuestion.explanation,
      topic: data.topic ?? existingQuestion.topic,
      subtopic: data.subtopic ?? existingQuestion.subtopic,
      difficulty: data.difficulty ?? existingQuestion.difficulty,
      language: data.language ?? existingQuestion.language,
      marks: data.marks ?? existingQuestion.marks,
      negativeMarks: data.negativeMarks ?? existingQuestion.negativeMarks,
      source: data.source ?? existingQuestion.source
    });
    existingQuestion.questionText = nextPayload.questionText;
    existingQuestion.options = nextPayload.options;
    existingQuestion.correctOptionKey = nextPayload.correctOptionKey;
    existingQuestion.explanation = nextPayload.explanation;
    existingQuestion.topic = nextPayload.topic;
    existingQuestion.subtopic = nextPayload.subtopic;
    existingQuestion.difficulty = nextPayload.difficulty;
    existingQuestion.language = nextPayload.language;
    existingQuestion.marks = nextPayload.marks;
    existingQuestion.negativeMarks = nextPayload.negativeMarks;
    existingQuestion.source = nextPayload.source;
    existingQuestion.status = data.status ?? existingQuestion.status;
    existingQuestion.updatedBy = actorId;
    existingQuestion.contentHash = buildQuestionContentHash(nextPayload);

    try {
      await existingQuestion.save();
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError(409, "A duplicate question already exists", {
          code: "QUESTION_DUPLICATE"
        });
      }
      throw error;
    }
    return toQuestionResponse(existingQuestion);
  },

  async listQuestions(filters = {}) {
    const query = {};

    if (filters.topic) query.topic = filters.topic;
    if (filters.examTypeId) query.examTypeId = filters.examTypeId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const pattern = new RegExp(escapeRegex(filters.search), "i");
      query.$or = [{ questionText: pattern }, { subtopic: pattern }, { questionCode: pattern }];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [questions, total, actualTopics] = await Promise.all([
      QuestionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      QuestionModel.countDocuments(query),
      QuestionModel.distinct("topic", { status: "active" })
    ]);

    return {
      items: questions.map(toQuestionResponse),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      allowedTopics: actualTopics.length > 0 ? actualTopics : config.allowedQuestionTopics
    };
  },

  async archiveQuestion(questionId) {
    const question = await QuestionModel.findByIdAndUpdate(
      questionId,
      { status: "archived" },
      { new: true }
    );

    if (!question) {
      throw new AppError(404, "Question was not found", {
        code: "QUESTION_NOT_FOUND"
      });
    }

    return toQuestionResponse(question);
  },

  async bulkUploadQuestions(file, actorId, targetExamTypeId = null, targetSubjectId = null) {
    let rows = [];
    const isJson = file.originalName.toLowerCase().endsWith(".json");

    if (isJson) {
      try {
        const data = JSON.parse(file.buffer.toString("utf8"));
        rows = Array.isArray(data) ? data : [data];
      } catch (err) {
        throw new AppError(400, "Invalid JSON format in uploaded file", { code: "INVALID_JSON" });
      }
    } else {
      rows = parseCsvText(file.buffer.toString("utf8"));
    }

    if (rows.length < (isJson ? 1 : 2)) {
      throw new AppError(400, "File must contain at least one question row", {
        code: "FILE_EMPTY"
      });
    }

    let dataRows = [];
    let headers = [];

    if (isJson) {
      dataRows = rows;
    } else {
      const [headerRow, ...rest] = rows;
      headerRow.forEach((header, index) => {
        const mapped = CSV_HEADER_MAP[normalizeCsvHeader(header)];
        if (mapped) headers[index] = mapped;
      });

      const missingHeaders = REQUIRED_CSV_HEADERS.filter((h) => !Object.values(headers).includes(h));
      if (missingHeaders.length > 0) {
        throw new AppError(422, "CSV is missing required columns", {
          code: "CSV_HEADERS_INVALID",
          details: { missingHeaders }
        });
      }
      dataRows = rest;
    }

    const validationErrors = [];
    const duplicateRows = [];
    const preparedRows = [];
    const seenHashes = new Set();

    for (const [index, row] of dataRows.entries()) {
      const rowNumber = index + (isJson ? 1 : 2);
      const rawRow = isJson ? row : mapCsvRow(headers, row);
      
      const payload = isJson ? {
        ...rawRow,
        examTypeId: rawRow.examTypeId || targetExamTypeId,
        subjectId: rawRow.subjectId || targetSubjectId
      } : buildCsvQuestionPayload({
        ...rawRow,
        examType: rawRow.examType || targetExamTypeId,
        subject: rawRow.subject || targetSubjectId
      });
      const { value, error } = createQuestionSchema.body.validate(payload, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        console.warn(`[BulkUpload] Row ${rowNumber} validation failed:`, error.details);
        validationErrors.push({
          rowNumber,
          reason: error.details.map((detail) => detail.message).join("; ")
        });
        continue;
      }

      const document = buildQuestionDocument(value, actorId);
      if (seenHashes.has(document.contentHash)) {
        duplicateRows.push({
          rowNumber,
          reason: "Duplicate question detected inside the uploaded CSV"
        });
        continue;
      }

      seenHashes.add(document.contentHash);
      preparedRows.push({ rowNumber, document });
    }

    const existingHashes = new Set(
      (
        await QuestionModel.find({
          contentHash: { $in: preparedRows.map((item) => item.document.contentHash) }
        })
          .select("contentHash")
          .lean()
      ).map((row) => row.contentHash)
    );

    const insertableRows = [];
    const now = new Date();
    for (const item of preparedRows) {
      if (existingHashes.has(item.document.contentHash)) {
        duplicateRows.push({
          rowNumber: item.rowNumber,
          reason: "Duplicate question already exists in the question bank"
        });
        continue;
      }

      insertableRows.push({
        ...item.document,
        createdAt: now,
        updatedAt: now
      });
    }

    const bulkResult =
      insertableRows.length > 0
        ? await QuestionModel.collection.bulkWrite(
          insertableRows.map((doc) => ({
            updateOne: {
              filter: { contentHash: doc.contentHash },
              update: { 
                $setOnInsert: {
                  ...doc,
                  examTypeId: new mongoose.Types.ObjectId(doc.examTypeId),
                  subjectId: new mongoose.Types.ObjectId(doc.subjectId),
                  createdBy: new mongoose.Types.ObjectId(doc.createdBy),
                  updatedBy: doc.updatedBy ? new mongoose.Types.ObjectId(doc.updatedBy) : new mongoose.Types.ObjectId(doc.createdBy)
                } 
              },
              upsert: true
            }
          })),
          { ordered: false }
        )
        : { upsertedCount: 0 };

    const insertedCount = bulkResult.upsertedCount || 0;
    const concurrentDuplicateCount = insertableRows.length - insertedCount;
    if (concurrentDuplicateCount > 0) {
      duplicateRows.push({
        rowNumber: null,
        reason: `${concurrentDuplicateCount} rows were skipped because they were inserted concurrently by another upload`
      });
    }

    const explicitSkippedCount = duplicateRows.filter((row) => row.rowNumber !== null).length;

    return {
      fileName: file.originalName,
      summary: {
        totalRows: dataRows.length,
        insertedCount,
        skippedCount: explicitSkippedCount + concurrentDuplicateCount,
        invalidCount: validationErrors.length
      },
      validationErrors,
      duplicateRows
    };
  },

  async createExam(data, createdBy) {
    return examService.createExam(data, createdBy);
  },

  async listExams(filters = {}) {
    return examService.listExams(filters);
  },

  async updateExam(examId, data) {
    return examService.updateExam(examId, data);
  },

  async publishExam(examId) {
    return examService.publishExam(examId);
  },

  async deleteExam(examId) {
    return examService.deleteExam(examId);
  },

  async listUsers() {
    return UserModel.find()
      .select("name email role authProvider district phone education category gender lastLoginAt createdAt isActive")
      .sort({ createdAt: -1 })
      .lean();
  },

  async toggleUserStatus(userId, action) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found", { code: "USER_NOT_FOUND" });
    }
    if (user.role === "admin") {
      throw new AppError(403, "Cannot suspend admin users", { code: "ADMIN_PROTECTED" });
    }
    user.isActive = action === "activate";
    await user.save();
    return { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
  },

  async getDashboardStats() {
    const [totalUsers, totalQuestions, totalExams, liveExams, scheduledExams, totalRooms] =
      await Promise.all([
        UserModel.countDocuments({ role: "user" }),
        QuestionModel.countDocuments({ status: "active" }),
        ExamModel.countDocuments(),
        ExamModel.countDocuments({ status: "live" }),
        ExamModel.countDocuments({ status: "scheduled" }),
        ExamRoomModel.countDocuments()
      ]);

    return {
      totalUsers,
      totalQuestions,
      totalExams,
      liveExams,
      scheduledExams,
      totalRooms
    };
  },

  async getAnalyticsData() {
    const [topicDistribution, difficultyDistribution, userGrowth, examStatusData, totalUsers, totalExams] = await Promise.all([
      QuestionModel.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$topic", count: { $sum: 1 } } },
        { $project: { _id: 0, topic: "$_id", count: 1 } },
        { $sort: { count: -1 } }
      ]),
      QuestionModel.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$difficulty", count: { $sum: 1 } } },
        { $project: { _id: 0, difficulty: "$_id", count: 1 } }
      ]),
      UserModel.aggregate([
        { $match: { role: "user" } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            users: { $sum: 1 }
          }
        },
        { $project: { _id: 0, d: "$_id", users: 1 } },
        { $sort: { d: 1 } },
        { $limit: 30 }
      ]),
      ExamModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } }
      ]),
      UserModel.countDocuments({ role: "user" }),
      ExamModel.countDocuments()
    ]);

    // Build participation data from exam attempts
    const participationData = await ExamAttemptModel.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          exams: { $sum: 1 }
        }
      },
      { $project: { _id: 0, d: "$_id", exams: 1 } },
      { $sort: { d: 1 } },
      { $limit: 30 }
    ]);

    // Avg score by topic
    const avgScoreData = await ExamAttemptModel.aggregate([
      { $match: { status: "evaluated" } },
      {
        $lookup: {
          from: "exams",
          localField: "examId",
          foreignField: "_id",
          as: "exam"
        }
      },
      { $unwind: "$exam" },
      { $unwind: "$exam.questionFilters.topics" },
      {
        $group: {
          _id: "$exam.questionFilters.topics",
          avg: { $avg: "$score" }
        }
      },
      { $project: { _id: 0, topic: "$_id", avg: { $round: ["$avg", 1] } } }
    ]);

    // Difficulty analysis
    const difficultyData = difficultyDistribution.map(d => ({
      level: d.difficulty ? d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1) : "Unknown",
      correct: d.count
    }));

    // Compute avg score & pass rate from attempts
    const attemptStats = await ExamAttemptModel.aggregate([
      { $match: { status: "evaluated" } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$accuracy" },
          totalEvaluated: { $sum: 1 },
          passed: {
            $sum: { $cond: [{ $gte: ["$accuracy", 40] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = attemptStats[0] || { avgScore: 0, totalEvaluated: 0, passed: 0 };

    return {
      growthData: userGrowth,
      participationData,
      avgScoreData: avgScoreData.length > 0 ? avgScoreData : topicDistribution.map(t => ({ topic: t.topic, avg: t.count })),
      difficultyData,
      topicDistribution,
      difficultyDistribution,
      examStatusData,
      totalUsers,
      totalExams,
      avgScore: Math.round(stats.avgScore || 0),
      passRate: stats.totalEvaluated > 0 ? Math.round((stats.passed / stats.totalEvaluated) * 100) : 0
    };
  },

  // ── Settings CRUD ──
  async getSettings() {
    const docs = await SettingsModel.find().lean();
    const result = { ...DEFAULT_SETTINGS };
    for (const doc of docs) {
      result[doc.key] = { ...DEFAULT_SETTINGS[doc.key], ...doc.data };
    }
    return result;
  },

  async saveSettings(settingsData, actorId) {
    const validKeys = Object.keys(DEFAULT_SETTINGS);
    const ops = [];

    for (const [key, data] of Object.entries(settingsData)) {
      if (!validKeys.includes(key)) continue;
      ops.push(
        SettingsModel.findOneAndUpdate(
          { key },
          { $set: { data, updatedBy: actorId } },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(ops);
    return this.getSettings();
  },

  // ── Leaderboard (admin view) ──
  async getLeaderboard(examId, limit = 50) {
    const statusFilter = { $in: ["evaluated", "submitted", "auto_submitted"] };
    
    if (examId) {
      // For a specific exam, show all attempts (each user can only have one anyway)
      const attempts = await ExamAttemptModel.find({ examId, status: statusFilter })
        .sort({ score: -1, timeTakenSeconds: 1 })
        .limit(limit)
        .select("userName userEmail score accuracy correctCount wrongCount skippedCount timeTakenSeconds rank qualified examId")
        .lean();

      return {
        entries: attempts,
        total: await ExamAttemptModel.countDocuments({ examId, status: statusFilter })
      };
    } else {
      // For global leaderboard, show unique users with their BEST score across all exams
      const pipeline = [
        { $match: { status: statusFilter } },
        {
          $sort: { score: -1, timeTakenSeconds: 1 }
        },
        {
          $group: {
            _id: "$userId",
            userName: { $first: "$userName" },
            userEmail: { $first: "$userEmail" },
            score: { $first: "$score" },
            accuracy: { $first: "$accuracy" },
            correctCount: { $first: "$correctCount" },
            wrongCount: { $first: "$wrongCount" },
            skippedCount: { $first: "$skippedCount" },
            timeTakenSeconds: { $first: "$timeTakenSeconds" },
            rank: { $first: "$rank" },
            qualified: { $first: "$qualified" },
            examId: { $first: "$examId" }
          }
        },
        { $sort: { score: -1, timeTakenSeconds: 1 } },
        { $limit: limit }
      ];

      const entries = await ExamAttemptModel.aggregate(pipeline);
      
      // Total unique users who have participated
      const totalResult = await ExamAttemptModel.aggregate([
        { $match: { status: statusFilter } },
        { $group: { _id: "$userId" } },
        { $count: "count" }
      ]);

      return {
        entries,
        total: totalResult[0]?.count || 0
      };
    }
  }
};

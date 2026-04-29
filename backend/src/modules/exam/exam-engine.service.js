import { config } from "../../config/env.js";
import { connectRedis } from "../../shared/redis/redis.client.js";
import { AppError } from "../../shared/errors/app-error.js";
import { UserModel } from "../user/user.model.js";
import { ExamAttemptModel } from "./exam-attempt.model.js";
import { redisKeys } from "./exam-engine.redis.js";
import { ExamModel } from "./exam.model.js";
import { ExamRegistrationModel } from "./exam-registration.model.js";
import { examService } from "./exam.service.js";

const EXAM_CACHE_TTL_MS = 15_000;
const SCORE_PRECISION_FACTOR = 1_000;
const LEADERBOARD_SCORE_FACTOR = 1_000_000_000;
const QUESTION_OPTION_KEYS = new Set(["A", "B", "C", "D"]);

const runtimeExamCache = new Map();

function toIdString(value) {
  return value?.toString?.() || String(value);
}

function calculateTtlSeconds(exam) {
  const now = Date.now();
  const endAt = new Date(exam.scheduledEndAt).getTime();
  const remaining = Math.ceil((endAt - now) / 1000);
  return Math.max(config.examRuntimeTtlSeconds, remaining + 24 * 60 * 60);
}

function normalizeAnswerOption(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  return QUESTION_OPTION_KEYS.has(normalized) ? normalized : "__INVALID__";
}

function normalizeIncomingAnswers(payload) {
  if (Array.isArray(payload?.answers) && payload.answers.length > 0) {
    return payload.answers;
  }

  if (payload?.questionCode) {
    return [payload];
  }

  return [];
}

function computeLeaderboardComposite(score, timeTakenSeconds) {
  const scoreMilli = Math.round(Number(score) * SCORE_PRECISION_FACTOR);
  return scoreMilli * LEADERBOARD_SCORE_FACTOR - Math.floor(timeTakenSeconds * 1000);
}

function buildExamStartPayload(exam) {
  const startedAt = exam.startedAt || exam.scheduledStartAt;
  const now = new Date();
  const timeRemainingSeconds = Math.max(
    0,
    Math.floor((new Date(exam.scheduledEndAt).getTime() - now.getTime()) / 1000)
  );

  return {
    examId: toIdString(exam._id),
    status: exam.status,
    deliveryMode: exam.questionDeliveryMode || "bulk",
    questionCount: exam.questionSnapshots.length,
    startedAt,
    scheduledEndAt: exam.scheduledEndAt,
    serverNow: now,
    timeRemainingSeconds,
    fetchQuestionsPath: `/api/user/exams/${toIdString(exam._id)}/questions`,
    submitAnswerPath: `/api/user/exams/${toIdString(exam._id)}/submit-answer`,
    submitExamPath: `/api/user/exams/${toIdString(exam._id)}/submit-exam`,
    syncPolicy: {
      strategy: "frontend-local-plus-periodic-sync",
      syncIntervalMs: config.answerSyncIntervalMs
    }
  };
}

function buildQuestionLookup(exam) {
  return new Map(exam.questionSnapshots.map((question, index) => [question.questionCode, { question, index }]));
}

function serializeAnswerRecord(record) {
  return JSON.stringify({
    questionCode: record.questionCode,
    selectedOptionKey: record.selectedOptionKey,
    clientRevision: record.clientRevision,
    submittedAt: new Date(record.submittedAt).toISOString(),
    source: record.source
  });
}

function deserializeAnswerRecord(rawValue) {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    return {
      questionCode: parsed.questionCode,
      selectedOptionKey: parsed.selectedOptionKey || null,
      clientRevision: Number(parsed.clientRevision || 0),
      submittedAt: new Date(parsed.submittedAt),
      source: parsed.source || "http"
    };
  } catch {
    return null;
  }
}

function answerMapFromAttempt(attempt) {
  const entries = (attempt?.answerSheet || []).map((answer) => [
    answer.questionCode,
    {
      questionCode: answer.questionCode,
      selectedOptionKey: answer.selectedOptionKey,
      clientRevision: answer.clientRevision || 0,
      submittedAt: new Date(answer.submittedAt),
      source: answer.source || "http"
    }
  ]);

  return new Map(entries);
}

function mapHashToAnswerMap(hash) {
  const answerMap = new Map();
  for (const [questionCode, rawValue] of Object.entries(hash || {})) {
    const parsed = deserializeAnswerRecord(rawValue);
    if (parsed) {
      answerMap.set(questionCode, parsed);
    }
  }
  return answerMap;
}

function buildStoredAnswerSheet(exam, answerMap) {
  const lookup = buildQuestionLookup(exam);
  return [...answerMap.values()].sort((left, right) => {
    const leftIndex = lookup.get(left.questionCode)?.index ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = lookup.get(right.questionCode)?.index ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

function evaluateAnswerMap(exam, answerMap, evaluationTime) {
  let score = 0;
  let answeredCount = 0;
  let correctCount = 0;
  let wrongCount = 0;

  for (const question of exam.questionSnapshots) {
    const answer = answerMap.get(question.questionCode);
    if (!answer || !answer.selectedOptionKey) {
      continue;
    }

    answeredCount += 1;
    if (answer.selectedOptionKey === question.correctOptionKey) {
      correctCount += 1;
      score += Number(question.marks);
    } else {
      wrongCount += 1;
      score -= Number(question.negativeMarks || 0);
    }
  }

  const totalQuestions = exam.questionSnapshots.length;
  const skippedCount = Math.max(0, totalQuestions - answeredCount);
  const safeScore = Number(score.toFixed(2));
  const accuracy = answeredCount === 0 ? 0 : Number(((correctCount / answeredCount) * 100).toFixed(2));
  const examStartTime = new Date(exam.startedAt || exam.scheduledStartAt).getTime();
  const examEndTime = new Date(exam.scheduledEndAt).getTime();
  const effectiveTime = Math.min(new Date(evaluationTime).getTime(), examEndTime);
  const timeTakenSeconds = Math.max(0, Math.floor((effectiveTime - examStartTime) / 1000));

  return {
    score: safeScore,
    answeredCount,
    correctCount,
    wrongCount,
    skippedCount,
    accuracy,
    timeTakenSeconds,
    leaderboardComposite: computeLeaderboardComposite(safeScore, timeTakenSeconds)
  };
}

function serializeLeaderboardEntry(meta, rank) {
  return {
    rank,
    userId: meta.userId,
    name: meta.name,
    score: meta.score,
    accuracy: meta.accuracy,
    answeredCount: meta.answeredCount,
    timeTakenSeconds: meta.timeTakenSeconds,
    status: meta.status
  };
}

function serializeResult(attempt, exam) {
  const totalPossibleScore = exam.questionSnapshots.reduce(
    (sum, question) => sum + Number(question.marks || 0),
    0
  );

  return {
    examId: toIdString(attempt.examId),
    title: exam.title,
    status: attempt.status,
    score: attempt.score,
    accuracy: attempt.accuracy,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    skippedCount: attempt.skippedCount,
    answeredCount: attempt.answeredCount,
    timeTakenSeconds: attempt.timeTakenSeconds,
    rank: attempt.rank,
    qualified: attempt.qualified,
    qualificationStatus: attempt.qualificationStatus,
    submittedAt: attempt.submittedAt,
    finalizedAt: attempt.finalizedAt,
    totalQuestions: exam.questionSnapshots.length,
    totalPossibleScore
  };
}

function buildEvaluatedAnswerSheet(exam, answerMap) {
  return exam.questionSnapshots.map((question, index) => {
    const answer = answerMap.get(question.questionCode);
    const selectedOptionKey = answer?.selectedOptionKey || null;
    const isCorrect = selectedOptionKey
      ? selectedOptionKey === question.correctOptionKey
      : null;

    return {
      position: index + 1,
      questionCode: question.questionCode,
      selectedOptionKey,
      correctOptionKey: question.correctOptionKey,
      correct: isCorrect,
      topic: question.topic
    };
  });
}

function buildTopicBreakdown(exam, answerMap) {
  const topicMap = new Map();

  for (const question of exam.questionSnapshots) {
    const topicKey = question.topic || "General";
    const current = topicMap.get(topicKey) || {
      topic: topicKey,
      score: 0,
      maxScore: 0,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      totalQuestions: 0
    };

    current.totalQuestions += 1;
    current.maxScore += Number(question.marks || 0);

    const answer = answerMap.get(question.questionCode);
    if (!answer?.selectedOptionKey) {
      current.skippedCount += 1;
      topicMap.set(topicKey, current);
      continue;
    }

    if (answer.selectedOptionKey === question.correctOptionKey) {
      current.correctCount += 1;
      current.score += Number(question.marks || 0);
    } else {
      current.wrongCount += 1;
      current.score -= Number(question.negativeMarks || 0);
    }

    topicMap.set(topicKey, current);
  }

  return [...topicMap.values()].map((topic) => {
    const answeredCount = topic.correctCount + topic.wrongCount;
    const accuracy =
      answeredCount === 0
        ? 0
        : Number(((topic.correctCount / answeredCount) * 100).toFixed(2));

    return {
      ...topic,
      score: Number(topic.score.toFixed(2)),
      accuracy,
      weak: accuracy > 0 && accuracy < 60
    };
  });
}

function normalizeSubmitPayload(payloadOrTrigger) {
  if (typeof payloadOrTrigger === "string") {
    return {
      trigger: payloadOrTrigger,
      answers: []
    };
  }

  return {
    trigger: payloadOrTrigger?.trigger || "manual",
    answers: Array.isArray(payloadOrTrigger?.answers) ? payloadOrTrigger.answers : []
  };
}

async function loadExamRuntime(examId, { refresh = false, allowCompleted = true } = {}) {
  const cacheKey = String(examId);
  const cached = runtimeExamCache.get(cacheKey);

  if (!refresh && cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const exam = await ExamModel.findById(examId).lean();
  if (!exam) {
    throw new AppError(404, "Exam was not found", {
      code: "EXAM_NOT_FOUND"
    });
  }

  if (!allowCompleted && exam.status === "completed") {
    throw new AppError(409, "Exam is already completed", {
      code: "EXAM_COMPLETED"
    });
  }

  const cacheEntry = {
    exam,
    lookup: buildQuestionLookup(exam),
    expiresAt: Date.now() + EXAM_CACHE_TTL_MS
  };

  runtimeExamCache.set(cacheKey, cacheEntry);
  return cacheEntry;
}

async function getOrCreateAttemptDocument(examId, userId, assignment = null) {
  let attempt = await ExamAttemptModel.findOne({ examId, userId });
  if (attempt) return attempt;

  const [registration, user] = await Promise.all([
    ExamRegistrationModel.findOne({ examId, userId }),
    UserModel.findById(userId).select("name email")
  ]);

  if (!registration) {
    throw new AppError(403, "Join the exam before starting the attempt", {
      code: "EXAM_NOT_JOINED"
    });
  }

  if (!user) {
    throw new AppError(404, "User was not found", {
      code: "USER_NOT_FOUND"
    });
  }

  attempt = await ExamAttemptModel.findOneAndUpdate(
    { examId, userId },
    {
      $setOnInsert: {
        examId,
        userId,
        userName: user.name,
        userEmail: user.email,
        status: "ready"
      },
      $set: {
        roomId: assignment?.roomId || registration.roomId,
        seatNumber: assignment?.seatNumber || registration.seatNumber
      }
    },
    {
      new: true,
      upsert: true
    }
  );

  return attempt;
}

async function readAnswerMap(examId, userId, fallbackAttempt = null) {
  const redis = await connectRedis();
  const hash = await redis.hgetall(redisKeys.attemptAnswers(examId, userId));
  const redisAnswerMap = mapHashToAnswerMap(hash);

  if (redisAnswerMap.size > 0) {
    return redisAnswerMap;
  }

  return answerMapFromAttempt(fallbackAttempt);
}

async function ensureAttemptRuntime(exam, attempt) {
  const redis = await connectRedis();
  const ttlSeconds = calculateTtlSeconds(exam);
  const answerKey = redisKeys.attemptAnswers(toIdString(exam._id), toIdString(attempt.userId));
  const metaKey = redisKeys.attemptMeta(toIdString(exam._id), toIdString(attempt.userId));
  const metaPayload = {
    userId: toIdString(attempt.userId),
    name: attempt.userName,
    email: attempt.userEmail,
    roomId: toIdString(attempt.roomId),
    seatNumber: String(attempt.seatNumber),
    status: attempt.status,
    submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : "",
    lastSyncedAt: attempt.lastSyncedAt ? new Date(attempt.lastSyncedAt).toISOString() : ""
  };

  const answerCount = await redis.hlen(answerKey);
  const pipeline = redis.pipeline();
  pipeline.sadd(redisKeys.participants(toIdString(exam._id)), toIdString(attempt.userId));
  pipeline.hset(metaKey, metaPayload);
  pipeline.expire(metaKey, ttlSeconds);
  pipeline.expire(redisKeys.participants(toIdString(exam._id)), ttlSeconds);
  pipeline.hset(redisKeys.examRuntimeState(toIdString(exam._id)), {
    status: exam.status,
    startedAt: new Date(exam.startedAt || exam.scheduledStartAt).toISOString(),
    scheduledEndAt: new Date(exam.scheduledEndAt).toISOString(),
    resultsGeneratedAt: exam.resultsGeneratedAt ? new Date(exam.resultsGeneratedAt).toISOString() : ""
  });
  pipeline.expire(redisKeys.examRuntimeState(toIdString(exam._id)), ttlSeconds);

  if (answerCount === 0 && attempt.answerSheet.length > 0) {
    for (const answer of attempt.answerSheet) {
      pipeline.hset(answerKey, answer.questionCode, serializeAnswerRecord(answer));
    }
  }

  pipeline.expire(answerKey, ttlSeconds);
  await pipeline.exec();
}

async function persistAttemptSnapshot(exam, attempt, answerMap, meta = {}) {
  const evaluationTime = meta.submittedAt || meta.evaluationTime || new Date();
  const metrics = evaluateAnswerMap(exam, answerMap, evaluationTime);
  const answerSheet = buildStoredAnswerSheet(exam, answerMap);
  const status = meta.status || attempt.status;
  const submittedAt = meta.submittedAt || attempt.submittedAt || null;

  attempt.answerSheet = answerSheet;
  attempt.answeredCount = metrics.answeredCount;
  attempt.lastAnswerAt = answerSheet.length > 0 ? answerSheet[answerSheet.length - 1].submittedAt : attempt.lastAnswerAt;
  attempt.lastSyncedAt = new Date();
  attempt.syncVersion += 1;
  attempt.status = status;
  attempt.provisionalScore = metrics.score;
  attempt.score = metrics.score;
  attempt.accuracy = metrics.accuracy;
  attempt.correctCount = metrics.correctCount;
  attempt.wrongCount = metrics.wrongCount;
  attempt.skippedCount = metrics.skippedCount;
  attempt.timeTakenSeconds = metrics.timeTakenSeconds;
  attempt.leaderboardComposite = metrics.leaderboardComposite;

  if (meta.firstAnswerAt && !attempt.firstAnswerAt) {
    attempt.firstAnswerAt = meta.firstAnswerAt;
  }

  if (submittedAt) {
    attempt.submittedAt = submittedAt;
    attempt.finalizedAt = meta.finalizedAt || attempt.finalizedAt;
    attempt.finalSubmissionSource = meta.finalSubmissionSource || attempt.finalSubmissionSource;
  }

  await attempt.save();
  return metrics;
}

async function updateLeaderboard(exam, attempt, metrics, statusOverride = null) {
  const redis = await connectRedis();
  const examId = toIdString(exam._id);
  const userId = toIdString(attempt.userId);
  const ttlSeconds = calculateTtlSeconds(exam);
  const metaPayload = {
    userId,
    name: attempt.userName,
    score: metrics.score,
    accuracy: metrics.accuracy,
    answeredCount: metrics.answeredCount,
    timeTakenSeconds: metrics.timeTakenSeconds,
    status: statusOverride || attempt.status
  };

  await redis
    .pipeline()
    .zadd(redisKeys.leaderboardZSet(examId), metrics.leaderboardComposite, userId)
    .hset(redisKeys.leaderboardMeta(examId), userId, JSON.stringify(metaPayload))
    .sadd(redisKeys.leaderboardDirtyIndex(), examId)
    .expire(redisKeys.leaderboardZSet(examId), ttlSeconds)
    .expire(redisKeys.leaderboardMeta(examId), ttlSeconds)
    .exec();
}

async function getAttemptAndExam(examId, userId, options = {}) {
  const [{ exam }, attempt] = await Promise.all([
    loadExamRuntime(examId, options),
    getOrCreateAttemptDocument(examId, userId)
  ]);

  await ensureAttemptRuntime(exam, attempt);
  return { exam, attempt };
}

async function getProvisionalRank(examId, userId) {
  const redis = await connectRedis();
  const rank = await redis.zrevrank(redisKeys.leaderboardZSet(examId), String(userId));
  return rank === null ? null : rank + 1;
}

async function buildLeaderboardSnapshot(examId, topN = config.leaderboardTopN) {
  const redis = await connectRedis();
  const [members, participantCount] = await Promise.all([
    redis.zrevrange(redisKeys.leaderboardZSet(examId), 0, topN - 1),
    redis.zcard(redisKeys.leaderboardZSet(examId))
  ]);

  if (members.length === 0) {
    return {
      examId,
      participantCount,
      updatedAt: new Date(),
      topEntries: []
    };
  }

  const pipeline = redis.pipeline();
  for (const member of members) {
    pipeline.hget(redisKeys.leaderboardMeta(examId), member);
  }
  const results = await pipeline.exec();

  const topEntries = results.map(([, value], index) => {
    const parsed = value ? JSON.parse(value) : { userId: members[index], name: "Unknown" };
    return serializeLeaderboardEntry(parsed, index + 1);
  });

  return {
    examId,
    participantCount,
    updatedAt: new Date(),
    topEntries
  };
}

function validateAnswerWindow(exam, attempt) {
  const now = new Date();
  if (exam.status !== "live" || !exam.startedAt) {
    throw new AppError(409, "Exam is not live yet", {
      code: "EXAM_NOT_LIVE"
    });
  }

  if (new Date(exam.scheduledEndAt) <= now) {
    throw new AppError(409, "Exam time has already ended", {
      code: "EXAM_TIME_OVER"
    });
  }

  if (["submitted", "auto_submitted", "evaluated"].includes(attempt.status)) {
    throw new AppError(409, "Attempt is already closed", {
      code: "ATTEMPT_ALREADY_SUBMITTED"
    });
  }
}

async function finalizePendingAttempt(exam, attempt, submissionSource, submittedAtOverride = null) {
  const answerMap = await readAnswerMap(toIdString(exam._id), toIdString(attempt.userId), attempt);
  const submittedAt = submittedAtOverride || attempt.submittedAt || new Date(exam.scheduledEndAt);
  const status = submissionSource === "auto" ? "auto_submitted" : "submitted";

  const metrics = await persistAttemptSnapshot(exam, attempt, answerMap, {
    status,
    submittedAt,
    finalizedAt: new Date(),
    finalSubmissionSource: submissionSource
  });

  await Promise.all([
    ExamRegistrationModel.findOneAndUpdate(
      { examId: exam._id, userId: attempt.userId },
      {
        $set: {
          status: status === "auto_submitted" ? "auto_submitted" : "submitted",
          submittedAt
        }
      }
    ),
    updateLeaderboard(exam, attempt, metrics, status)
  ]);

  const redis = await connectRedis();
  await redis.hset(redisKeys.attemptMeta(toIdString(exam._id), toIdString(attempt.userId)), {
    status,
    submittedAt: submittedAt.toISOString()
  });

  return metrics;
}

async function upsertAnswerPayload(
  examId,
  exam,
  attempt,
  payload,
  source = "http",
  { allowClosedWindow = false } = {}
) {
  if (!allowClosedWindow) {
    validateAnswerWindow(exam, attempt);
  }

  const answers = normalizeIncomingAnswers(payload);
  if (answers.length === 0) {
    throw new AppError(422, "At least one answer must be provided", {
      code: "NO_ANSWERS_PROVIDED"
    });
  }

  const redis = await connectRedis();
  const answerKey = redisKeys.attemptAnswers(examId, toIdString(attempt.userId));
  const currentHash = await redis.hgetall(answerKey);
  const currentAnswerMap = mapHashToAnswerMap(currentHash);
  const acceptedAnswers = [];
  const rejectedAnswers = [];
  const now = new Date();
  const pipeline = redis.pipeline();

  for (const item of answers) {
    const normalizedQuestionCode = String(item.questionCode || "").trim();
    const questionEntry =
      runtimeExamCache.get(String(examId))?.lookup.get(normalizedQuestionCode) ||
      buildQuestionLookup(exam).get(normalizedQuestionCode);

    if (!questionEntry) {
      rejectedAnswers.push({
        questionCode: normalizedQuestionCode,
        reason: "Question is not part of this exam"
      });
      continue;
    }

    const normalizedOption = normalizeAnswerOption(item.selectedOptionKey);
    if (normalizedOption === "__INVALID__") {
      rejectedAnswers.push({
        questionCode: normalizedQuestionCode,
        reason: "Selected option is invalid"
      });
      continue;
    }

    const nextRevision = Number(item.clientRevision || 0);
    const existingRecord = currentAnswerMap.get(normalizedQuestionCode);
    if (existingRecord && nextRevision <= existingRecord.clientRevision) {
      rejectedAnswers.push({
        questionCode: normalizedQuestionCode,
        reason: "Older or duplicate answer revision ignored"
      });
      continue;
    }

    if (normalizedOption === null) {
      currentAnswerMap.delete(normalizedQuestionCode);
      pipeline.hdel(answerKey, normalizedQuestionCode);
      acceptedAnswers.push({
        questionCode: normalizedQuestionCode,
        cleared: true,
        clientRevision: nextRevision
      });
      continue;
    }

    const record = {
      questionCode: normalizedQuestionCode,
      selectedOptionKey: normalizedOption,
      clientRevision: nextRevision,
      submittedAt: item.submittedAt ? new Date(item.submittedAt) : now,
      source
    };

    currentAnswerMap.set(normalizedQuestionCode, record);
    pipeline.hset(answerKey, normalizedQuestionCode, serializeAnswerRecord(record));
    acceptedAnswers.push({
      questionCode: normalizedQuestionCode,
      selectedOptionKey: normalizedOption,
      clientRevision: nextRevision
    });
  }

  const timeRemainingSeconds = Math.max(
    0,
    Math.floor((new Date(exam.scheduledEndAt).getTime() - now.getTime()) / 1000)
  );

  if (acceptedAnswers.length === 0 && rejectedAnswers.length > 0) {
    return {
      acceptedAnswers,
      rejectedAnswers,
      serverNow: now,
      timeRemainingSeconds,
      metrics: null
    };
  }

  const firstAnswerAt = attempt.firstAnswerAt || now;
  const metrics = evaluateAnswerMap(exam, currentAnswerMap, now);
  attempt.status = "in_progress";
  attempt.firstAnswerAt = firstAnswerAt;
  attempt.lastHeartbeatAt = now;

  const ttlSeconds = calculateTtlSeconds(exam);
  pipeline.sadd(redisKeys.attemptDirtySet(examId), toIdString(attempt.userId));
  pipeline.sadd(redisKeys.dirtyExamIndex(), String(examId));
  pipeline.expire(answerKey, ttlSeconds);
  pipeline.hset(redisKeys.attemptMeta(examId, toIdString(attempt.userId)), {
    status: "in_progress",
    lastAnswerAt: now.toISOString(),
    firstAnswerAt: firstAnswerAt.toISOString()
  });
  pipeline.expire(redisKeys.attemptMeta(examId, toIdString(attempt.userId)), ttlSeconds);
  await pipeline.exec();

  return {
    acceptedAnswers,
    rejectedAnswers,
    serverNow: now,
    timeRemainingSeconds,
    metrics
  };
}

export const examEngineService = {
  async onExamStarted(examId) {
    const { exam } = await loadExamRuntime(examId, { refresh: true });
    const redis = await connectRedis();
    await redis.hset(redisKeys.examRuntimeState(toIdString(exam._id)), {
      status: exam.status,
      startedAt: new Date(exam.startedAt || exam.scheduledStartAt).toISOString(),
      scheduledEndAt: new Date(exam.scheduledEndAt).toISOString()
    });

    return buildExamStartPayload(exam);
  },

  async joinExamSession(examId, userId) {
    const assignment = await examService.assignUserToRoom(examId, userId);
    const { exam } = await loadExamRuntime(examId, { allowCompleted: false });
    const attempt = await getOrCreateAttemptDocument(examId, userId, assignment);
    attempt.lastHeartbeatAt = new Date();
    await attempt.save();
    await ensureAttemptRuntime(exam, attempt);

    return {
      assignment,
      examSession: {
        examId,
        status: exam.status,
        questionDeliveryMode: exam.questionDeliveryMode || "bulk",
        startedAt: exam.startedAt,
        scheduledStartAt: exam.scheduledStartAt,
        scheduledEndAt: exam.scheduledEndAt
      }
    };
  },

  async getQuestionDelivery(examId, userId) {
    const { exam, attempt } = await getAttemptAndExam(examId, userId);

    if (exam.status !== "live") {
      throw new AppError(423, "Exam has not started yet", {
        code: "EXAM_NOT_STARTED"
      });
    }

    if (!attempt.questionDeliveredAt) {
      attempt.questionDeliveredAt = new Date();
      await attempt.save();
    }

    const answerMap = await readAnswerMap(examId, userId, attempt);
    const resumeAnswers = [...answerMap.values()].map((answer) => ({
      questionCode: answer.questionCode,
      selectedOptionKey: answer.selectedOptionKey,
      clientRevision: answer.clientRevision,
      submittedAt: answer.submittedAt
    }));

    return {
      exam: {
        ...buildExamStartPayload(exam),
        title: exam.title,
        instructions: exam.instructions
      },
      questions: exam.questionSnapshots.map((question, index) => ({
        position: index + 1,
        questionCode: question.questionCode,
        questionText: question.questionText,
        options: question.options,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        language: question.language,
        marks: question.marks,
        negativeMarks: question.negativeMarks
      })),
      answerState: {
        answeredCount: resumeAnswers.length,
        answers: resumeAnswers
      },
      syncPolicy: {
        strategy: "frontend-local-plus-periodic-sync",
        syncIntervalMs: config.answerSyncIntervalMs,
        submitAnswerPath: `/api/user/exams/${examId}/submit-answer`,
        submitExamPath: `/api/user/exams/${examId}/submit-exam`
      }
    };
  },

  async submitAnswer(examId, userId, payload, source = "http") {
    const { exam, attempt } = await getAttemptAndExam(examId, userId, { allowCompleted: false });
    const result = await upsertAnswerPayload(examId, exam, attempt, payload, source);
    const { acceptedAnswers, rejectedAnswers, serverNow, timeRemainingSeconds, metrics } = result;

    if (!metrics) {
      return {
        acceptedAnswers,
        rejectedAnswers,
        serverNow,
        timeRemainingSeconds
      };
    }

    await updateLeaderboard(exam, attempt, metrics, "in_progress");
    const rank = await getProvisionalRank(examId, userId);

    return {
      acceptedAnswers,
      rejectedAnswers,
      serverNow,
      timeRemainingSeconds,
      leaderboard: {
        score: metrics.score,
        accuracy: metrics.accuracy,
        answeredCount: metrics.answeredCount,
        timeTakenSeconds: metrics.timeTakenSeconds,
        rank
      }
    };
  },

  async submitExam(examId, userId, payloadOrTrigger = "manual") {
    const { exam, attempt } = await getAttemptAndExam(examId, userId, {
      allowCompleted: true
    });
    const { trigger, answers } = normalizeSubmitPayload(payloadOrTrigger);

    if (exam.status === "scheduled" && new Date(exam.scheduledStartAt) > new Date()) {
      throw new AppError(409, "Exam has not started yet", {
        code: "EXAM_NOT_STARTED"
      });
    }

    if (["draft", "cancelled"].includes(exam.status)) {
      throw new AppError(409, "Exam is not accepting submissions", {
        code: "EXAM_NOT_SUBMITTABLE"
      });
    }

    if (attempt.status === "evaluated" || ["submitted", "auto_submitted"].includes(attempt.status)) {
      return {
        alreadySubmitted: true,
        result: serializeResult(attempt, exam)
      };
    }

    if (answers.length > 0) {
      await upsertAnswerPayload(
        examId,
        exam,
        attempt,
        { answers },
        trigger === "socket_manual" ? "socket" : "http",
        { allowClosedWindow: true }
      );
    }

    const submittedAt = new Date(
      Math.min(Date.now(), new Date(exam.scheduledEndAt).getTime())
    );

    await finalizePendingAttempt(
      exam,
      attempt,
      trigger === "auto" ? "auto" : trigger,
      submittedAt
    );

    const refreshedAttempt = await ExamAttemptModel.findOne({ examId, userId });
    return {
      alreadySubmitted: false,
      result: serializeResult(refreshedAttempt, exam),
      submittedAt
    };
  },

  async getResult(examId, userId) {
    const [{ exam }, attempt, topperAttempt] = await Promise.all([
      loadExamRuntime(examId, { allowCompleted: true }),
      ExamAttemptModel.findOne({ examId, userId }).lean(),
      ExamAttemptModel.findOne({ examId })
        .sort({ rank: 1, score: -1, timeTakenSeconds: 1 })
        .lean()
    ]);

    if (!attempt) {
      throw new AppError(404, "Attempt was not found", {
        code: "ATTEMPT_NOT_FOUND"
      });
    }

    const answerMap = answerMapFromAttempt(attempt);
    const topperAnswerMap = topperAttempt ? answerMapFromAttempt(topperAttempt) : new Map();
    const result = serializeResult(attempt, exam);

    return {
      resultReady: Boolean(attempt.rank || attempt.qualificationStatus !== "pending" || exam.resultsGeneratedAt),
      examStatus: exam.status,
      resultsGeneratedAt: exam.resultsGeneratedAt,
      result: {
        ...result,
        answerSheet: buildEvaluatedAnswerSheet(exam, answerMap),
        topicBreakdown: buildTopicBreakdown(exam, answerMap),
        topperTopicBreakdown: buildTopicBreakdown(exam, topperAnswerMap)
      }
    };
  },

  async flushDirtyAttempts() {
    const redis = await connectRedis();
    const dirtyExamIds = await redis.smembers(redisKeys.dirtyExamIndex());

    for (const examId of dirtyExamIds) {
      const dirtyUserIds = await redis.smembers(redisKeys.attemptDirtySet(examId));
      const batchUserIds = dirtyUserIds.slice(0, config.answerFlushBatchSize);

      if (batchUserIds.length === 0) {
        await redis.srem(redisKeys.dirtyExamIndex(), examId);
        continue;
      }

      const { exam } = await loadExamRuntime(examId, { allowCompleted: true });
      const attempts = await ExamAttemptModel.find({
        examId,
        userId: { $in: batchUserIds }
      });

      const attemptMap = new Map(attempts.map((attempt) => [toIdString(attempt.userId), attempt]));
      const pipeline = redis.pipeline();
      for (const userId of batchUserIds) {
        pipeline.hgetall(redisKeys.attemptAnswers(examId, userId));
        pipeline.hgetall(redisKeys.attemptMeta(examId, userId));
      }
      const redisResults = await pipeline.exec();

      for (let index = 0; index < batchUserIds.length; index += 1) {
        const userId = batchUserIds[index];
        const attempt = attemptMap.get(String(userId));
        if (!attempt || attempt.status === "evaluated") {
          continue;
        }

        const answerHash = redisResults[index * 2]?.[1] || {};
        const metaHash = redisResults[index * 2 + 1]?.[1] || {};
        const answerMap = mapHashToAnswerMap(answerHash);
        const submittedAt = metaHash.submittedAt ? new Date(metaHash.submittedAt) : null;
        const status = metaHash.status || (answerMap.size > 0 ? "in_progress" : "ready");

        await persistAttemptSnapshot(exam, attempt, answerMap, {
          status,
          submittedAt,
          firstAnswerAt: metaHash.firstAnswerAt ? new Date(metaHash.firstAnswerAt) : attempt.firstAnswerAt
        });
      }

      await redis.srem(redisKeys.attemptDirtySet(examId), ...batchUserIds);

      if ((await redis.scard(redisKeys.attemptDirtySet(examId))) === 0) {
        await redis.srem(redisKeys.dirtyExamIndex(), examId);
      }
    }
  },

  async broadcastDirtyLeaderboards(io) {
    const redis = await connectRedis();
    const examIds = await redis.smembers(redisKeys.leaderboardDirtyIndex());

    for (const examId of examIds) {
      const snapshot = await buildLeaderboardSnapshot(examId);
      io.to(`exam:${examId}`).emit("leaderboard:update", snapshot);
      await redis.srem(redisKeys.leaderboardDirtyIndex(), examId);
    }
  },

  async getLeaderboard(examId) {
    return buildLeaderboardSnapshot(examId);
  },

  async finalizeExam(examId) {
    const examDoc = await ExamModel.findById(examId);
    if (!examDoc) {
      throw new AppError(404, "Exam was not found", {
        code: "EXAM_NOT_FOUND"
      });
    }

    if (examDoc.resultsGeneratedAt) {
      const existingAttempts = await ExamAttemptModel.find({ examId }).sort({ rank: 1 }).lean();
      return {
        examId,
        totalAttempts: existingAttempts.length,
        alreadyFinalized: true
      };
    }

    await this.flushDirtyAttempts();

    const [registrations, attempts] = await Promise.all([
      ExamRegistrationModel.find({ examId }).lean(),
      ExamAttemptModel.find({ examId })
    ]);

    const attemptMap = new Map(attempts.map((attempt) => [toIdString(attempt.userId), attempt]));
    const missingRegistrations = registrations.filter(
      (registration) => !attemptMap.has(toIdString(registration.userId))
    );

    if (missingRegistrations.length > 0) {
      const users = await UserModel.find({
        _id: { $in: missingRegistrations.map((registration) => registration.userId) }
      }).select("name email");

      const userMap = new Map(users.map((user) => [toIdString(user._id), user]));
      const createdAttempts = await ExamAttemptModel.insertMany(
        missingRegistrations.map((registration) => {
          const user = userMap.get(toIdString(registration.userId));
          return {
            examId: registration.examId,
            userId: registration.userId,
            roomId: registration.roomId,
            seatNumber: registration.seatNumber,
            userName: user?.name || "Unknown User",
            userEmail: user?.email || "unknown@example.com",
            status: "ready"
          };
        })
      );

      for (const attempt of createdAttempts) {
        attemptMap.set(toIdString(attempt.userId), attempt);
      }
    }

    const exam = (await loadExamRuntime(examId, { refresh: true, allowCompleted: true })).exam;
    const finalizeTargets = [...attemptMap.values()];

    for (const attempt of finalizeTargets) {
      if (!["submitted", "auto_submitted", "evaluated"].includes(attempt.status)) {
        await finalizePendingAttempt(exam, attempt, "auto");
      }
    }

    const rankedAttempts = await ExamAttemptModel.find({ examId });
    rankedAttempts.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.timeTakenSeconds !== right.timeTakenSeconds) {
        return left.timeTakenSeconds - right.timeTakenSeconds;
      }
      const leftSubmitted = new Date(left.submittedAt || exam.scheduledEndAt).getTime();
      const rightSubmitted = new Date(right.submittedAt || exam.scheduledEndAt).getTime();
      if (leftSubmitted !== rightSubmitted) return leftSubmitted - rightSubmitted;
      return toIdString(left.userId).localeCompare(toIdString(right.userId));
    });

    const qualificationCount = exam.qualificationCount || config.qualificationCount;
    const bulkUpdates = rankedAttempts.map((attempt, index) => ({
      updateOne: {
        filter: { _id: attempt._id },
        update: {
          $set: {
            rank: index + 1,
            qualified: index + 1 <= qualificationCount,
            qualificationStatus: index + 1 <= qualificationCount ? "qualified" : "not_qualified",
            finalizedAt: attempt.finalizedAt || new Date(),
            status: "evaluated"
          }
        }
      }
    }));

    if (bulkUpdates.length > 0) {
      await ExamAttemptModel.bulkWrite(bulkUpdates);
    }

    examDoc.resultsGeneratedAt = new Date();
    await examDoc.save();
    runtimeExamCache.delete(String(examId));

    return {
      examId,
      totalAttempts: rankedAttempts.length,
      qualificationCount,
      alreadyFinalized: false
    };
  }
};

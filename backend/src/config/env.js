import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoEnvPath = path.resolve(__dirname, "../../../.env");

dotenv.config({ path: repoEnvPath });
dotenv.config({ override: true });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value, fallback) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEFAULT_TOPICS = [
  "Marathi Grammar",
  "English Grammar",
  "General Knowledge",
  "Current Affairs",
  "Reasoning",
  "Quantitative Aptitude"
];

const defaultCorsOrigins = ["http://localhost:3000", "http://localhost:3001"];
const configuredCorsOrigins = [
  ...toStringArray(process.env.FRONTEND_URL, []),
  ...toStringArray(process.env.ADMIN_URL, []),
  ...toStringArray(process.env.ADMIN_FRONTEND_URL, []),
  ...toStringArray(process.env.CORS_ORIGIN, [])
];
const corsOrigins = configuredCorsOrigins.length
  ? [...new Set(configuredCorsOrigins)]
  : defaultCorsOrigins;

export const config = Object.freeze({
  env: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/live_exam",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET || "replace_this_with_a_long_random_secret",
  jwtExpiry: process.env.JWT_EXPIRY || "12h",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  allowAllCorsOrigins: corsOrigins.includes("*"),
  defaultRoomCapacity: toNumber(process.env.ROOM_CAPACITY, 100),
  schedulerPollIntervalMs: toNumber(process.env.SCHEDULER_POLL_INTERVAL_MS, 5000),
  answerSyncIntervalMs: toNumber(process.env.ANSWER_SYNC_INTERVAL_MS, 5000),
  answerFlushIntervalMs: toNumber(process.env.ANSWER_FLUSH_INTERVAL_MS, 8000),
  answerFlushBatchSize: toNumber(process.env.ANSWER_FLUSH_BATCH_SIZE, 250),
  leaderboardBroadcastIntervalMs: toNumber(process.env.LEADERBOARD_BROADCAST_INTERVAL_MS, 3000),
  leaderboardTopN: toNumber(process.env.LEADERBOARD_TOP_N, 20),
  qualificationCount: toNumber(process.env.QUALIFICATION_COUNT, 100),
  examRuntimeTtlSeconds: toNumber(process.env.EXAM_RUNTIME_TTL_SECONDS, 7 * 24 * 60 * 60),
  csvUploadMaxBytes: toNumber(process.env.CSV_UPLOAD_MAX_BYTES, 2 * 1024 * 1024),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || "1mb",
  allowedQuestionTopics: toStringArray(process.env.QUESTION_TOPICS, DEFAULT_TOPICS)
});

export function isProduction() {
  return config.env === "production";
}

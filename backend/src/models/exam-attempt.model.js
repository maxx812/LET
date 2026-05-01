import mongoose from "mongoose";

const answerSnapshotSchema = new mongoose.Schema(
  {
    questionCode: {
      type: String,
      required: true
    },
    selectedOptionKey: {
      type: String,
      enum: ["A", "B", "C", "D"],
      default: null
    },
    clientRevision: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date,
      required: true
    },
    source: {
      type: String,
      enum: ["http", "socket", "auto_recovery"],
      default: "http"
    }
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamRoom",
      required: true
    },
    seatNumber: {
      type: Number,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["ready", "in_progress", "submitted", "auto_submitted", "evaluated"],
      default: "ready",
      index: true
    },
    questionDeliveredAt: {
      type: Date,
      default: null
    },
    firstAnswerAt: {
      type: Date,
      default: null
    },
    lastAnswerAt: {
      type: Date,
      default: null
    },
    lastSyncedAt: {
      type: Date,
      default: null
    },
    lastHeartbeatAt: {
      type: Date,
      default: null
    },
    finalSubmissionSource: {
      type: String,
      enum: ["manual", "socket_manual", "auto", "recovery"],
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    finalizedAt: {
      type: Date,
      default: null
    },
    answerSheet: {
      type: [answerSnapshotSchema],
      default: []
    },
    answeredCount: {
      type: Number,
      default: 0
    },
    syncVersion: {
      type: Number,
      default: 0
    },
    provisionalScore: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    },
    correctCount: {
      type: Number,
      default: 0
    },
    wrongCount: {
      type: Number,
      default: 0
    },
    skippedCount: {
      type: Number,
      default: 0
    },
    timeTakenSeconds: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: null,
      index: true
    },
    qualified: {
      type: Boolean,
      default: false
    },
    qualificationStatus: {
      type: String,
      enum: ["pending", "qualified", "not_qualified"],
      default: "pending"
    },
    leaderboardComposite: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

examAttemptSchema.index({ examId: 1, userId: 1 }, { unique: true });
examAttemptSchema.index({ examId: 1, status: 1 });
examAttemptSchema.index({ examId: 1, rank: 1 });
examAttemptSchema.index({ examId: 1, score: -1, timeTakenSeconds: 1 });

export const ExamAttemptModel = mongoose.model("ExamAttempt", examAttemptSchema);

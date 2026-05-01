import mongoose from "mongoose";

const optionSnapshotSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true }
  },
  { _id: false }
);

const questionSnapshotSchema = new mongoose.Schema(
  {
    bankQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true
    },
    questionCode: {
      type: String,
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    options: {
      type: [optionSnapshotSchema],
      required: true
    },
    correctOptionKey: {
      type: String,
      required: true
    },
    explanation: {
      type: String,
      default: ""
    },
    topic: {
      type: String,
      required: true
    },
    subtopic: {
      type: String,
      default: ""
    },
    difficulty: {
      type: String,
      required: true
    },
    language: {
      type: String,
      required: true
    },
    marks: {
      type: Number,
      required: true
    },
    negativeMarks: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    battleCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    examTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamType",
      required: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    instructions: {
      type: String,
      trim: true,
      default: ""
    },
    scheduledStartAt: {
      type: Date,
      required: true,
      index: true
    },
    scheduledEndAt: {
      type: Date,
      required: true,
      index: true
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 300
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "live", "completed", "cancelled"],
      default: "scheduled",
      index: true
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 5,
      max: 200
    },
    maxUsersPerRoom: {
      type: Number,
      required: true,
      min: 10,
      max: 500
    },
    questionDeliveryMode: {
      type: String,
      enum: ["bulk"],
      default: "bulk"
    },
    qualificationCount: {
      type: Number,
      default: 100
    },
    roomSequence: {
      type: Number,
      default: 0
    },
    questionFilters: {
      topics: {
        type: [String],
        default: []
      }
    },
    difficultyDistribution: {
      easy: { type: Number, required: true },
      medium: { type: Number, required: true },
      hard: { type: Number, required: true }
    },
    questionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
      }
    ],
    questionSnapshots: {
      type: [questionSnapshotSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    resultsGeneratedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

examSchema.index({ status: 1, scheduledStartAt: 1 });
examSchema.index({ status: 1, scheduledEndAt: 1 });
examSchema.index({ createdAt: -1 });

export const ExamModel = mongoose.model("Exam", examSchema);

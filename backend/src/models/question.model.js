import mongoose from "mongoose";
import { config } from "../config/env.js";

export const QUESTION_OPTION_KEYS = ["A", "B", "C", "D"];
export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"];
export const QUESTION_LANGUAGES = ["mr", "en", "bilingual"];

const optionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: QUESTION_OPTION_KEYS,
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000
    },
    options: {
      type: [optionSchema],
      required: true,
      validate: {
        validator(value) {
          if (!Array.isArray(value) || value.length !== QUESTION_OPTION_KEYS.length) {
            return false;
          }

          const keys = value.map((option) => option.key);
          return QUESTION_OPTION_KEYS.every((key) => keys.includes(key));
        },
        message: "Questions must contain exactly four options with keys A, B, C, and D"
      }
    },
    correctOptionKey: {
      type: String,
      enum: QUESTION_OPTION_KEYS,
      required: true
    },
    explanation: {
      type: String,
      trim: true,
      default: ""
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    examTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamType",
      required: true,
      index: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true
    },
    subtopic: {
      type: String,
      trim: true,
      default: ""
    },
    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTIES,
      required: true,
      lowercase: true
    },
    language: {
      type: String,
      enum: QUESTION_LANGUAGES,
      default: "mr"
    },
    marks: {
      type: Number,
      min: 1,
      max: 10,
      default: 1
    },
    negativeMarks: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    source: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true
    },
    contentHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

questionSchema.index({ topic: 1, difficulty: 1, status: 1 });
questionSchema.index({ createdAt: -1 });

questionSchema.pre("validate", function ensureCorrectOption(next) {
  const optionKeys = (this.options || []).map((option) => option.key);
  if (!optionKeys.includes(this.correctOptionKey)) {
    this.invalidate("correctOptionKey", "correctOptionKey must match one of the question options");
    next();
    return;
  }
  next();
});

export const QuestionModel = mongoose.model("Question", questionSchema);

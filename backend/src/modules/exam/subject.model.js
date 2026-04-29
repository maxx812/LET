import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: {
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
    description: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

// Ensure subject name is unique per exam type
subjectSchema.index({ name: 1, examTypeId: 1 }, { unique: true });

export const SubjectModel = mongoose.model("Subject", subjectSchema);

import mongoose from "mongoose";

const examRegistrationSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["assigned", "connected", "submitted", "auto_submitted"],
      default: "assigned"
    },
    lastSocketId: {
      type: String,
      default: null
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    connectedAt: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

examRegistrationSchema.index({ examId: 1, userId: 1 }, { unique: true });

export const ExamRegistrationModel = mongoose.model("ExamRegistration", examRegistrationSchema);

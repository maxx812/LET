import mongoose from "mongoose";

const examRoomSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true
    },
    roomNumber: {
      type: Number,
      required: true
    },
    roomCode: {
      type: String,
      required: true
    },
    capacity: {
      type: Number,
      required: true
    },
    occupancy: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["open", "full", "closed"],
      default: "open",
      index: true
    },
    lastAssignedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

examRoomSchema.index({ examId: 1, roomNumber: 1 }, { unique: true });
examRoomSchema.index({ examId: 1, roomCode: 1 }, { unique: true });

export const ExamRoomModel = mongoose.model("ExamRoom", examRoomSchema);

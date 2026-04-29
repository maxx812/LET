import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      index: true
    },
    authProvider: {
      type: String,
      enum: ["local", "firebase"],
      required: true
    },
    passwordHash: {
      type: String,
      select: false
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    pictureUrl: {
      type: String,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    // Student Profile Fields
    phone: { type: String, trim: true },
    district: { type: String, trim: true },
    education: { type: String, trim: true },
    targetExamTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "ExamType" },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    dob: { type: Date },
    category: { type: String, enum: ["Open", "OBC", "SC", "ST", "VJ/NT", "SBC", "EWS"] }
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", userSchema);

import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      enum: ["scoring", "security", "notifications", "socket", "appearance"]
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {}
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

export const SettingsModel = mongoose.model("Settings", settingsSchema);

export const DEFAULT_SETTINGS = {
  scoring: {
    basePointsPerQuestion: 10,
    speedMultiplier: 15,
    penaltyPerMistake: -2,
    passThreshold: 40
  },
  security: {
    secureBrowserLock: true,
    ipRateLimiting: true,
    webcamMonitoring: false,
    tabSwitchDetection: true,
    copyPasteProtection: true
  },
  notifications: {
    emailAlerts: true,
    smsNotifications: false,
    pushNotifications: true
  },
  socket: {
    heartbeatMs: 3000,
    leaderboardTickMs: 2500
  },
  appearance: {
    themeMode: "system",
    compactMode: false
  }
};

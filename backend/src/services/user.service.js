import { UserModel } from "../models/user.model.js";
import { AppError } from "../shared/errors/app-error.js";
import { serializeAuthUser } from "../shared/utils/jwt.js";
import { examEngineService } from "./exam-engine.service.js";
import { examService } from "./exam.service.js";

export const userService = {
  async getProfile(userId) {
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      throw new AppError(404, "User was not found", {
        code: "USER_NOT_FOUND"
      });
    }

    return serializeAuthUser(user);
  },

  async updateProfile(userId, updateData) {
    const allowedFields = ["name", "phone", "district", "education", "targetExamTypeId", "gender", "dob", "category"];
    const filteredUpdate = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredUpdate[key] = updateData[key];
      }
    });

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: filteredUpdate },
      { new: true, runValidators: true }
    ).lean();

    if (!user) {
      throw new AppError(404, "User not found", { code: "USER_NOT_FOUND" });
    }

    return serializeAuthUser(user);
  },

  async getAvailableExams() {
    return examService.listAvailableExamsForUsers();
  },

  async joinExam(examId, userId) {
    return examEngineService.joinExamSession(examId, userId);
  },

  async getQuestionsForExam(examId, userId) {
    return examEngineService.getQuestionDelivery(examId, userId);
  },

  async submitAnswer(examId, userId, payload) {
    return examEngineService.submitAnswer(examId, userId, payload, "http");
  },

  async submitExam(examId, userId, payload = {}) {
    return examEngineService.submitExam(examId, userId, payload.trigger || "manual");
  },

  async getExamResult(examId, userId) {
    return examEngineService.getResult(examId, userId);
  },

  async getExamLeaderboard(examId) {
    return examEngineService.getLeaderboard(examId);
  }
};

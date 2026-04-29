import { Router } from "express";
import { authenticate, authorizeRoles } from "../../shared/middleware/auth.middleware.js";
import { validateRequest } from "../../shared/middleware/validate.middleware.js";
import {
  getAvailableExamsController,
  getExamLeaderboardController,
  getExamQuestionsController,
  getExamResultController,
  getMyProfileController,
  updateProfileController,
  getExamTypesController,
  joinExamController,
  submitAnswerController,
  submitExamController
} from "./user.controller.js";
import {
  getExamLeaderboardSchema,
  getExamQuestionsSchema,
  getExamResultSchema,
  joinExamSchema,
  submitAnswerSchema,
  submitExamSchema
} from "./user.validation.js";

export const userRoutes = Router();

userRoutes.get("/live-exams", getAvailableExamsController);
userRoutes.get("/exam-types", getExamTypesController);

userRoutes.use(authenticate, authorizeRoles("user"));

userRoutes.get("/profile", getMyProfileController);
userRoutes.post("/profile-update", updateProfileController);
userRoutes.get("/exams", getAvailableExamsController);
userRoutes.post("/exams/:examId/join", validateRequest(joinExamSchema), joinExamController);
userRoutes.get(
  "/exams/:examId/questions",
  validateRequest(getExamQuestionsSchema),
  getExamQuestionsController
);
userRoutes.post(
  "/exams/:examId/submit-answer",
  validateRequest(submitAnswerSchema),
  submitAnswerController
);
userRoutes.post("/exams/:examId/submit-exam", validateRequest(submitExamSchema), submitExamController);
userRoutes.get("/exams/:examId/result", validateRequest(getExamResultSchema), getExamResultController);
userRoutes.get(
  "/exams/:examId/leaderboard",
  validateRequest(getExamLeaderboardSchema),
  getExamLeaderboardController
);

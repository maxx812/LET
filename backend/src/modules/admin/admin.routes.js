import { Router } from "express";
import { config } from "../../config/env.js";
import { authenticate, authorizeRoles } from "../../shared/middleware/auth.middleware.js";
import { parseSingleMultipartFile } from "../../shared/utils/multipart.js";
import { validateRequest } from "../../shared/middleware/validate.middleware.js";
import {
  analyticsController,
  bulkUploadQuestionsController,
  createExamController,
  createQuestionController,
  dashboardController,
  deleteExamController,
  deleteQuestionController,
  getLeaderboardController,
  getSettingsController,
  listExamsController,
  listQuestionsController,
  listUsersController,
  publishExamController,
  saveSettingsController,
  toggleUserStatusController,
  updateExamController,
  updateQuestionController,
  listExamTypesController,
  createExamTypeController,
  listSubjectsController,
  createSubjectController
} from "./admin.controller.js";
import {
  createExamSchema,
  createQuestionSchema,
  deleteExamSchema,
  deleteQuestionSchema,
  listExamsSchema,
  listQuestionsSchema,
  publishExamSchema,
  updateExamSchema,
  updateQuestionSchema
} from "./admin.validation.js";

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorizeRoles("admin"));

adminRoutes.get("/dashboard", dashboardController);
adminRoutes.get("/analytics", analyticsController);

adminRoutes.get("/questions", validateRequest(listQuestionsSchema), listQuestionsController);
adminRoutes.post("/questions", validateRequest(createQuestionSchema), createQuestionController);
adminRoutes.patch(
  "/questions/:questionId",
  validateRequest(updateQuestionSchema),
  updateQuestionController
);
adminRoutes.post(
  "/questions/bulk-upload",
  parseSingleMultipartFile("file", {
    maxFileSizeBytes: config.csvUploadMaxBytes
  }),
  bulkUploadQuestionsController
);
adminRoutes.delete(
  "/questions/:questionId",
  validateRequest(deleteQuestionSchema),
  deleteQuestionController
);

adminRoutes.get("/exams", validateRequest(listExamsSchema), listExamsController);
adminRoutes.post("/exams", validateRequest(createExamSchema), createExamController);
adminRoutes.patch("/exams/:examId", validateRequest(updateExamSchema), updateExamController);
adminRoutes.patch(
  "/exams/:examId/publish",
  validateRequest(publishExamSchema),
  publishExamController
);
adminRoutes.delete("/exams/:examId", validateRequest(deleteExamSchema), deleteExamController);

adminRoutes.get("/users", listUsersController);
adminRoutes.patch("/users/:userId/status", toggleUserStatusController);

adminRoutes.get("/settings", getSettingsController);
adminRoutes.put("/settings", saveSettingsController);

adminRoutes.get("/leaderboard", getLeaderboardController);

adminRoutes.get("/exam-types", listExamTypesController);
adminRoutes.post("/exam-types", createExamTypeController);

adminRoutes.get("/subjects", listSubjectsController);
adminRoutes.post("/subjects", createSubjectController);

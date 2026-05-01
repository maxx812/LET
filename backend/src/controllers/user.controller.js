import { adminService } from "../services/admin.service.js";
import { userService } from "../services/user.service.js";

export async function getExamTypesController(_req, res, next) {
  try {
    const examTypes = await adminService.listExamTypes();
    res.json({ success: true, examTypes });
  } catch (error) {
    next(error);
  }
}

export async function getMyProfileController(req, res, next) {
  try {
    const profile = await userService.getProfile(req.auth.sub);
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function updateProfileController(req, res, next) {
  try {
    const profile = await userService.updateProfile(req.auth.sub, req.body);
    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
}

export async function getAvailableExamsController(req, res, next) {
  try {
    const exams = await userService.getAvailableExams(req.auth?.sub);
    res.json({ success: true, exams });
  } catch (error) {
    next(error);
  }
}

export async function joinExamController(req, res, next) {
  try {
    const session = await userService.joinExam(req.params.examId, req.auth.sub);
    res.status(200).json({ success: true, ...session });
  } catch (error) {
    next(error);
  }
}

export async function getExamQuestionsController(req, res, next) {
  try {
    const result = await userService.getQuestionsForExam(req.params.examId, req.auth.sub);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function submitAnswerController(req, res, next) {
  try {
    const result = await userService.submitAnswer(req.params.examId, req.auth.sub, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function submitExamController(req, res, next) {
  try {
    const result = await userService.submitExam(req.params.examId, req.auth.sub, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getExamResultController(req, res, next) {
  try {
    const result = await userService.getExamResult(req.params.examId, req.auth.sub);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getExamLeaderboardController(req, res, next) {
  try {
    const leaderboard = await userService.getExamLeaderboard(req.params.examId);
    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    next(error);
  }
}

export async function getGlobalStatsController(_req, res, next) {
  try {
    const stats = await userService.getGlobalStats();
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
}

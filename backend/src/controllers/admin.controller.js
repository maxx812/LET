import { adminService } from "../services/admin.service.js";

export async function dashboardController(_req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
}

export async function analyticsController(_req, res, next) {
  try {
    const analytics = await adminService.getAnalyticsData();
    res.json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
}

export async function createQuestionController(req, res, next) {
  try {
    const question = await adminService.createQuestion(req.body, req.auth.sub);
    res.status(201).json({ success: true, question });
  } catch (error) {
    next(error);
  }
}

export async function updateQuestionController(req, res, next) {
  try {
    const question = await adminService.updateQuestion(req.params.questionId, req.body, req.auth.sub);
    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
}

export async function bulkUploadQuestionsController(req, res, next) {
  try {
    const { examTypeId, subjectId } = req.body;
    const report = await adminService.bulkUploadQuestions(req.file, req.auth.sub, examTypeId, subjectId);
    res.status(201).json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

export async function listQuestionsController(req, res, next) {
  try {
    const result = await adminService.listQuestions(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestionController(req, res, next) {
  try {
    const question = await adminService.archiveQuestion(req.params.questionId);
    res.json({ success: true, question });
  } catch (error) {
    next(error);
  }
}

export async function createExamController(req, res, next) {
  try {
    const exam = await adminService.createExam(req.body, req.auth.sub);
    res.status(201).json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

export async function listExamsController(req, res, next) {
  try {
    const exams = await adminService.listExams(req.query);
    res.json({ success: true, ...exams });
  } catch (error) {
    next(error);
  }
}

export async function updateExamController(req, res, next) {
  try {
    const exam = await adminService.updateExam(req.params.examId, req.body);
    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

export async function publishExamController(req, res, next) {
  try {
    const exam = await adminService.publishExam(req.params.examId);
    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

export async function deleteExamController(req, res, next) {
  try {
    await adminService.deleteExam(req.params.examId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function listUsersController(_req, res, next) {
  try {
    const users = await adminService.listUsers();
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatusController(req, res, next) {
  try {
    const user = await adminService.toggleUserStatus(req.params.userId, req.body.action);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function getSettingsController(_req, res, next) {
  try {
    const settings = await adminService.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
}

export async function saveSettingsController(req, res, next) {
  try {
    const settings = await adminService.saveSettings(req.body, req.auth.sub);
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
}

export async function getLeaderboardController(req, res, next) {
  try {
    const examId = req.query.examId || null;
    const limit = parseInt(req.query.limit, 10) || 50;
    const leaderboard = await adminService.getLeaderboard(examId, limit);
    res.json({ success: true, ...leaderboard });
  } catch (error) {
    next(error);
  }
}

// ── Exam Types & Subjects ──
export async function listExamTypesController(_req, res, next) {
  try {
    const examTypes = await adminService.listExamTypes();
    res.json({ success: true, examTypes });
  } catch (error) {
    next(error);
  }
}

export async function createExamTypeController(req, res, next) {
  try {
    const examType = await adminService.createExamType(req.body);
    res.status(201).json({ success: true, examType });
  } catch (error) {
    next(error);
  }
}

export async function listSubjectsController(req, res, next) {
  try {
    const subjects = await adminService.listSubjects(req.query.examTypeId);
    res.json({ success: true, subjects });
  } catch (error) {
    next(error);
  }
}

export async function createSubjectController(req, res, next) {
  try {
    const subject = await adminService.createSubject(req.body);
    res.status(201).json({ success: true, subject });
  } catch (error) {
    next(error);
  }
}

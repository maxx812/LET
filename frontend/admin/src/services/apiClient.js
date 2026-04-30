import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      // redirect to login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export async function loginAdmin({ email, password }) {
  const { data } = await apiClient.post("/auth/admin/login", { email, password });
  return data;
}

// Dashboard
export async function fetchDashboard() {
  const { data } = await apiClient.get("/admin/dashboard");
  return data;
}

export async function fetchAnalytics() {
  const { data } = await apiClient.get("/admin/analytics");
  return data;
}

// Questions
export async function fetchQuestions(params = {}) {
  const { data } = await apiClient.get("/admin/questions", { params });
  return data;
}

export async function createQuestion(payload) {
  const { data } = await apiClient.post("/admin/questions", payload);
  return data;
}

export async function updateQuestion(questionId, payload) {
  const { data } = await apiClient.patch(`/admin/questions/${questionId}`, payload);
  return data;
}

export async function deleteQuestion(questionId) {
  const { data } = await apiClient.delete(`/admin/questions/${questionId}`);
  return data;
}

export async function bulkUploadQuestions(formData) {
  const { data } = await apiClient.post("/admin/questions/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000
  });
  return data;
}

// Exams
export async function fetchExams() {
  const { data } = await apiClient.get("/admin/exams");
  return data;
}

export async function createExam(payload) {
  const { data } = await apiClient.post("/admin/exams", payload);
  return data;
}

export async function updateExam(examId, payload) {
  const { data } = await apiClient.patch(`/admin/exams/${examId}`, payload);
  return data;
}

export async function publishExam(examId) {
  const { data } = await apiClient.patch(`/admin/exams/${examId}/publish`);
  return data;
}

export async function deleteExam(examId) {
  const { data } = await apiClient.delete(`/admin/exams/${examId}`);
  return data;
}

// Users
export async function fetchUsers() {
  const { data } = await apiClient.get("/admin/users");
  return data;
}

export async function toggleUserStatus(userId, action) {
  const { data } = await apiClient.patch(`/admin/users/${userId}/status`, { action });
  return data;
}

// Settings
export async function fetchSettings() {
  const { data } = await apiClient.get("/admin/settings");
  return data;
}

export async function saveSettings(settingsData) {
  const { data } = await apiClient.put("/admin/settings", settingsData);
  return data;
}

// Leaderboard
export async function fetchLeaderboard(examId, limit = 50) {
  const params = {};
  if (examId) params.examId = examId;
  if (limit) params.limit = limit;
  const { data } = await apiClient.get("/admin/leaderboard", { params });
  return data;
}

// Exam Types & Subjects
export async function fetchExamTypes() {
  const { data } = await apiClient.get("/admin/exam-types");
  return data;
}

export async function createExamType(payload) {
  const { data } = await apiClient.post("/admin/exam-types", payload);
  return data;
}

export async function fetchSubjects(examTypeId) {
  const params = {};
  if (examTypeId) params.examTypeId = examTypeId;
  const { data } = await apiClient.get("/admin/subjects", { params });
  return data;
}

export async function createSubject(payload) {
  const { data } = await apiClient.post("/admin/subjects", payload);
  return data;
}

export default apiClient;

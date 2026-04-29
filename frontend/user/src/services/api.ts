import axios from "axios";
import { refreshSessionFromFirebaseAuth } from "@/lib/authService";
import { getApiBaseUrl } from "@/lib/runtimeConfig";
import { clearActiveExamSession, getActiveExamId } from "@/services/examSession";

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
});

export type ApiError = {
  message: string;
  status?: number;
};

export type ExamAnswerSubmission = {
  questionCode: string;
  selectedOptionKey: string | null;
  clientRevision?: number;
  submittedAt?: string;
};

type LiveExamsPayload = {
  exams?: unknown;
  items?: unknown;
  data?: unknown;
};

function clearClientSession() {
  localStorage.removeItem("user_token");
  localStorage.removeItem("user_data");
  clearActiveExamSession();
  window.dispatchEvent(new Event("auth:changed"));
}

function unwrapResponse<T>(payload: unknown, key?: string): T {
  if (
    key &&
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    key in payload
  ) {
    return (payload as Record<string, T>)[key];
  }

  return payload as T;
}

function extractLiveExams(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const { exams, items, data } = payload as LiveExamsPayload;

  if (Array.isArray(exams)) {
    return exams;
  }

  if (Array.isArray(items)) {
    return items;
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const nested = data as LiveExamsPayload;
    if (Array.isArray(nested.exams)) {
      return nested.exams;
    }
    if (Array.isArray(nested.items)) {
      return nested.items;
    }
  }

  return [];
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("user_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const responseCode =
      error?.response?.data?.code || error?.response?.data?.error?.code;
    const isFirebaseSessionIssue =
      responseCode === "FIREBASE_TOKEN_EXPIRED" ||
      responseCode === "INVALID_FIREBASE_TOKEN";

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._authRetried &&
      isFirebaseSessionIssue &&
      !originalRequest.url?.includes("/auth/user/firebase")
    ) {
      originalRequest._authRetried = true;

      try {
        await refreshSessionFromFirebaseAuth();
        const token = localStorage.getItem("user_token");
        if (token) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${token}`,
          };
        }
        return apiClient(originalRequest);
      } catch {
        clearClientSession();
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      clearClientSession();
    }

    return Promise.reject(error);
  },
);

export function getApiError(
  error: unknown,
  fallback = "Something went wrong",
): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      message:
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        fallback,
      status: error.response?.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message || fallback };
  }

  return { message: fallback };
}

export async function fetchLiveExams() {
  const { data } = await apiClient.get("/user/live-exams");
  const baseData =
    data && typeof data === "object" && !Array.isArray(data) ? data : {};

  return {
    ...baseData,
    exams: extractLiveExams(data),
  };
}

export async function joinExam(payload: { examId: string }) {
  const { data } = await apiClient.post(`/user/exams/${payload.examId}/join`);
  return data;
}

export async function updateProfile(payload: {
  name?: string;
  phone?: string;
  district?: string;
  education?: string;
  targetExamTypeId?: string;
  gender?: string;
  dob?: string;
  category?: string;
}) {
  const { data } = await apiClient.post("/user/profile-update", payload);
  return data;
}

export async function fetchMyProfile() {
  const { data } = await apiClient.get("/user/profile");
  return unwrapResponse(data, "profile");
}

export async function fetchExamQuestions(examId = getActiveExamId()) {
  if (!examId) {
    throw new Error("No active exam ID");
  }

  const { data } = await apiClient.get(`/user/exams/${examId}/questions`);
  return data;
}

export async function fetchExamTypes() {
  const { data } = await apiClient.get("/user/exam-types");
  return data;
}

export async function syncExamAnswers(payload: {
  examId: string;
  answers: ExamAnswerSubmission[];
}) {
  const { data } = await apiClient.post(
    `/user/exams/${payload.examId}/submit-answer`,
    {
      answers: payload.answers,
    },
  );
  return data;
}

export async function submitExam(payload: {
  examId: string;
  trigger?: "manual" | "auto" | "socket_manual";
  answers?: ExamAnswerSubmission[];
}) {
  const { data } = await apiClient.post(
    `/user/exams/${payload.examId}/submit-exam`,
    {
      trigger: payload.trigger || "manual",
      answers: payload.answers || [],
    },
  );

  return unwrapResponse(data, "result");
}

export async function fetchExamResult(examId: string) {
  const { data } = await apiClient.get(`/user/exams/${examId}/result`);
  return unwrapResponse(data, "result");
}

export async function fetchExamLeaderboard(examId: string) {
  const { data } = await apiClient.get(`/user/exams/${examId}/leaderboard`);
  return unwrapResponse(data, "leaderboard");
}

export async function loginWithFirebase(payload: {
  idToken: string;
  name?: string;
  email?: string;
  uid?: string;
}) {
  const { data } = await apiClient.post("/auth/user/firebase", payload);
  return data;
}

export const userApi = {
  fetchExamLeaderboard,
  fetchExamQuestions,
  fetchExamResult,
  fetchLiveExams,
  fetchMyProfile,
  joinExam,
  loginWithFirebase,
  submitExam,
  syncExamAnswers,
};

export default apiClient;

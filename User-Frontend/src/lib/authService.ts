import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase";
import { loginWithFirebase } from "@/services/api";
import { clearActiveExamSession } from "@/services/examSession";

export type SessionUser = {
  id?: string;
  uid: string;
  name: string;
  email: string;
};

const USER_KEY = "user_data";
const TOKEN_KEY = "user_token";

function sanitizeSessionUser(user: Partial<SessionUser> | null | undefined): SessionUser | null {
  if (!user?.uid || !user?.email) return null;
  return {
    id: user.id,
    uid: user.uid,
    email: user.email,
    name: user.name || user.email.split("@")[0] || "User",
  };
}

export function getStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return sanitizeSessionUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getStoredAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function persistSession(user: SessionUser, accessToken: string) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, accessToken);
  window.dispatchEvent(new Event("auth:changed"));
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  clearActiveExamSession();
  window.dispatchEvent(new Event("auth:changed"));
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const responseData = (
    error as {
      response?: {
        data?: {
          code?: unknown;
          error?: { code?: unknown };
        };
      };
    }
  ).response?.data;

  if (typeof responseData?.code === "string") {
    return responseData.code;
  }

  if (typeof responseData?.error?.code === "string") {
    return responseData.error.code;
  }

  if ("code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";

  const responseData = (
    error as {
      response?: {
        data?: {
          message?: unknown;
          error?: { message?: unknown };
        };
      };
      message?: unknown;
    }
  ).response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error?.message === "string") {
    return responseData.error.message;
  }

  if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "";
}

function isExpiredFirebaseSessionError(error: unknown) {
  return (
    getErrorCode(error) === "FIREBASE_TOKEN_EXPIRED" ||
    getErrorMessage(error).toLowerCase().includes("firebase session expired")
  );
}

async function requestServerSession(firebaseUser: FirebaseUser, forceRefresh = false) {
  const idToken = await firebaseUser.getIdToken(forceRefresh);

  const data = await loginWithFirebase({
    idToken,
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || undefined,
    email: firebaseUser.email || undefined,
  });

  const sessionUser = sanitizeSessionUser({
    id: data?.user?.id,
    uid: data?.user?.uid || firebaseUser.uid,
    email: data?.user?.email || firebaseUser.email || "",
    name: data?.user?.name || firebaseUser.displayName || "",
  });

  if (!sessionUser || !data?.accessToken) {
    throw new Error("Invalid session payload from server.");
  }

  persistSession(sessionUser, data.accessToken);
  return sessionUser;
}

async function createSessionFromFirebaseUser(firebaseUser: FirebaseUser) {
  try {
    return await requestServerSession(firebaseUser);
  } catch (error) {
    if (!isExpiredFirebaseSessionError(error)) {
      throw error;
    }

    return requestServerSession(firebaseUser, true);
  }
}

export async function refreshSessionFromFirebaseAuth() {
  const auth = getFirebaseAuth();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  return createSessionFromFirebaseUser(firebaseUser);
}

function isFirebaseErrorWithCode(error: unknown, code: string) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      (error as { code: string }).code === code
  );
}

export async function loginWithGoogle() {
  const auth = getFirebaseAuth();

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await createSessionFromFirebaseUser(result.user);
  } catch (error) {
    if (isFirebaseErrorWithCode(error, "auth/popup-blocked")) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
}

export async function completeGoogleRedirectLogin() {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return createSessionFromFirebaseUser(result.user);
}

export async function logoutUser() {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } finally {
    clearSession();
  }
}

export function subscribeAuthPersistence(onUser: (user: SessionUser | null) => void) {
  let unsubscribe = () => {};
  try {
    const auth = getFirebaseAuth();
    unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      const storedUser = getStoredUser();

      if (!firebaseUser) {
        onUser(storedUser);
        return;
      }

      if (storedUser && getStoredAccessToken()) {
        onUser(storedUser);
        return;
      }

      try {
        const restoredUser = await createSessionFromFirebaseUser(firebaseUser);
        onUser(restoredUser);
      } catch {
        // Keep UI resilient even if backend refresh fails temporarily.
        onUser(storedUser);
      }
    });
  } catch {
    // Firebase not configured; keep app usable without crashing.
    onUser(getStoredUser());
  }

  return unsubscribe;
}

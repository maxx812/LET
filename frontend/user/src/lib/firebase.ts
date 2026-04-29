import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    ? { measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID }
    : {}),
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

let authInstance: Auth | null = null;
export const googleProvider = new GoogleAuthProvider();

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase config missing. Set VITE_FIREBASE_* env values.");
  }

  if (!authInstance) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    authInstance.useDeviceLanguage();
  }

  return authInstance;
}

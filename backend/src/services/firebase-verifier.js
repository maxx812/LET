import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { AppError } from "../shared/errors/app-error.js";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedCerts = null;
let cacheExpiresAt = 0;

function getMaxAgeFromHeader(headerValue) {
  const match = String(headerValue || "").match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 3600;
}

async function fetchGoogleCerts(forceRefresh = false) {
  if (!forceRefresh && cachedCerts && cacheExpiresAt > Date.now()) {
    return cachedCerts;
  }

  let response;
  try {
    response = await fetch(GOOGLE_CERTS_URL);
  } catch {
    throw new AppError(503, "Unable to reach Firebase token verification service", {
      code: "FIREBASE_CERT_FETCH_FAILED"
    });
  }

  if (!response.ok) {
    throw new AppError(503, "Unable to verify Firebase token right now", {
      code: "FIREBASE_CERT_FETCH_FAILED"
    });
  }

  cachedCerts = await response.json();
  cacheExpiresAt = Date.now() + getMaxAgeFromHeader(response.headers.get("cache-control")) * 1000;
  return cachedCerts;
}

export async function verifyFirebaseIdToken(idToken) {
  if (!config.firebaseProjectId) {
    throw new AppError(500, "FIREBASE_PROJECT_ID is not configured", {
      code: "FIREBASE_CONFIG_MISSING"
    });
  }

  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded?.header?.kid;

  if (!kid) {
    throw new AppError(401, "Invalid Firebase token", {
      code: "INVALID_FIREBASE_TOKEN"
    });
  }

  const certs = await fetchGoogleCerts();
  let cert = certs[kid];

  if (!cert) {
    cert = (await fetchGoogleCerts(true))[kid];
  }

  if (!cert) {
    throw new AppError(401, "Firebase token certificate was not found", {
      code: "FIREBASE_CERT_NOT_FOUND"
    });
  }

  let payload;
  try {
    payload = jwt.verify(idToken, cert, {
      algorithms: ["RS256"],
      audience: config.firebaseProjectId,
      issuer: `https://securetoken.google.com/${config.firebaseProjectId}`,
      clockTolerance: 30 * 24 * 60 * 60 // 30 days tolerance for out-of-sync dev clocks
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, "Firebase session expired. Please sign in again.", {
        code: "FIREBASE_TOKEN_EXPIRED"
      });
    }

    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
      throw new AppError(401, "Invalid Firebase token", {
        code: "INVALID_FIREBASE_TOKEN",
        details: { reason: error.message }
      });
    }

    throw error;
  }

  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw new AppError(401, "Firebase account must have a verified email", {
      code: "FIREBASE_EMAIL_NOT_VERIFIED"
    });
  }

  return payload;
}

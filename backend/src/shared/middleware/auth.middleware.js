import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export function extractBearerToken(authHeader = "") {
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice(7).trim();
}

export function authenticate(req, _res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization || "");
    if (!token) {
      throw new AppError(401, "Authentication token is required", {
        code: "AUTH_TOKEN_MISSING"
      });
    }

    req.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    next(
      error.isOperational
        ? error
        : new AppError(401, "Invalid or expired access token", {
            code: "AUTH_TOKEN_INVALID"
          })
    );
  }
}

export function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(
        new AppError(403, "You are not allowed to access this resource", {
          code: "FORBIDDEN"
        })
      );
    }

    return next();
  };
}

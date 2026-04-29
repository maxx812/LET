import mongoose from "mongoose";
import { isProduction } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(422, "Database validation failed", {
      code: "DB_VALIDATION_ERROR",
      details: Object.values(error.errors).map((item) => ({
        path: item.path,
        message: item.message
      }))
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError(400, "Invalid identifier format", {
      code: "INVALID_ID",
      details: {
        path: error.path,
        value: error.value
      }
    });
  }

  if (error?.code === 11000) {
    return new AppError(409, "Duplicate data conflicts with an existing record", {
      code: "DUPLICATE_KEY",
      details: error.keyValue || null
    });
  }

  return new AppError(500, error.message || "Internal server error", {
    code: "INTERNAL_SERVER_ERROR"
  });
}

export function notFoundHandler(req, _res, next) {
  next(
    new AppError(404, `Route ${req.method} ${req.originalUrl} was not found`, {
      code: "ROUTE_NOT_FOUND"
    })
  );
}

export function errorHandler(error, _req, res, _next) {
  const appError = normalizeError(error);

  if (appError.statusCode >= 500) {
    console.error(error);
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      stack: isProduction() ? undefined : appError.stack
    }
  });
}

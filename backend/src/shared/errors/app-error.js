export class AppError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options.code || "APP_ERROR";
    this.details = options.details || null;
    this.isOperational = true;
  }
}

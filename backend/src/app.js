import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config/env.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/error.middleware.js";

const isDev = config.env === "development";
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 1500, // Increased limit for dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev // Skip rate limiting entirely in development
});

function corsOrigin(origin, callback) {
  if (!origin || config.allowAllCorsOrigins || config.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("CORS origin is not allowed"));
}

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginOpenerPolicy: {
        policy: "same-origin-allow-popups"
      }
    })
  );
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(apiLimiter);
  app.use(express.json({ limit: config.requestBodyLimit }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (_req, res) => {
    res.json({ success: true, status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

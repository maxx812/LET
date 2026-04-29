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

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (config.allowAllCorsOrigins) return true;
  if (config.corsOrigins.includes(origin)) return true;
  
  // Allow all Vercel preview deployments
  if (origin.endsWith(".vercel.app")) return true;
  
  return false;
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
  app.use(cors({ 
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS origin is not allowed"));
      }
    }, 
    credentials: true 
  }));
  app.use(apiLimiter);
  app.use(express.json({ limit: config.requestBodyLimit }));
  app.use(express.urlencoded({ extended: false }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/exam", userRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/admin", adminRoutes);

  // Fallback aliases for requests missing the /api prefix
  app.use("/auth", authRoutes);
  app.use("/user", userRoutes);
  app.use("/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

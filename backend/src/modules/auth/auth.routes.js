import { Router } from "express";
import { authenticate, authorizeRoles } from "../../shared/middleware/auth.middleware.js";
import { validateRequest } from "../../shared/middleware/validate.middleware.js";
import {
  adminLoginController,
  firebaseLoginController,
  verifySessionController
} from "./auth.controller.js";
import { adminLoginSchema, firebaseLoginSchema } from "./auth.validation.js";

export const authRoutes = Router();

authRoutes.post("/admin/login", validateRequest(adminLoginSchema), adminLoginController);
authRoutes.post("/user/firebase", validateRequest(firebaseLoginSchema), firebaseLoginController);
authRoutes.get("/verify", authenticate, verifySessionController);
authRoutes.get("/admin/verify", authenticate, authorizeRoles("admin"), verifySessionController);

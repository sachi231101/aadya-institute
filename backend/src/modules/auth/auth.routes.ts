import { Router } from "express";
import { login, refreshToken, getMe } from "./auth.controller";
import { validate } from "../../middlewares/validation.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { loginSchema, refreshTokenSchema } from "./auth.validation";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), login);

// POST /api/v1/auth/refresh
router.post("/refresh", validate(refreshTokenSchema), refreshToken);

// GET /api/v1/auth/me
router.get("/me", authMiddleware, getMe);

export default router;

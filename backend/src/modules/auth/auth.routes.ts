import { Router } from "express";
import { login, refreshToken, logout, logoutAll, getMe } from "./auth.controller";
import { validate } from "../../middlewares/validation.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware";
import { loginSchema, refreshTokenSchema, logoutSchema } from "./auth.validation";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", authRateLimiter, validate(loginSchema), login);

// POST /api/v1/auth/refresh
router.post("/refresh", authRateLimiter, validate(refreshTokenSchema), refreshToken);

// POST /api/v1/auth/logout
// Requires Bearer token + refreshToken in body to revoke that specific session
router.post("/logout", authMiddleware, validate(logoutSchema), logout);

// POST /api/v1/auth/logout-all
// Revoke all active sessions for the authenticated user
router.post("/logout-all", authMiddleware, logoutAll);

// GET /api/v1/auth/me
router.get("/me", authMiddleware, getMe);

export default router;

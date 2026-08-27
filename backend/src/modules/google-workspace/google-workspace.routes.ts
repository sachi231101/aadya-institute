import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { oauthCallbackSchema } from "./google-workspace.validation";
import {
  getConnectUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnect,
} from "./google-workspace.controller";

const router = Router();

// OAuth callback endpoint is public (Google redirects here with code and state)
router.get("/callback", validate(oauthCallbackSchema, "query"), handleOAuthCallback);

// Protected endpoints for managing Google Workspace connection
router.get("/connect", authMiddleware, requirePermission("google_meet.connect"), getConnectUrl);
router.get("/status", authMiddleware, requirePermission("google_meet.connect"), getConnectionStatus);
router.post("/disconnect", authMiddleware, requirePermission("google_meet.connect"), disconnect);

export default router;

import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireAnyPermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { invitationRateLimiter } from "../../middlewares/rate-limit.middleware";
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  getInvitationByToken,
  acceptInvitation,
} from "./invitation.controller";
import {
  createInvitationSchema,
  invitationListQuerySchema,
  acceptInviteTokenParamSchema,
  acceptInvitationSchema,
} from "./invitation.validation";

const router = Router();

// Public accept endpoints (rate limited) — register before auth middleware
router.get(
  "/accept/:token",
  invitationRateLimiter,
  validate(acceptInviteTokenParamSchema, "params"),
  getInvitationByToken
);

router.post(
  "/accept",
  invitationRateLimiter,
  validate(acceptInvitationSchema),
  acceptInvitation
);

// Authenticated management routes
router.post(
  "/",
  authMiddleware,
  requireAnyPermission("user.create", "user.invite"),
  validate(createInvitationSchema),
  createInvitation
);

router.get(
  "/",
  authMiddleware,
  requireAnyPermission("user.create", "user.invite", "user.read"),
  validate(invitationListQuerySchema, "query"),
  listInvitations
);

router.post(
  "/:id/revoke",
  authMiddleware,
  requireAnyPermission("user.create", "user.invite"),
  revokeInvitation
);

export default router;

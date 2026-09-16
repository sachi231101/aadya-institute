import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import * as controller from "./leave-request.controller";
import {
  createLeaveRequestSchema,
  leaveRequestIdParamSchema,
  reviewLeaveRequestSchema,
} from "./leave-request.validation";

const router = Router();

router.use(authMiddleware);

router.get(
  "/me",
  requireRole("STUDENT"),
  controller.listMyLeaveRequests
);

router.post(
  "/",
  requireRole("STUDENT"),
  validate(createLeaveRequestSchema),
  controller.createLeaveRequest
);

router.patch(
  "/:id/cancel",
  requireRole("STUDENT"),
  validate(leaveRequestIdParamSchema, "params"),
  controller.cancelLeaveRequest
);

router.get(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.listPendingLeaveRequests
);

router.patch(
  "/:id/review",
  requireRole("ADMIN", "SUPER_ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  validate(leaveRequestIdParamSchema, "params"),
  validate(reviewLeaveRequestSchema),
  controller.reviewLeaveRequest
);

export default router;

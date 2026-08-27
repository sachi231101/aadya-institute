import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  submitFeedbackSchema,
  listFeedbackQuerySchema,
  facultyRatingsQuerySchema,
} from "./feedback.validation";
import * as controller from "./feedback.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/ratings",
  requirePermission("feedback.read"),
  validate(facultyRatingsQuerySchema, "query"),
  controller.getFacultyRatings
);

router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR", "STUDENT"),
  validate(listFeedbackQuerySchema, "query"),
  controller.listFeedback
);

router.post(
  "/",
  requirePermission("feedback.create"),
  validate(submitFeedbackSchema),
  controller.submitFeedback
);

export default router;

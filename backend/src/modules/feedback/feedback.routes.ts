import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission, requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
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
  requirePermissionUnlessRoles("feedback.read", "FACULTY", "STUDENT"),
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

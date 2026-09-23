import { Router } from "express";
import * as controller from "./student.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission, requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createStudentSchema,
  updateStudentSchema,
  discontinueStudentSchema,
  continueStudentSchema,
} from "./student.validation";
import {
  getStudentAttendance,
  getStudentAttendanceSummary,
} from "../attendance/attendance.controller";

const router = Router();

// All student routes require authentication
router.use(authMiddleware);

// GET /api/v1/students/me/dashboard — Student personal dashboard
router.get(
  "/me/dashboard",
  requireRole("STUDENT"),
  requirePermission("dashboard.read"),
  controller.getMyDashboard
);

// GET /api/v1/students/me/curriculum — Completed batch curriculum only
router.get(
  "/me/curriculum",
  requireRole("STUDENT"),
  requirePermission("module.read"),
  controller.getMyCurriculum
);

// ─── Student Attendance Endpoints ─────────────────────────────────────────────
router.get(
  "/:studentId/attendance/summary",
  requirePermission("attendance.read"),
  getStudentAttendanceSummary
);

router.get(
  "/:studentId/attendance",
  requirePermission("attendance.read"),
  getStudentAttendance
);

// ─── Student CRUD Endpoints ───────────────────────────────────────────────────

// GET list/detail — FACULTY teaching desk bypass; CM/Counsellor need student.read
router.get(
  "/",
  requirePermissionUnlessRoles("student.read", "FACULTY"),
  controller.getAll
);

router.get(
  "/:id/performance",
  requirePermissionUnlessRoles("student.read", "FACULTY"),
  controller.getPerformance
);

router.get(
  "/:id",
  requirePermissionUnlessRoles("student.read", "FACULTY"),
  controller.getById
);

router.post(
  "/",
  requirePermission("student.create"),
  validate(createStudentSchema),
  controller.create
);

router.patch(
  "/:id",
  requirePermission("student.update"),
  validate(updateStudentSchema),
  controller.update
);

router.post(
  "/:id/send-credentials-whatsapp",
  requirePermission("student.update"),
  controller.sendCredentialsWhatsApp
);

router.post(
  "/:id/discontinue",
  requirePermission("student.update"),
  validate(discontinueStudentSchema),
  controller.discontinue
);

router.post(
  "/:id/continue",
  requireRole("ADMIN"),
  requirePermission("student.update"),
  validate(continueStudentSchema),
  controller.continueEnrollment
);

router.post(
  "/:id/notify-discontinuation-risk",
  requirePermission("student.update"),
  controller.notifyDiscontinuationRisk
);

router.post(
  "/:id/ai-call",
  requirePermission("student.update"),
  controller.triggerAiCall
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

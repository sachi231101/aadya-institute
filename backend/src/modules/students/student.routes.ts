import { Router } from "express";
import * as controller from "./student.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission, requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createStudentSchema,
  updateStudentSchema,
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

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

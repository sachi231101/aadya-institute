import { Router } from "express";
import * as controller from "./student.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
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

// GET /api/v1/students — List all students (ADMIN or CENTER_MANAGER)
// GET /api/v1/students — List all students
router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.getAll
);

// GET /api/v1/students/:id/performance — Get student performance metrics
router.get(
  "/:id/performance",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  controller.getPerformance
);

// GET /api/v1/students/:id — Get single student
router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  controller.getById
);

// POST /api/v1/students — Create student
router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(createStudentSchema),
  controller.create
);

// PATCH /api/v1/students/:id — Update student
router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(updateStudentSchema),
  controller.update
);

// POST /api/v1/students/:id/send-credentials-whatsapp — Send ID and password to student WhatsApp
router.post(
  "/:id/send-credentials-whatsapp",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  controller.sendCredentialsWhatsApp
);

// DELETE /api/v1/students/:id — Soft-delete student (ADMIN only)
router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

import { Router } from "express";
import * as controller from "./attendance.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  rosterQuerySchema,
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
} from "./attendance.validation";

const router = Router();

router.use(authMiddleware);

// ─── Required Business API Endpoints ──────────────────────────────────────────

// PATCH /api/v1/attendance/:attendanceId — Update single attendance record
router.patch(
  "/:attendanceId",
  requirePermission("attendance.update"),
  controller.patchAttendance
);

// GET /api/v1/students/:studentId/attendance — Get student attendance history
router.get(
  "/student/:studentId",
  requirePermission("attendance.read"),
  controller.getStudentAttendance
);

// GET /api/v1/students/:studentId/attendance/summary — Get student attendance summary
router.get(
  "/student/:studentId/summary",
  requirePermission("attendance.read"),
  controller.getStudentAttendanceSummary
);

// ─── Class Session Endpoints ──────────────────────────────────────────────────

// GET /api/v1/attendance/session/:id — Get session attendance
router.get(
  "/session/:id",
  requirePermission("attendance.read"),
  controller.getSessionAttendance
);

// POST /api/v1/attendance/session/:id — Bulk submit session attendance
router.post(
  "/session/:id",
  requirePermission("attendance.mark"),
  controller.postSessionAttendance
);

// ─── Legacy Endpoints ─────────────────────────────────────────────────────────

router.get(
  "/roster",
  requirePermission("attendance.read"),
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  validate(rosterQuerySchema, "query"),
  controller.getRoster
);

router.post(
  "/mark",
  requirePermission("attendance.mark"),
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  validate(markAttendanceSchema),
  controller.mark
);

router.post(
  "/bulk",
  requirePermission("attendance.mark"),
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  validate(bulkMarkAttendanceSchema),
  controller.bulkMark
);

// GET /api/v1/attendance/session/:sessionId — Get attendance for a class session
router.get(
  "/session/:sessionId",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  controller.getSessionAttendance
);

export default router;

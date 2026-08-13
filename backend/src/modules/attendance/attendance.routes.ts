import { Router } from "express";
import * as controller from "./attendance.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  rosterQuerySchema,
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
} from "./attendance.validation";

const router = Router();

// All attendance routes require authentication
router.use(authMiddleware);

// GET /api/v1/attendance/roster — Get daily attendance roster
router.get(
  "/roster",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  validate(rosterQuerySchema, "query"),
  controller.getRoster
);

// POST /api/v1/attendance/mark — Mark single student attendance
router.post(
  "/mark",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY", "COUNSELLOR"),
  validate(markAttendanceSchema),
  controller.mark
);

// POST /api/v1/attendance/bulk — Bulk mark attendance
router.post(
  "/bulk",
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

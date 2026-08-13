import { Router } from "express";
import * as controller from "./faculty.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createFacultySchema,
  updateFacultySchema,
  assignCourseSchema,
  markAttendanceSchema,
} from "./faculty.validation";

const router = Router();

// All faculty routes require authentication
router.use(authMiddleware);

// GET /api/v1/faculty — List all faculty
router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  controller.getAll
);

// GET /api/v1/faculty/courses — List assigned courses/batches
router.get(
  "/courses",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  controller.getCourses
);

// POST /api/v1/faculty/courses/assign — Assign faculty to a batch
router.post(
  "/courses/assign",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(assignCourseSchema),
  controller.assignCourse
);

// GET /api/v1/faculty/attendance — List faculty attendance records
router.get(
  "/attendance",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  controller.getAttendance
);

// POST /api/v1/faculty/attendance — Mark/log faculty attendance
router.post(
  "/attendance",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(markAttendanceSchema),
  controller.markAttendance
);

// GET /api/v1/faculty/:id — Get single faculty
router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  controller.getById
);

// POST /api/v1/faculty — Create faculty
router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(createFacultySchema),
  controller.create
);

// PATCH /api/v1/faculty/:id — Update faculty
router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(updateFacultySchema),
  controller.update
);

// DELETE /api/v1/faculty/:id — Soft-delete faculty (ADMIN only)
router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

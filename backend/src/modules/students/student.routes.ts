import { Router } from "express";
import * as controller from "./student.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createStudentSchema,
  updateStudentSchema,
} from "./student.validation";

const router = Router();

// All student routes require authentication
router.use(authMiddleware);

// GET /api/v1/students — List all students
router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
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

// DELETE /api/v1/students/:id — Soft-delete student (ADMIN only)
router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

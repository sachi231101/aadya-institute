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

// GET /api/v1/students — List all students (ADMIN or CENTER_MANAGER)
router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER"),
  controller.getAll
);

// GET /api/v1/students/:id/performance — Get student performance metrics
router.get(
  "/:id/performance",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY"),
  controller.getPerformance
);

// GET /api/v1/students/:id — Get single student
router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY"),
  controller.getById
);

// POST /api/v1/students — Create student (ADMIN only)
router.post(
  "/",
  requireRole("ADMIN"),
  validate(createStudentSchema),
  controller.create
);

// PATCH /api/v1/students/:id — Update student (ADMIN only)
router.patch(
  "/:id",
  requireRole("ADMIN"),
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

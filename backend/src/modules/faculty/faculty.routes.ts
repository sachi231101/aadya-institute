import { Router } from "express";
import * as controller from "./faculty.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createFacultySchema, updateFacultySchema } from "./faculty.validation";

const router = Router();

// All faculty routes require authentication
router.use(authMiddleware);

// GET /api/v1/faculty — List all faculty (ADMIN or CENTER_MANAGER)
router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER"),
  controller.getAll
);

// GET /api/v1/faculty/:id — Get single faculty (ADMIN or CENTER_MANAGER)
router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER"),
  controller.getById
);

// POST /api/v1/faculty — Create faculty (ADMIN only)
router.post(
  "/",
  requireRole("ADMIN"),
  validate(createFacultySchema),
  controller.create
);

// PATCH /api/v1/faculty/:id — Update faculty (ADMIN only)
router.patch(
  "/:id",
  requireRole("ADMIN"),
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

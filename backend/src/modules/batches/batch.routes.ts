import { Router } from "express";
import * as controller from "./batch.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createBatchSchema,
  updateBatchSchema,
  assignFacultySchema,
  enrollStudentSchema,
} from "./batch.validation";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"),
  controller.getAll
);

router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"),
  controller.getById
);

router.get(
  "/:id/students",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.getStudents
);

router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(createBatchSchema),
  controller.create
);

router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(updateBatchSchema),
  controller.update
);

router.patch(
  "/:id/faculty",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  validate(assignFacultySchema),
  controller.assignFaculty
);

router.post(
  "/:id/students",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  validate(enrollStudentSchema),
  controller.enrollStudent
);

router.delete(
  "/:id/students/:studentId",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.removeStudent
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

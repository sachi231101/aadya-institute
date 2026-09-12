import { Router } from "express";
import * as controller from "./course.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import {
  requirePermission,
  requireAnyPermissionUnlessRoles,
} from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createCourseSchema, updateCourseSchema } from "./course.validation";

/** Shared course list/detail access for dropdowns (leads, admissions) without course module. */
const COURSE_READ_ANY = [
  "course.read",
  "lead.read",
  "lead.create",
  "admission.read",
  "admission.create",
] as const;

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requireAnyPermissionUnlessRoles([...COURSE_READ_ANY], "FACULTY", "STUDENT"),
  controller.getAll
);

router.get(
  "/:id",
  requireAnyPermissionUnlessRoles([...COURSE_READ_ANY], "FACULTY", "STUDENT"),
  controller.getById
);

router.post(
  "/",
  requirePermission("course.create"),
  validate(createCourseSchema),
  controller.create
);

router.patch(
  "/:id",
  requirePermission("course.update"),
  validate(updateCourseSchema),
  controller.update
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

import { Router } from "express";
import * as controller from "./course.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission, requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createCourseSchema, updateCourseSchema } from "./course.validation";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requirePermissionUnlessRoles("course.read", "FACULTY", "STUDENT"),
  controller.getAll
);

router.get(
  "/:id",
  requirePermissionUnlessRoles("course.read", "FACULTY", "STUDENT"),
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

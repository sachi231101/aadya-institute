import { Router } from "express";
import * as controller from "./course.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createCourseSchema, updateCourseSchema } from "./course.validation";

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

router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(createCourseSchema),
  controller.create
);

router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER"),
  validate(updateCourseSchema),
  controller.update
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

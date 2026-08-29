import { Router } from "express";
import * as controller from "./module.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createModuleSchema,
  updateModuleSchema,
  addTopicSchema,
} from "./module.validation";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"),
  controller.getByCourse
);

router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER"),
  validate(createModuleSchema),
  controller.create
);

router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER"),
  validate(updateModuleSchema),
  controller.update
);

router.post(
  "/:id/topics",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY"),
  validate(addTopicSchema),
  controller.addTopic
);

router.patch(
  "/:id/topics/:topicId/toggle",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY"),
  controller.toggleTopic
);

router.delete(
  "/:id/topics/:topicId",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY"),
  controller.removeTopic
);

router.delete(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER"),
  controller.remove
);

export default router;

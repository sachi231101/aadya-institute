import { Router } from "express";
import * as controller from "./module.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission, requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
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
  requirePermissionUnlessRoles("module.read", "FACULTY", "STUDENT"),
  controller.getByCourse
);

router.post(
  "/",
  requirePermission("module.create"),
  validate(createModuleSchema),
  controller.create
);

router.patch(
  "/:id",
  requirePermission("module.update"),
  validate(updateModuleSchema),
  controller.update
);

router.post(
  "/:id/topics",
  requirePermission("module.update"),
  validate(addTopicSchema),
  controller.addTopic
);

router.patch(
  "/:id/topics/:topicId/toggle",
  requirePermission("module.update"),
  controller.toggleTopic
);

router.delete(
  "/:id/topics/:topicId",
  requirePermission("module.update"),
  controller.removeTopic
);

router.delete(
  "/:id",
  requirePermission("module.update"),
  controller.remove
);

export default router;

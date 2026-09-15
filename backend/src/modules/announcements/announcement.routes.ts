import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
} from "./announcement.validation";
import * as controller from "./announcement.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requirePermissionUnlessRoles("notification.read", "FACULTY", "ADMIN"),
  validate(listAnnouncementsQuerySchema, "query"),
  controller.listAnnouncements
);

router.post(
  "/",
  requirePermissionUnlessRoles("notification.read", "FACULTY", "ADMIN"),
  validate(createAnnouncementSchema),
  controller.createAnnouncement
);

router.delete(
  "/:id",
  requirePermissionUnlessRoles("notification.read", "FACULTY", "ADMIN"),
  controller.deleteAnnouncement
);

export default router;

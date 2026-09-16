import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  markAllAnnouncementsSchema,
} from "./announcement.validation";
import * as controller from "./announcement.controller";

const router = Router();

router.use(authMiddleware);

const canRead = requirePermissionUnlessRoles(
  "announcement.read",
  "FACULTY",
  "ADMIN",
  "STUDENT"
);
const canWrite = requirePermissionUnlessRoles(
  "announcement.create",
  "FACULTY",
  "ADMIN"
);

router.get(
  "/",
  canRead,
  validate(listAnnouncementsQuerySchema, "query"),
  controller.listAnnouncements
);

router.post(
  "/read-all",
  canRead,
  validate(markAllAnnouncementsSchema),
  controller.markAllAnnouncementsRead
);

router.post(
  "/",
  canWrite,
  validate(createAnnouncementSchema),
  controller.createAnnouncement
);

router.post("/:id/read", canRead, controller.markAnnouncementRead);

router.delete(
  "/:id",
  canWrite,
  controller.deleteAnnouncement
);

export default router;

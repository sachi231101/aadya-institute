import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as controller from "./whatsapp.controller";

const router = Router();

router.use(authMiddleware);

// Send test message (ADMIN / Manage permission)
router.post("/test", requirePermission("notification.manage"), controller.sendTestMessage);

// ─── Notification History ───────────────────────────────────────────────────
router.get("/", requirePermission("notification.read"), controller.getNotifications);
router.get("/unread-count", controller.getUnreadCount);
router.patch("/read-all", controller.markAllAsRead);
router.get("/:id", requirePermission("notification.read"), controller.getNotificationById);
router.patch("/:id/read", controller.markAsRead);
router.post("/:id/resend", requirePermission("notification.resend"), controller.resendNotification);
router.delete("/:id", controller.deleteNotification);

// ─── Templates ──────────────────────────────────────────────────────────────
router.get("/templates/all", requirePermission("notification.read"), controller.listTemplates);
router.post("/templates", requirePermission("notification.manage"), controller.createTemplate);
router.patch("/templates/:id", requirePermission("notification.manage"), controller.updateTemplate);
router.patch("/templates/:id/status", requirePermission("notification.manage"), controller.toggleTemplateStatus);

// ─── Rules ──────────────────────────────────────────────────────────────────
router.get("/rules/all", requirePermission("notification.read"), controller.listRules);
router.post("/rules", requirePermission("notification.manage"), controller.upsertRule);

export default router;

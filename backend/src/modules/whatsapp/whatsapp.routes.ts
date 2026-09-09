import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireAnyPermission } from "../../middlewares/permission.middleware";
import * as controller from "./whatsapp.controller";

const router = Router();

router.use(authMiddleware);

// Static paths MUST be registered before /:id

router.get(
  "/automation-config",
  requireAnyPermission("whatsapp.automation.read", "notification.read"),
  controller.getAutomationConfig
);
router.patch(
  "/automation-config",
  requireAnyPermission("whatsapp.automation.manage", "notification.manage"),
  controller.patchAutomationConfig
);

router.get(
  "/automations",
  requireAnyPermission("whatsapp.automation.read", "notification.read"),
  controller.listAutomations
);
router.patch(
  "/automations/:type",
  requireAnyPermission("whatsapp.automation.manage", "notification.manage"),
  controller.patchAutomation
);
router.post(
  "/automations/:type/test",
  requireAnyPermission("whatsapp.test.send", "notification.manage"),
  controller.testAutomation
);

router.get(
  "/history",
  requireAnyPermission("whatsapp.history.read", "notification.read"),
  controller.getHistory
);

router.post(
  "/test",
  requireAnyPermission("whatsapp.test.send", "notification.manage"),
  controller.sendTestMessage
);

router.get(
  "/templates/all",
  requireAnyPermission("whatsapp.template.read", "notification.read"),
  controller.listTemplates
);
router.get(
  "/templates",
  requireAnyPermission("whatsapp.template.read", "notification.read"),
  controller.listTemplates
);
router.get(
  "/provider-templates",
  requireAnyPermission("whatsapp.template.read", "notification.read"),
  controller.listProviderTemplates
);
router.post(
  "/templates/sync",
  requireAnyPermission("whatsapp.template.create", "whatsapp.template.update", "notification.manage"),
  controller.syncTemplates
);
router.post(
  "/templates",
  requireAnyPermission("whatsapp.template.create", "notification.manage"),
  controller.createTemplate
);
router.patch(
  "/templates/:id",
  requireAnyPermission("whatsapp.template.update", "notification.manage"),
  controller.updateTemplate
);
router.patch(
  "/templates/:id/status",
  requireAnyPermission("whatsapp.template.update", "notification.manage"),
  controller.toggleTemplateStatus
);
router.delete(
  "/templates/:id",
  requireAnyPermission("whatsapp.template.update", "notification.manage"),
  controller.deleteTemplate
);

router.get(
  "/rules/all",
  requireAnyPermission("whatsapp.automation.read", "notification.read"),
  controller.listRules
);
router.post(
  "/rules",
  requireAnyPermission("whatsapp.automation.manage", "notification.manage"),
  controller.upsertRule
);

router.get(
  "/",
  requireAnyPermission("whatsapp.history.read", "notification.read"),
  controller.getNotifications
);
router.get("/unread-count", controller.getUnreadCount);
router.patch("/read-all", controller.markAllAsRead);

router.get(
  "/:id",
  requireAnyPermission("whatsapp.history.read", "notification.read"),
  controller.getNotificationById
);
router.patch("/:id/read", controller.markAsRead);
router.post(
  "/:id/resend",
  requireAnyPermission("notification.resend", "whatsapp.automation.manage"),
  controller.resendNotification
);
router.delete("/:id", controller.deleteNotification);

export default router;

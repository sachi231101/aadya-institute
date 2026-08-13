import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import * as controller from "./whatsapp.controller";

const router = Router();

router.use(authMiddleware);

// Send test message (ADMIN / Manage permission)
router.post("/test", requirePermission("notification.manage"), controller.sendTestMessage);

export default router;

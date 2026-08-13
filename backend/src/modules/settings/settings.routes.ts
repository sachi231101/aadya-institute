import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  getSettings,
  updatePersonal,
  changePassword,
  updateNotifications,
  updateSystem,
  revokeSession,
} from "./settings.controller";

const router = Router();

router.use(authMiddleware);

router.get("/me", getSettings);
router.put("/personal", updatePersonal);
router.put("/security/password", changePassword);
router.put("/notifications", updateNotifications);
router.put("/system", updateSystem);
router.delete("/security/sessions/:id", revokeSession);

export default router;

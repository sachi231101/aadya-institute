import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createClassSessionSchema,
  updateClassSessionSchema,
} from "./class-session.validation";
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  cancelSession,
  deleteSession,
  startLiveSession,
  endLiveSession,
  getActiveLiveSessions,
} from "./class-session.controller";
import {
  getSessionAttendance,
  postSessionAttendance,
} from "../attendance/attendance.controller";

const router = Router();

router.use(authMiddleware);

// Active live sessions query (for Student & Faculty dashboards)
router.get("/active/live", getActiveLiveSessions);

// Attendance sub-routes for class session
router.get("/:id/attendance", requirePermission("attendance.read"), getSessionAttendance);
router.post("/:id/attendance", requirePermission("attendance.mark"), postSessionAttendance);

// Live class management actions
router.post("/:id/start-live", startLiveSession);
router.post("/:id/end-live", endLiveSession);

// Session CRUD
router.get("/", getSessions);
router.get("/:id", getSessionById);
router.post("/", validate(createClassSessionSchema), createSession);
router.patch("/:id", validate(updateClassSessionSchema), updateSession);
router.post("/:id/cancel", cancelSession);
router.delete("/:id", deleteSession);

export default router;

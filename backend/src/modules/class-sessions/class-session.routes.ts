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
} from "./class-session.controller";
import {
  getSessionAttendance,
  postSessionAttendance,
} from "../attendance/attendance.controller";

const router = Router();

router.use(authMiddleware);

// Attendance sub-routes for class session
router.get("/:id/attendance", requirePermission("attendance.read"), getSessionAttendance);
router.post("/:id/attendance", requirePermission("attendance.mark"), postSessionAttendance);

// Session CRUD
router.get("/", getSessions);
router.get("/:id", getSessionById);
router.post("/", validate(createClassSessionSchema), createSession);
router.patch("/:id", validate(updateClassSessionSchema), updateSession);
router.post("/:id/cancel", cancelSession);
router.delete("/:id", deleteSession);

export default router;

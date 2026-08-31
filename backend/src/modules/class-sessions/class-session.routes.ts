import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createClassSessionSchema,
  updateClassSessionSchema,
  queryClassSessionSchema,
} from "./class-session.validation";
import {
  createMeetSpaceSchema,
} from "../google-workspace/google-workspace.validation";
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
  getSessionMeeting,
  getMeetSpace,
} from "./class-session.controller";
import {
  createMeetForSession,
  syncSessionRecordings,
} from "../google-workspace/google-workspace.controller";
import {
  getSessionAttendance,
  postSessionAttendance,
} from "../attendance/attendance.controller";

const router = Router();

router.use(authMiddleware);

// Active live sessions query (for Student & Faculty dashboards)
router.get("/active/live", getActiveLiveSessions);

// Meeting Access endpoint (Student, Faculty, Staff authorized access)
router.get("/:id/meeting", getSessionMeeting);

// Google Meet Space management
router.post("/:id/google-meet", requirePermission("google_meet.create"), validate(createMeetSpaceSchema), createMeetForSession);
router.get("/:id/google-meet", requirePermission("google_meet.read"), getMeetSpace);
router.post("/:id/recordings/sync", requirePermission("recording.manage"), syncSessionRecordings);

// Attendance sub-routes for class session
router.get("/:id/attendance", requirePermission("attendance.read"), getSessionAttendance);
router.post("/:id/attendance", requirePermission("attendance.mark"), postSessionAttendance);

// Live class management actions
router.post("/:id/start-live", startLiveSession);
router.post("/:id/end-live", endLiveSession);

// Session CRUD
router.get("/", requirePermission("schedule.read"), validate(queryClassSessionSchema, "query"), getSessions);
router.get("/:id", requirePermission("schedule.read"), getSessionById);
router.post("/", requirePermission("schedule.create"), validate(createClassSessionSchema), createSession);
router.patch("/:id", requirePermission("schedule.update"), validate(updateClassSessionSchema), updateSession);
router.post("/:id/cancel", requirePermission("schedule.update"), cancelSession);
router.delete("/:id", requirePermission("schedule.delete"), deleteSession);

export default router;

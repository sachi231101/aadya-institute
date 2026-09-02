import { Router } from "express";
import * as controller from "./batch.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createBatchSchema,
  updateBatchSchema,
  assignFacultySchema,
  enrollStudentSchema,
  createBatchScheduleSchema,
  updateBatchScheduleSchema,
  generateSessionsSchema,
  transferStudentSchema,
  availableFacultyQuerySchema,
} from "./batch.validation";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(authMiddleware);

router.get(
  "/faculty/available",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(availableFacultyQuerySchema, "query"),
  controller.getAvailableFaculty
);

router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"),
  controller.getAll
);

router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"),
  controller.getById
);

router.get(
  "/:id/students",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.getStudents
);

router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(createBatchSchema),
  controller.create
);

router.post(
  "/transfer-student",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(transferStudentSchema),
  controller.transferStudent
);

router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(updateBatchSchema),
  controller.update
);

router.patch(
  "/:id/faculty",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(assignFacultySchema),
  controller.assignFaculty
);

router.post(
  "/:id/students",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(enrollStudentSchema),
  controller.enrollStudent
);

router.delete(
  "/:id/students/:studentId",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  controller.removeStudent
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

router.get(
  "/:id/schedules",
  requirePermission("schedule.read"),
  controller.getSchedules
);

router.post(
  "/:id/schedules",
  requirePermission("schedule.create"),
  validate(createBatchScheduleSchema),
  controller.createSchedule
);

router.patch(
  "/:id/schedules/:scheduleId",
  requirePermission("schedule.update"),
  validate(updateBatchScheduleSchema),
  controller.updateSchedule
);

router.delete(
  "/:id/schedules/:scheduleId",
  requirePermission("schedule.delete"),
  controller.deleteSchedule
);

router.post(
  "/:id/generate-sessions",
  requirePermission("schedule.create"),
  validate(generateSessionsSchema),
  controller.generateSessions
);

export default router;

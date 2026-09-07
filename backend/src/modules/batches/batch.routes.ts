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
  requirePermission("batch.read"),
  validate(availableFacultyQuerySchema, "query"),
  controller.getAvailableFaculty
);

router.get(
  "/",
  requirePermission("batch.read"),
  controller.getAll
);

router.get(
  "/:id",
  requirePermission("batch.read"),
  controller.getById
);

router.get(
  "/:id/students",
  requirePermission("batch.read"),
  controller.getStudents
);

router.post(
  "/",
  requirePermission("batch.create"),
  validate(createBatchSchema),
  controller.create
);

router.post(
  "/transfer-student",
  requirePermission("batch.update"),
  validate(transferStudentSchema),
  controller.transferStudent
);

router.patch(
  "/:id",
  requirePermission("batch.update"),
  validate(updateBatchSchema),
  controller.update
);

router.patch(
  "/:id/faculty",
  requirePermission("batch.update"),
  validate(assignFacultySchema),
  controller.assignFaculty
);

router.post(
  "/:id/students",
  requirePermission("batch.update"),
  validate(enrollStudentSchema),
  controller.enrollStudent
);

router.delete(
  "/:id/students/:studentId",
  requirePermission("batch.update"),
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

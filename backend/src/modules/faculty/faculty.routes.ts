import { Router } from "express";
import * as controller from "./faculty.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createFacultySchema,
  updateFacultySchema,
  listFacultyQuerySchema,
  myStudentsQuerySchema,
  assignCourseSchema,
  markAttendanceSchema,
  dailyAttendanceQuerySchema,
  bulkDailyAttendanceSchema,
} from "./faculty.validation";

const router = Router();

router.use(authMiddleware);

// Personal teaching desk — must be registered before /:id
router.get(
  "/me/dashboard",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY"),
  controller.getMyDashboard
);

router.get(
  "/me/students",
  requireRole("ADMIN", "CENTER_MANAGER", "FACULTY"),
  validate(myStudentsQuerySchema, "query"),
  controller.getMyStudents
);

router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  validate(listFacultyQuerySchema, "query"),
  controller.getAll
);

router.get(
  "/courses",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.getCourses
);

router.post(
  "/courses/assign",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(assignCourseSchema),
  controller.assignCourse
);

router.get(
  "/attendance",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.getAttendance
);

router.post(
  "/attendance",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  validate(markAttendanceSchema),
  controller.markAttendance
);

router.get(
  "/daily-attendance",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  validate(dailyAttendanceQuerySchema, "query"),
  controller.getDailyAttendance
);

router.put(
  "/daily-attendance",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(bulkDailyAttendanceSchema),
  controller.saveDailyAttendance
);

router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"),
  controller.getById
);

router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(createFacultySchema),
  controller.create
);

router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  validate(updateFacultySchema),
  controller.update
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

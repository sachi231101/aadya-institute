import { Router } from "express";
import * as controller from "./faculty.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission, requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
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
  requirePermissionUnlessRoles("faculty.read", "FACULTY"),
  validate(listFacultyQuerySchema, "query"),
  controller.getAll
);

router.get(
  "/courses",
  requirePermissionUnlessRoles("course.read", "FACULTY"),
  controller.getCourses
);

router.post(
  "/courses/assign",
  requirePermission("faculty.update"),
  validate(assignCourseSchema),
  controller.assignCourse
);

router.get(
  "/attendance",
  requirePermissionUnlessRoles("attendance.read", "FACULTY"),
  controller.getAttendance
);

router.post(
  "/attendance",
  requirePermission("attendance.mark"),
  validate(markAttendanceSchema),
  controller.markAttendance
);

router.get(
  "/daily-attendance",
  requirePermissionUnlessRoles("attendance.read", "FACULTY"),
  validate(dailyAttendanceQuerySchema, "query"),
  controller.getDailyAttendance
);

router.put(
  "/daily-attendance",
  requirePermission("attendance.update"),
  validate(bulkDailyAttendanceSchema),
  controller.saveDailyAttendance
);

router.get(
  "/:id",
  requirePermissionUnlessRoles("faculty.read", "FACULTY"),
  controller.getById
);

router.post(
  "/",
  requirePermission("faculty.create"),
  validate(createFacultySchema),
  controller.create
);

router.patch(
  "/:id",
  requirePermission("faculty.update"),
  validate(updateFacultySchema),
  controller.update
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  controller.remove
);

export default router;

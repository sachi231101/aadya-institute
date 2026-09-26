import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  requirePermission,
  requirePermissionUnlessRoles,
} from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  studentReportQuerySchema,
  admissionsReportQuerySchema,
  attendanceReportQuerySchema,
  facultyReportQuerySchema,
  courseReportQuerySchema,
  examinationsReportQuerySchema,
  financialReportQuerySchema,
} from "./report.validation";
import {
  getStudentReport,
  getFacultyReport,
  getCourseReport,
  getFinancialReport,
  getScheduleSummary,
  getAdmissionsReport,
  getAttendanceReport,
  getExaminationsReport,
} from "./report.controller";

const router = Router();

router.use(authMiddleware);

// FACULTY bypass: RolePermission may lack report.read; controller scopes to teaching-desk students.
router.get(
  "/students",
  requirePermissionUnlessRoles("report.read", "FACULTY"),
  validate(studentReportQuerySchema, "query"),
  getStudentReport
);
router.get("/admissions", requirePermission("report.read"), validate(admissionsReportQuerySchema, "query"), getAdmissionsReport);
router.get("/attendance", requirePermission("report.read"), validate(attendanceReportQuerySchema, "query"), getAttendanceReport);
router.get(
  "/examinations",
  requirePermission("report.read"),
  validate(examinationsReportQuerySchema, "query"),
  getExaminationsReport
);
router.get("/faculty", requirePermission("report.read"), validate(facultyReportQuerySchema, "query"), getFacultyReport);
router.get(
  "/courses",
  requirePermission("report.read"),
  validate(courseReportQuerySchema, "query"),
  getCourseReport
);
router.get(
  "/financial",
  requirePermission("report.read"),
  validate(financialReportQuerySchema, "query"),
  getFinancialReport
);
router.get("/schedule/summary", requirePermission("report.read"), getScheduleSummary);

export default router;

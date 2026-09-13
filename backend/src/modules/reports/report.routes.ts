import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
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

router.get(
  "/students",
  requirePermission("report.read"),
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

import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
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

router.get("/students", requirePermission("report.read"), getStudentReport);
router.get("/admissions", requirePermission("report.read"), getAdmissionsReport);
router.get("/attendance", requirePermission("report.read"), getAttendanceReport);
router.get("/examinations", requirePermission("report.read"), getExaminationsReport);
router.get("/faculty", requirePermission("report.read"), getFacultyReport);
router.get("/courses", requirePermission("report.read"), getCourseReport);
router.get("/financial", requirePermission("report.read"), getFinancialReport);
router.get("/schedule/summary", requirePermission("report.read"), getScheduleSummary);

export default router;

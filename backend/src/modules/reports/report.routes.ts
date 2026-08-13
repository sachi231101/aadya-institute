import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import {
  getStudentReport,
  getFacultyReport,
  getCourseReport,
  getFinancialReport,
} from "./report.controller";

const router = Router();

router.use(authMiddleware);

router.get("/students", requirePermission("report.read"), getStudentReport);
router.get("/faculty", requirePermission("report.read"), getFacultyReport);
router.get("/courses", requirePermission("report.read"), getCourseReport);
router.get("/financial", requirePermission("report.read"), getFinancialReport);

export default router;

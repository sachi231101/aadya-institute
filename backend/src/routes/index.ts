import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import instituteRoutes from "../modules/institutes/institute.routes";
import userRoutes from "../modules/users/user.routes";
import branchRoutes from "../modules/branches/branch.routes";
import leadRoutes from "../modules/leads/lead.routes";
import facultyRoutes from "../modules/faculty/faculty.routes";
import studentRoutes from "../modules/students/student.routes";
import attendanceRoutes from "../modules/attendance/attendance.routes";
import { whatsappWebhookVerify, whatsappWebhookHandler } from "../webhooks/whatsapp/whatsapp.webhook";
import { sarvamWebhookHandler } from "../webhooks/ai-calling/ai-calling.webhook";

import courseRoutes from "../modules/courses/course.routes";
import batchRoutes from "../modules/batches/batch.routes";
import moduleRoutes from "../modules/modules/module.routes";
import admissionsRoutes from "../modules/admissions/admissions.routes";
import classSessionRoutes from "../modules/class-sessions/class-session.routes";
import feeRoutes from "../modules/fees/fee.routes";
import reportRoutes from "../modules/reports/report.routes";
import settingsRoutes from "../modules/settings/settings.routes";
import notificationRoutes from "../modules/notifications/notification.routes";

const router = Router();




// Auth
router.use("/auth", authRoutes);

// Institutes
router.use("/institutes", instituteRoutes);

// Users
router.use("/users", userRoutes);

// Branches
router.use("/branches", branchRoutes);

// Admissions & Leads
router.use("/admissions", admissionsRoutes);

// Leads + AI Calling (Phase 1)
router.use("/leads", leadRoutes);

// Faculty
router.use("/faculty", facultyRoutes);

// Students
router.use("/students", studentRoutes);

// Courses
router.use("/courses", courseRoutes);

// Modules / Curriculum
router.use("/modules", moduleRoutes);

// Batches
router.use("/batches", batchRoutes);

// Attendance
router.use("/attendance", attendanceRoutes);

// Class Sessions & Schedule
router.use("/class-sessions", classSessionRoutes);

// Fees Management
router.use("/fees", feeRoutes);


// Reports
router.use("/reports", reportRoutes);

// User & Account Settings
router.use("/settings", settingsRoutes);

// Notifications System
router.use("/notifications", notificationRoutes);




// Webhooks (no auth — must be publicly accessible)
router.get("/webhooks/whatsapp", whatsappWebhookVerify);
router.post("/webhooks/whatsapp", whatsappWebhookHandler);
router.post("/webhooks/sarvam/callback", sarvamWebhookHandler);

export default router;


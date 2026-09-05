import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import instituteRoutes from "../modules/institutes/institute.routes";
import administrationRoutes from "../modules/administration/administration.routes";
import organizationRoutes from "../modules/organization/organization.routes";
import userRoutes from "../modules/users/user.routes";
import invitationRoutes from "../modules/invitations/invitation.routes";
import branchRoutes from "../modules/branches/branch.routes";
import leadRoutes from "../modules/leads/lead.routes";
import facultyRoutes from "../modules/faculty/faculty.routes";
import studentRoutes from "../modules/students/student.routes";
import attendanceRoutes from "../modules/attendance/attendance.routes";
import { whatsappWebhookVerify, whatsappWebhookHandler } from "../modules/whatsapp/whatsapp.webhook";
import { sarvamWebhookHandler } from "../webhooks/ai-calling/ai-calling.webhook";

import courseRoutes from "../modules/courses/course.routes";
import batchRoutes from "../modules/batches/batch.routes";
import moduleRoutes from "../modules/modules/module.routes";
import admissionsRoutes from "../modules/admissions/admissions.routes";
import classSessionRoutes from "../modules/class-sessions/class-session.routes";
import assignmentRoutes from "../modules/assignments/assignment.routes";
import recordingRoutes from "../modules/recordings/recording.routes";
import whatsappRoutes from "../modules/whatsapp/whatsapp.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import feeRoutes from "../modules/fees/fee.routes";
import reportRoutes from "../modules/reports/report.routes";
import settingsRoutes from "../modules/settings/settings.routes";
import aiAgentRoutes from "../modules/ai-agent/ai-agent.routes";
import masterRoutes from "../modules/masters/master.routes";
import googleWorkspaceRoutes from "../modules/google-workspace/google-workspace.routes";
import integrationRoutes from "../modules/integrations/integration.routes";
import chatRoutes from "../modules/chat/chat.routes";
import feedbackRoutes from "../modules/feedback/feedback.routes";
import documentRoutes from "../modules/documents/document.routes";
import placementRoutes from "../modules/placement/placement.routes";
import emailRoutes from "../modules/email/email.routes";
import auditLogRoutes from "../modules/audit-logs/audit-log.routes";
import billingRoutes from "../modules/billing/billing.routes";
import securityRoutes from "../modules/security/security.routes";
import dataManagementRoutes from "../modules/data-management/data-management.routes";

const router = Router();

// Auth
router.use("/auth", authRoutes);

// Institutes
router.use("/institutes", instituteRoutes);

// Administration (tenant-scoped org settings, etc.)
router.use("/administration", administrationRoutes);

// Organization context (safe branding for all authenticated portal roles)
router.use("/organization", organizationRoutes);

// Users
router.use("/users", userRoutes);

// Invitations
router.use("/invitations", invitationRoutes);

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

// Assignments
router.use("/assignments", assignmentRoutes);

// Feedback
router.use("/feedback", feedbackRoutes);

// Documents
router.use("/documents", documentRoutes);

// Placement
router.use("/placement", placementRoutes);

// Email
router.use("/email", emailRoutes);

// Audit Logs
router.use("/audit-logs", auditLogRoutes);
router.use("/billing", billingRoutes);

// Data Management (import / export / recycle / backup status)
router.use("/data-management", dataManagementRoutes);

// Security (policy, sessions, 2FA, IP allowlist, alerts)
router.use("/security", securityRoutes);

// Recordings
router.use("/recordings", recordingRoutes);

// Notifications & WhatsApp
router.use("/notifications", notificationRoutes);
router.use("/whatsapp", whatsappRoutes);

// Fees Management
router.use("/fees", feeRoutes);

// Reports
router.use("/reports", reportRoutes);

// User & Account Settings
router.use("/settings", settingsRoutes);

// AI Institute Data Agent (Admin & Center Manager)
router.use("/ai", aiAgentRoutes);

// Master Data Management (All 25 Masters)
router.use("/masters", masterRoutes);

// Google Workspace & Google Meet Integration
router.use("/integrations/google", googleWorkspaceRoutes);

// Institute Integrations catalog (must be after /integrations/google)
router.use("/integrations", integrationRoutes);

// Internal Team Chat (Staff only)
router.use("/chat", chatRoutes);

// Target & Incentive Management System
import targetRoutes from "../modules/targets/target.routes";
router.use("/targets", targetRoutes);

// Examination Management System & Proctoring Engine
import examAttemptRoutes from "../modules/exam-attempts/attempt.routes";
import examRoutes from "../modules/exams/exam.routes";
import questionRoutes from "../modules/questions/question.routes";
import questionBankRoutes from "../modules/question-banks/question-bank.routes";
router.use("/exams", examAttemptRoutes);
router.use("/exams", examRoutes);
router.use("/questions", questionRoutes);
router.use("/question-banks", questionBankRoutes);

// Webhooks (no auth — must be publicly accessible)
router.get("/webhooks/whatsapp", whatsappWebhookVerify);
router.post("/webhooks/whatsapp", whatsappWebhookHandler);
router.post("/webhooks/sarvam/callback", sarvamWebhookHandler);

export default router;

import "dotenv/config";
import { prisma } from "../src/config/database";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123";

async function clearDatabaseExceptAdmin() {
  console.log("🧹 Starting database cleanup (removing all data except Admin login)...");

  // Step 1: Find or ensure the admin user ID
  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@aadya.in" },
    include: { userRoles: { include: { role: true } } },
  });

  const adminId = adminUser?.id;
  console.log(`ℹ️  Found existing Admin User ID: ${adminId || "None (will be re-created)"}`);

  // Step 2: Delete transactional & user data in safe dependency order
  console.log("🗑️  Cleaning all transactional and child tables...");

  // Exam & Questions
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "StudentExamAttemptAnswer", "StudentExamAttempt", "ExamQuestion", "QuestionOption", "Question", "ExamBatchAssignment", "Exam", "QuestionBank" CASCADE;`).catch(() => {});
  
  // Placements & Documents
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "PlacementRecord", "DocumentVerification", "Document" CASCADE;`).catch(() => {});

  // Targets & Incentives
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "IncentiveCalculation", "IncentiveRule", "IndividualTarget", "BranchTarget", "TargetPlan" CASCADE;`).catch(() => {});

  // Chat & Messaging
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Message", "ConversationMember", "Conversation" CASCADE;`).catch(() => {});

  // AI & Leads
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AIMessage", "AIConversation", "LeadFollowUp", "LeadActivity", "LeadStageHistory", "LeadAssignment", "Lead" CASCADE;`).catch(() => {});

  // Logs & Notifications
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "WhatsappLog", "CallLog", "ActivityLog", "Notification", "NotificationIdempotency", "AuditLog" CASCADE;`).catch(() => {});

  // Fees & Payments
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Payment", "PendingFee" CASCADE;`).catch(() => {});

  // Feedback, Recordings & Google Meet
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Feedback", "Recording", "GoogleMeetSpace", "GoogleWorkspaceConnection" CASCADE;`).catch(() => {});

  // Assignments
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AssignmentSubmission", "Assignment" CASCADE;`).catch(() => {});

  // Attendance & Class Sessions
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "StudentAttendance", "FacultyAttendance", "ClassSession" CASCADE;`).catch(() => {});

  // Batches & Modules
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "BatchEnrollment", "BatchModule", "BatchSchedule", "Batch" CASCADE;`).catch(() => {});

  // Admissions, Applications, Enquiries
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Admission", "Application", "Enquiry" CASCADE;`).catch(() => {});

  // Course Modules & Courses
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "CourseModule", "Course" CASCADE;`).catch(() => {});

  // Students & Faculty profiles
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Student", "Faculty" CASCADE;`).catch(() => {});

  // User Settings & Refresh Tokens
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "RefreshToken", "UserSettings" CASCADE;`).catch(() => {});

  // Master records if any custom
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "MasterRecord" CASCADE;`).catch(() => {});

  // Clean UserPermissions & UserRoles except admin
  if (adminId) {
    await prisma.$executeRawUnsafe(`DELETE FROM "UserPermission" WHERE "userId" != '${adminId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM "UserRole" WHERE "userId" != '${adminId}';`);
    await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "id" != '${adminId}';`);
  } else {
    await prisma.$executeRawUnsafe(`DELETE FROM "UserPermission";`);
    await prisma.$executeRawUnsafe(`DELETE FROM "UserRole";`);
    await prisma.$executeRawUnsafe(`DELETE FROM "User";`);
  }

  console.log("✨ All non-admin data cleared. Rebuilding core seed (Institute, Branches, Roles, Admin User)...");

  // Re-run base seed logic to ensure Admin, Roles, Institute, Branches, and Permissions are intact & 100% working
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // 1. Institute
  const institute = await prisma.institute.upsert({
    where: { code: "AADYA-HQ" },
    update: {
      name: "Aadya Institute of Technology & Management",
      email: "contact@aadya.com",
      phone: "+91 80 4123 4567",
      address: "Outer Ring Road, Bengaluru, Karnataka 560103",
    },
    create: {
      name: "Aadya Institute of Technology & Management",
      code: "AADYA-HQ",
      email: "contact@aadya.com",
      phone: "+91 80 4123 4567",
      address: "Outer Ring Road, Bengaluru, Karnataka 560103",
    },
  });

  // 2. Branches
  const branchKormangala = await prisma.branch.upsert({
    where: {
      instituteId_code: {
        instituteId: institute.id,
        code: "KOR",
      },
    },
    update: {},
    create: {
      instituteId: institute.id,
      name: "Koramangala Campus",
      code: "KOR",
      address: "80ft Road, 4th Block, Koramangala, Bengaluru 560034",
      phone: "+91 80 2553 1122",
    },
  });

  await prisma.branch.upsert({
    where: {
      instituteId_code: {
        instituteId: institute.id,
        code: "IND",
      },
    },
    update: {},
    create: {
      instituteId: institute.id,
      name: "Indiranagar Center",
      code: "IND",
      address: "100ft Road, Indiranagar, Bengaluru 560038",
      phone: "+91 80 4112 3344",
    },
  });

  await prisma.branch.upsert({
    where: {
      instituteId_code: {
        instituteId: institute.id,
        code: "HSR",
      },
    },
    update: {},
    create: {
      instituteId: institute.id,
      name: "HSR Layout Campus",
      code: "HSR",
      address: "Sector 7, HSR Layout, Bengaluru 560102",
      phone: "+91 80 6789 0011",
    },
  });

  // 3. Roles
  const roleNames = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"];
  const roles: Record<string, any> = {};

  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name.replace("_", " ")} role for Aadya platform`,
      },
    });
  }

  // 4. Permissions (All system permissions)
  const permissionsList = [
    // Dashboard & Reports
    { name: "dashboard.read", description: "View analytics dashboards" },
    { name: "report.read", description: "View and export reports" },

    // Branch & Institute
    { name: "branch.read", description: "View branches" },
    { name: "branch.create", description: "Create new branch" },
    { name: "branch.update", description: "Update branch" },
    { name: "institute.read", description: "View institute details" },
    { name: "institute.update", description: "Update institute configuration" },

    // Users
    { name: "user.read", description: "View users and staff" },
    { name: "user.create", description: "Create staff users" },
    { name: "user.update", description: "Update staff details & roles" },
    { name: "user.delete", description: "Deactivate or delete users" },

    // Students
    { name: "student.read", description: "View students" },
    { name: "student.create", description: "Admit and create students" },
    { name: "student.update", description: "Update student details" },
    { name: "student.delete", description: "Delete/archive student" },

    // Faculty
    { name: "faculty.read", description: "View faculty members" },
    { name: "faculty.create", description: "Create faculty profile" },
    { name: "faculty.update", description: "Update faculty profile" },

    // Courses & Modules
    { name: "course.read", description: "View courses" },
    { name: "course.create", description: "Create course" },
    { name: "course.update", description: "Update course curriculum" },
    { name: "module.read", description: "View course modules" },
    { name: "module.create", description: "Create module" },
    { name: "module.update", description: "Update module" },

    // Batches & Schedules
    { name: "batch.read", description: "View batches" },
    { name: "batch.create", description: "Create batch" },
    { name: "batch.update", description: "Update batch details" },
    { name: "schedule.read", description: "View schedules and classes" },
    { name: "schedule.create", description: "Create class schedules" },
    { name: "schedule.update", description: "Update schedule" },
    { name: "schedule.delete", description: "Delete class schedule" },

    // Attendance
    { name: "attendance.read", description: "View attendance" },
    { name: "attendance.mark", description: "Mark attendance" },
    { name: "attendance.update", description: "Update/correct attendance" },

    // Assignments
    { name: "assignment.read", description: "View assignments" },
    { name: "assignment.create", description: "Create assignment" },
    { name: "assignment.update", description: "Update assignment" },
    { name: "assignment.submit", description: "Submit assignment" },
    { name: "assignment.grade", description: "Grade assignment" },
    { name: "assignment.delete", description: "Delete assignment" },

    // Recordings & Feedback
    { name: "recording.read", description: "View class recordings" },
    { name: "recording.create", description: "Upload recording" },
    { name: "recording.delete", description: "Delete recording" },
    { name: "recording.manage", description: "Trigger recording synchronization and cleanup" },
    { name: "feedback.read", description: "View student feedback" },
    { name: "feedback.create", description: "Submit feedback" },

    // Google Workspace & Google Meet
    { name: "google_meet.connect", description: "Connect and manage Google Workspace account" },
    { name: "google_meet.create", description: "Create Google Meet space for class sessions" },
    { name: "google_meet.read", description: "View Google Meet details and join info" },
    { name: "google_meet.manage", description: "Manage and sync Google Meet spaces" },

    // Internal Team Chat
    { name: "chat.read", description: "View team and direct chat messages" },
    { name: "chat.send", description: "Send chat messages in team and direct conversations" },
    { name: "chat.manage", description: "Manage team chat conversations" },

    // Admissions & Fees
    { name: "admission.read", description: "View admissions" },
    { name: "admission.create", description: "Create admission" },
    { name: "admission.update", description: "Update admission" },
    { name: "fee.read", description: "View fee records" },
    { name: "fee.create", description: "Record fee payment" },
    { name: "fee.update", description: "Update fee structures" },
    { name: "fee.delete", description: "Cancel or refund payment" },

    // Leads & AI Calling
    { name: "lead.read", description: "View leads and enquiries" },
    { name: "lead.create", description: "Create lead" },
    { name: "lead.update", description: "Update lead and stage" },
    { name: "lead.assign", description: "Assign lead to counsellor" },
    { name: "lead.convert", description: "Convert lead to admission" },
    { name: "lead.delete", description: "Delete lead" },
    { name: "ai_call.read", description: "View AI call transcripts & logs" },
    { name: "ai_call.create", description: "Trigger AI voice qualification call" },

    // Masters & Notifications
    { name: "master.read", description: "View master configuration data" },
    { name: "master.create", description: "Create master record" },
    { name: "master.update", description: "Update master record" },
    { name: "master.delete", description: "Delete master record" },
    { name: "notification.read", description: "View notifications" },
    { name: "notification.resend", description: "Resend WhatsApp notification" },
    { name: "notification.manage", description: "Manage notification templates & rules" },

    // Targets & Incentives
    { name: "target.read", description: "View target plans, individual targets, and performance" },
    { name: "target.manage", description: "Create, publish, activate, lock, and manage target plans and targets" },
    { name: "target.assign", description: "Assign individual and branch targets" },
    { name: "target.approve", description: "Approve and finalize target plans" },
    { name: "incentive.read", description: "View calculated and approved incentives" },
    { name: "incentive.manage", description: "Manage incentive configurations and rules" },
    { name: "incentive.approve", description: "Approve or reject calculated employee incentives" },

    // Examination Management
    { name: "exam.read", description: "View examinations" },
    { name: "exam.create", description: "Create examination" },
    { name: "exam.update", description: "Update examination details" },
    { name: "exam.delete", description: "Delete examination" },
    { name: "exam.publish", description: "Publish examination" },
    { name: "exam.schedule", description: "Schedule examination" },
    { name: "exam.manage_questions", description: "Add, remove and reorder questions in an exam" },
    { name: "exam.manage_question_bank", description: "Manage question banks" },
    { name: "exam.assign", description: "Assign exam to batches" },
    { name: "exam.view_attempts", description: "View student exam attempts" },
    { name: "exam.manage_settings", description: "Manage exam settings and proctoring configuration" },
    { name: "question.read", description: "View questions" },
    { name: "question.create", description: "Create question" },
    { name: "question.update", description: "Update question" },
    { name: "question.delete", description: "Delete question" },
    { name: "question_bank.read", description: "View question banks" },
    { name: "question_bank.create", description: "Create question bank" },
    { name: "question_bank.update", description: "Update question bank" },
    { name: "question_bank.delete", description: "Delete question bank" },
    { name: "exam.take", description: "Take authorized online examination" },

    // Documents
    { name: "document.read", description: "View documents" },
    { name: "document.create", description: "Upload document metadata" },
    { name: "document.update", description: "Update document metadata" },
    { name: "document.delete", description: "Delete document" },
    { name: "document.verify", description: "Verify or reject documents" },

    // Placement
    { name: "placement.read", description: "View placement data" },
    { name: "placement.create", description: "Create placement records" },
    { name: "placement.update", description: "Update placement records" },
    { name: "placement.delete", description: "Delete placement records" },

    // Email
    { name: "email.read", description: "View email templates and logs" },
    { name: "email.manage", description: "Manage email templates and send test emails" },

    // Audit
    { name: "audit.read", description: "View audit logs" },
  ];

  const permissions: Record<string, any> = {};
  for (const perm of permissionsList) {
    permissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: { name: perm.name, description: perm.description },
    });
  }

  // Link role permissions for ADMIN
  for (const perm of Object.values(permissions)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["ADMIN"].id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: roles["ADMIN"].id,
        permissionId: perm.id,
      },
    });
  }

  // 5. Admin User
  let finalAdmin = await prisma.user.findFirst({
    where: { email: "admin@aadya.in" },
  });

  if (!finalAdmin) {
    finalAdmin = await prisma.user.create({
      data: {
        instituteId: institute.id,
        branchId: branchKormangala.id,
        name: "Aadya System Admin",
        email: "admin@aadya.in",
        phone: "+91 99999 99999",
        passwordHash: hashedPassword,
        status: "ACTIVE",
        whatsappEnabled: true,
      },
    });
  } else {
    finalAdmin = await prisma.user.update({
      where: { id: finalAdmin.id },
      data: {
        instituteId: institute.id,
        branchId: branchKormangala.id,
        name: "Aadya System Admin",
        passwordHash: hashedPassword,
        status: "ACTIVE",
      },
    });
  }

  // Ensure Admin role assigned
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: finalAdmin.id,
        roleId: roles["ADMIN"].id,
      },
    },
    update: {},
    create: {
      userId: finalAdmin.id,
      roleId: roles["ADMIN"].id,
    },
  });

  // Grant all permissions directly to Admin user
  for (const perm of Object.values(permissions)) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: finalAdmin.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        userId: finalAdmin.id,
        permissionId: perm.id,
        grantedById: finalAdmin.id,
      },
    });
  }

  // Summary counts
  const userCount = await prisma.user.count();
  const studentCount = await prisma.student.count();
  const facultyCount = await prisma.faculty.count();
  const courseCount = await prisma.course.count();
  const batchCount = await prisma.batch.count();
  const leadCount = await prisma.lead.count();

  console.log("\n===================================================================");
  console.log("✅ DATABASE CLEANUP COMPLETED SUCCESSFULLY!");
  console.log("===================================================================");
  console.log(`📊 Current Database Counts:`);
  console.log(`   • Users:         ${userCount} (Admin only)`);
  console.log(`   • Students:      ${studentCount}`);
  console.log(`   • Faculty:       ${facultyCount}`);
  console.log(`   • Courses:       ${courseCount}`);
  console.log(`   • Batches:       ${batchCount}`);
  console.log(`   • Leads:         ${leadCount}`);
  console.log("-------------------------------------------------------------------");
  console.log("🔑 Preserved Admin Login Credentials:");
  console.log("   • Email:         admin@aadya.in");
  console.log("   • Password:      " + DEFAULT_PASSWORD);
  console.log("   • Role:          ADMIN (Full permissions)");
  console.log("===================================================================\n");
}

clearDatabaseExceptAdmin()
  .catch((e) => {
    console.error("❌ Cleanup failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

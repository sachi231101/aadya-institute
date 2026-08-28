import "dotenv/config";
import { prisma } from "../src/config/database";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123";

async function main() {
  console.log("🌱 Starting Aadya Institute Database Seeding (Admin & Base System Setup)...");
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. INSTITUTE
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🏛️  Seeding Institute...");
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

  // ───────────────────────────────────────────────────────────────────────────
  // 2. BRANCHES
  // ───────────────────────────────────────────────────────────────────────────
  console.log("📍 Seeding Branches...");
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

  const branchIndiranagar = await prisma.branch.upsert({
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

  const branchHSR = await prisma.branch.upsert({
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

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ROLES & PERMISSIONS
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🛡️  Seeding Roles & Permissions...");
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

    // Internal Team Chat (Staff only)
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

  // CENTER_MANAGER role-level defaults
  const cmPermNames = [
    "dashboard.read",
    "branch.read",
    "student.read",
    "student.create",
    "student.update",
    "faculty.read",
    "course.read",
    "module.read",
    "batch.read",
    "batch.create",
    "batch.update",
    "schedule.read",
    "schedule.create",
    "schedule.update",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "assignment.read",
    "recording.read",
    "recording.manage",
    "google_meet.connect",
    "google_meet.create",
    "google_meet.read",
    "google_meet.manage",
    "chat.read",
    "chat.send",
    "chat.manage",
    "feedback.read",
    "admission.read",
    "admission.create",
    "admission.update",
    "fee.read",
    "fee.create",
    "fee.update",
    "lead.read",
    "lead.create",
    "lead.update",
    "lead.assign",
    "lead.convert",
    "ai_call.read",
    "ai_call.create",
    "master.read",
    "master.create",
    "master.update",
    "report.read",
    "notification.read",
    "notification.resend",
    "target.read",
    "target.manage",
    "target.assign",
    "incentive.read",
    "incentive.approve",
    "exam.read",
    "exam.create",
    "exam.update",
    "exam.publish",
    "exam.schedule",
    "exam.manage_questions",
    "exam.manage_question_bank",
    "exam.assign",
    "exam.view_attempts",
    "exam.manage_settings",
    "question.read",
    "question.create",
    "question.update",
    "question.delete",
    "question_bank.read",
    "question_bank.create",
    "question_bank.update",
    "question_bank.delete",
  ];
  for (const name of cmPermNames) {
    if (permissions[name]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles["CENTER_MANAGER"].id,
            permissionId: permissions[name].id,
          },
        },
        update: {},
        create: {
          roleId: roles["CENTER_MANAGER"].id,
          permissionId: permissions[name].id,
        },
      });
    }
  }

  // COUNSELLOR permissions
  const counsellorPermNames = [
    "dashboard.read",
    "branch.read",
    "course.read",
    "lead.read",
    "lead.create",
    "lead.update",
    "lead.convert",
    "ai_call.read",
    "ai_call.create",
    "admission.read",
    "admission.create",
    "master.read",
    "chat.read",
    "chat.send",
    "notification.read",
    "target.read",
    "incentive.read",
    "exam.read",
    "question.read",
    "question_bank.read",
  ];
  for (const name of counsellorPermNames) {
    if (permissions[name]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles["COUNSELLOR"].id,
            permissionId: permissions[name].id,
          },
        },
        update: {},
        create: {
          roleId: roles["COUNSELLOR"].id,
          permissionId: permissions[name].id,
        },
      });
    }
  }

  // FACULTY permissions
  const facultyPermNames = [
    "dashboard.read",
    "branch.read",
    "course.read",
    "module.read",
    "batch.read",
    "schedule.read",
    "attendance.read",
    "attendance.mark",
    "assignment.read",
    "assignment.create",
    "assignment.update",
    "assignment.grade",
    "recording.read",
    "recording.create",
    "recording.manage",
    "google_meet.connect",
    "google_meet.create",
    "google_meet.read",
    "google_meet.manage",
    "chat.read",
    "chat.send",
    "feedback.read",
    "notification.read",
    "report.read",
    "exam.read",
    "question.read",
    "question_bank.read",
  ];
  for (const name of facultyPermNames) {
    if (permissions[name]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles["FACULTY"].id,
            permissionId: permissions[name].id,
          },
        },
        update: {},
        create: {
          roleId: roles["FACULTY"].id,
          permissionId: permissions[name].id,
        },
      });
    }
  }

  // STUDENT permissions
  const studentPermNames = [
    "dashboard.read",
    "course.read",
    "module.read",
    "batch.read",
    "schedule.read",
    "attendance.read",
    "assignment.read",
    "assignment.submit",
    "recording.read",
    "google_meet.read",
    "feedback.create",
    "notification.read",
    "exam.read",
    "exam.take",
  ];
  for (const name of studentPermNames) {
    if (permissions[name]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles["STUDENT"].id,
            permissionId: permissions[name].id,
          },
        },
        update: {},
        create: {
          roleId: roles["STUDENT"].id,
          permissionId: permissions[name].id,
        },
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ADMIN USER ONLY
  // ───────────────────────────────────────────────────────────────────────────
  console.log("👤 Seeding Admin User & Granting User Permissions...");

  let adminUser = await prisma.user.findFirst({
    where: { email: "admin@aadya.in" },
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
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
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        instituteId: institute.id,
        branchId: branchKormangala.id,
        name: "Aadya System Admin",
        passwordHash: hashedPassword,
        status: "ACTIVE",
      },
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: roles["ADMIN"].id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: roles["ADMIN"].id,
    },
  });

  // Grant all permissions directly to Admin user in UserPermission
  for (const perm of Object.values(permissions)) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: adminUser.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        permissionId: perm.id,
        grantedById: adminUser.id,
      },
    });
  }

  console.log("\n===================================================================");
  console.log("✅ AADYA INSTITUTE BASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("===================================================================");
  console.log("🔑 Admin Account Ready:");
  console.log("   • Admin Email:    admin@aadya.in");
  console.log("   • Password:       " + DEFAULT_PASSWORD);
  console.log("   • Roles:          ADMIN (All 112 Permissions)");
  console.log("===================================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

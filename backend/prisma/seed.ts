import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const roles = [
  { name: "ADMIN", description: "Full institute administration access" },
  { name: "CENTER_MANAGER", description: "Branch-level management access" },
  { name: "COUNSELLOR", description: "Student and lead management access" },
  { name: "FACULTY", description: "Faculty and classroom access" },
  { name: "STUDENT", description: "Student portal access" },
];

const permissions = [
  // User management
  "user.read",
  "user.create",
  "user.update",
  "user.delete",

  // Students
  "student.read",
  "student.create",
  "student.update",
  "student.delete",

  // Faculty
  "faculty.read",
  "faculty.create",
  "faculty.update",
  "faculty.delete",

  // Courses
  "course.read",
  "course.create",
  "course.update",
  "course.delete",

  // Modules
  "module.read",
  "module.create",
  "module.update",
  "module.delete",

  // Admissions
  "admission.read",
  "admission.create",
  "admission.update",

  // Batches
  "batch.read",
  "batch.create",
  "batch.update",
  "batch.delete",

  // Scheduling
  "schedule.read",
  "schedule.create",
  "schedule.update",
  "schedule.delete",

  // Attendance
  "attendance.read",
  "attendance.mark",
  "attendance.update",

  // Assignments
  "assignment.read",
  "assignment.create",
  "assignment.update",
  "assignment.delete",
  "assignment.evaluate",
  "assignment.submit",

  // Recordings
  "recording.read",
  "recording.create",
  "recording.delete",

  // Feedback
  "feedback.read",
  "feedback.submit",

  // Dashboard
  "dashboard.read",

  // AI Calling
  "ai_call.read",
  "ai_call.create",
  "ai_call.update",

  // WhatsApp
  "whatsapp.read",
  "whatsapp.send",

  // Notifications
  "notification.read",
  "notification.manage",
  "notification.resend",

  // Branches
  "branch.read",
  "branch.create",
  "branch.update",
  "branch.delete",

  // Reports
  "report.read",

  // Fees
  "fee.read",
  "fee.create",
  "fee.update",
  "fee.delete",
];

/** Permissions granted to each role */
const rolePermissions: Record<string, string[]> = {
  // ADMIN gets everything
  ADMIN: permissions,

  CENTER_MANAGER: [
    "user.read",
    "user.create",
    "user.update",
    "user.delete",
    "branch.read",
    "branch.update",
    "student.read",
    "student.create",
    "student.update",
    "faculty.read",
    "course.read",
    "module.read",
    "admission.read",
    "admission.create",
    "admission.update",
    "batch.read",
    "batch.create",
    "batch.update",
    "schedule.read",
    "schedule.create",
    "schedule.update",
    "schedule.delete",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "assignment.read",
    "recording.read",
    "feedback.read",
    "fee.read",
    "fee.create",
    "fee.update",
    "fee.delete",
    "dashboard.read",
    "report.read",
    "notification.read",
    "notification.resend",
  ],

  COUNSELLOR: [
    "user.read",
    "student.read",
    "student.create",
    "student.update",
    "faculty.read",
    "faculty.create",
    "faculty.update",
    "course.read",
    "module.read",
    "admission.read",
    "admission.create",
    "admission.update",
    "batch.read",
    "schedule.read",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "fee.read",
    "fee.create",
    "fee.update",
    "report.read",
    "ai_call.read",
    "ai_call.create",
    "ai_call.update",
    "whatsapp.read",
    "dashboard.read",
    "notification.read",
  ],

  FACULTY: [
    "student.read",
    "faculty.read",
    "course.read",
    "module.read",
    "batch.read",
    "schedule.read",
    "attendance.read",
    "attendance.mark",
    "assignment.read",
    "assignment.create",
    "assignment.update",
    "assignment.delete",
    "assignment.evaluate",
    "recording.read",
    "recording.create",
    "recording.delete",
    "feedback.read",
    "dashboard.read",
  ],

  STUDENT: [
    "course.read",
    "module.read",
    "batch.read",
    "schedule.read",
    "attendance.read",
    "assignment.read",
    "assignment.submit",
    "recording.read",
    "feedback.submit",
    "dashboard.read",
  ],
};

const defaultNotificationRules = [
  { event: "CLASS_REMINDER", channel: "WHATSAPP", enabled: true, configuration: { offsetMinutes: -120 } },
  { event: "FIRST_CLASS", channel: "WHATSAPP", enabled: true, configuration: { offsetMinutes: -1440 } },
  { event: "MODULE_START", channel: "WHATSAPP", enabled: true },
  { event: "STUDENT_ABSENT", channel: "WHATSAPP", enabled: true },
  { event: "FEEDBACK_REQUESTED", channel: "WHATSAPP", enabled: true },
  { event: "ASSIGNMENT_CREATED", channel: "WHATSAPP", enabled: true },
  { event: "ADMISSION_CREATED", channel: "WHATSAPP", enabled: true },
  { event: "BATCH_ASSIGNED", channel: "WHATSAPP", enabled: true },
  { event: "RECORDING_AVAILABLE", channel: "WHATSAPP", enabled: true },
];

const defaultNotificationTemplates = [
  {
    name: "class_reminder_template",
    event: "CLASS_REMINDER",
    providerTemplateName: "aadya_class_reminder",
    language: "en",
    variables: ["student_name", "batch_name", "start_time"],
  },
  {
    name: "student_absent_template",
    event: "STUDENT_ABSENT",
    providerTemplateName: "aadya_student_absent",
    language: "en",
    variables: ["student_name", "batch_name", "date"],
  },
  {
    name: "feedback_requested_template",
    event: "FEEDBACK_REQUESTED",
    providerTemplateName: "aadya_feedback_request",
    language: "en",
    variables: ["student_name", "batch_name", "session_id"],
  },
  {
    name: "admission_created_template",
    event: "ADMISSION_CREATED",
    providerTemplateName: "aadya_admission_created",
    language: "en",
    variables: ["student_name", "course_name", "admission_no"],
  },
  {
    name: "batch_assigned_template",
    event: "BATCH_ASSIGNED",
    providerTemplateName: "aadya_batch_assigned",
    language: "en",
    variables: ["student_name", "batch_name", "course_name"],
  },
  {
    name: "first_class_template",
    event: "FIRST_CLASS",
    providerTemplateName: "aadya_first_class",
    language: "en",
    variables: ["student_name", "batch_name", "start_date", "start_time", "location"],
  },
  {
    name: "module_start_template",
    event: "MODULE_START",
    providerTemplateName: "aadya_module_start",
    language: "en",
    variables: ["student_name", "batch_name", "module_name", "start_date"],
  },
  {
    name: "assignment_created_template",
    event: "ASSIGNMENT_CREATED",
    providerTemplateName: "aadya_assignment_created",
    language: "en",
    variables: ["student_name", "batch_name", "assignment_title", "due_date"],
  },
  {
    name: "recording_available_template",
    event: "RECORDING_AVAILABLE",
    providerTemplateName: "aadya_recording_available",
    language: "en",
    variables: ["student_name", "batch_name", "session_title", "expiry_date"],
  },
];

async function main() {
  console.log("🌱 Starting database seed...");

  // ── Institute ──────────────────────────────────────────────────────────────

  const institute = await prisma.institute.upsert({
    where: { code: "AADYA" },
    update: {},
    create: {
      name: "Aadya Institute",
      code: "AADYA",
      email: "admin@aadya.in",
      phone: "9999999999",
      address: "Bengaluru",
    },
  });
  console.log("✅ Institute:", institute.name);

  // ── Branch ─────────────────────────────────────────────────────────────────

  const branch = await prisma.branch.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "MAIN" } },
    update: { name: "Aadya Central Branch" },
    create: {
      instituteId: institute.id,
      name: "Aadya Central Branch",
      code: "MAIN",
      address: "Bengaluru",
    },
  });
  console.log("✅ Branch:", branch.name);

  // ── Roles ──────────────────────────────────────────────────────────────────

  const roleMap: Record<string, string> = {};
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
    roleMap[role.name] = role.id;
  }
  console.log("✅ Roles seeded:", Object.keys(roleMap).join(", "));

  // ── Permissions ────────────────────────────────────────────────────────────

  const permissionMap: Record<string, string> = {};
  for (const permissionName of permissions) {
    const permission = await prisma.permission.upsert({
      where: { name: permissionName },
      update: {},
      create: { name: permissionName },
    });
    permissionMap[permission.name] = permission.id;
  }
  console.log("✅ Permissions seeded:", permissions.length, "permissions");

  // ── Role → Permission assignments ──────────────────────────────────────────

  for (const [roleName, permList] of Object.entries(rolePermissions)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;

    for (const permName of permList) {
      const permissionId = permissionMap[permName];
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
    console.log(`✅ ${roleName} assigned ${permList.length} permissions`);
  }

  // ── Notification Rules ─────────────────────────────────────────────────────

  for (const rule of defaultNotificationRules) {
    await prisma.notificationRule.upsert({
      where: { event_channel: { event: rule.event, channel: rule.channel } },
      update: { enabled: rule.enabled, configuration: rule.configuration },
      create: rule,
    });
  }
  console.log("✅ Notification Rules seeded:", defaultNotificationRules.length);

  // ── Notification Templates ─────────────────────────────────────────────────

  for (const tpl of defaultNotificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { name: tpl.name },
      update: {
        event: tpl.event,
        providerTemplateName: tpl.providerTemplateName,
        language: tpl.language,
        variables: tpl.variables,
      },
      create: tpl,
    });
  }
  console.log("✅ Notification Templates seeded:", defaultNotificationTemplates.length);

  // ── Admin User ─────────────────────────────────────────────────────────────

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe@123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.updateMany({
    where: { email: "admin@aadya.in" },
    data: {
      passwordHash,
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { id: "aadya-initial-admin" },
    update: {
      email: "admin@aadya.in",
      passwordHash,
      name: "Aadya Admin",
      status: "ACTIVE",
    },
    create: {
      id: "aadya-initial-admin",
      instituteId: institute.id,
      branchId: branch.id,
      name: "Aadya Admin",
      email: "admin@aadya.in",
      phone: "9999999999",
      passwordHash,
    },
  });
  console.log("✅ Admin user:", admin.email);

  // ── Assign Admin Role ──────────────────────────────────────────────────────

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roleMap["ADMIN"] } },
    update: {},
    create: { userId: admin.id, roleId: roleMap["ADMIN"] },
  });
  console.log("✅ Admin role assigned");

  // ── Courses ─────────────────────────────────────────────────────────────
  const course1 = await prisma.course.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "WEB-DEV" } },
    update: {},
    create: {
      instituteId: institute.id,
      name: "Full Stack Web Development",
      code: "WEB-DEV",
      description: "Complete web development course covering frontend, backend and deployment",
      duration: 6,
    },
  });

  const course2 = await prisma.course.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "DATA-SCI" } },
    update: {},
    create: {
      instituteId: institute.id,
      name: "Data Science & Analytics",
      code: "DATA-SCI",
      description: "Data science fundamentals with Python and ML",
      duration: 4,
    },
  });
  console.log("✅ Courses seeded:", course1.name, ",", course2.name);

  // ── Course Modules ──────────────────────────────────────────────────────
  const mod1 = await prisma.courseModule.upsert({
    where: { courseId_sequence: { courseId: course1.id, sequence: 1 } },
    update: {},
    create: { courseId: course1.id, name: "HTML & CSS Fundamentals", sequence: 1, duration: 2 },
  });
  const mod2 = await prisma.courseModule.upsert({
    where: { courseId_sequence: { courseId: course1.id, sequence: 2 } },
    update: {},
    create: { courseId: course1.id, name: "JavaScript & TypeScript", sequence: 2, duration: 3 },
  });
  const mod3 = await prisma.courseModule.upsert({
    where: { courseId_sequence: { courseId: course1.id, sequence: 3 } },
    update: {},
    create: { courseId: course1.id, name: "React & Node.js", sequence: 3, duration: 4 },
  });
  console.log("✅ Course modules seeded");

  // ── Center Manager User ──────────────────────────────────────────────────
  const managerHash = await bcrypt.hash("Manager@123", 12);
  const managerUser = await prisma.user.upsert({
    where: { id: "seed-manager-user" },
    update: { email: "manager@aadya.in", passwordHash: managerHash, status: "ACTIVE" },
    create: {
      id: "seed-manager-user",
      instituteId: institute.id,
      branchId: branch.id,
      name: "Suresh Sharma",
      email: "manager@aadya.in",
      phone: "9876543210",
      passwordHash: managerHash,
    },
  });
  if (roleMap["CENTER_MANAGER"]) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: managerUser.id, roleId: roleMap["CENTER_MANAGER"] } },
      update: {},
      create: { userId: managerUser.id, roleId: roleMap["CENTER_MANAGER"] },
    });
  }
  console.log("✅ Center Manager seeded:", managerUser.email);

  // ── Counsellor User ──────────────────────────────────────────────────────
  const counsellorHash = await bcrypt.hash("Counsellor@123", 12);
  const counsellorUser = await prisma.user.upsert({
    where: { id: "seed-counsellor-user" },
    update: { email: "counsellor@aadya.in", passwordHash: counsellorHash, status: "ACTIVE" },
    create: {
      id: "seed-counsellor-user",
      instituteId: institute.id,
      branchId: branch.id,
      name: "Priya Singh",
      email: "counsellor@aadya.in",
      phone: "9876543211",
      passwordHash: counsellorHash,
    },
  });
  if (roleMap["COUNSELLOR"]) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: counsellorUser.id, roleId: roleMap["COUNSELLOR"] } },
      update: {},
      create: { userId: counsellorUser.id, roleId: roleMap["COUNSELLOR"] },
    });
  }
  console.log("✅ Counsellor seeded:", counsellorUser.email);

  // ── Faculty User ────────────────────────────────────────────────────────
  const facultyHash = await bcrypt.hash("Faculty@123", 12);
  const facultyUser = await prisma.user.upsert({
    where: { id: "seed-faculty-user" },
    update: { passwordHash: facultyHash },
    create: {
      id: "seed-faculty-user",
      instituteId: institute.id,
      branchId: branch.id,
      name: "Ramesh Kumar",
      email: "ramesh@aadya.in",
      phone: "9888888888",
      passwordHash: facultyHash,
    },
  });

  const faculty = await prisma.faculty.upsert({
    where: { userId: facultyUser.id },
    update: {},
    create: {
      userId: facultyUser.id,
      instituteId: institute.id,
      branchId: branch.id,
      employeeCode: "FAC-001",
      specialization: "Full Stack Development",
    },
  });

  if (roleMap["FACULTY"]) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: facultyUser.id, roleId: roleMap["FACULTY"] } },
      update: {},
      create: { userId: facultyUser.id, roleId: roleMap["FACULTY"] },
    });
  }
  console.log("✅ Faculty seeded:", facultyUser.name);

  // ── Student User ────────────────────────────────────────────────────────
  const studentHash = await bcrypt.hash("Student@123", 12);
  const studentUser = await prisma.user.upsert({
    where: { id: "seed-student-user" },
    update: { email: "student@aadya.in", passwordHash: studentHash, status: "ACTIVE" },
    create: {
      id: "seed-student-user",
      instituteId: institute.id,
      branchId: branch.id,
      name: "Rahul Verma",
      email: "student@aadya.in",
      phone: "9777777777",
      passwordHash: studentHash,
    },
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      instituteId: institute.id,
      branchId: branch.id,
      studentCode: "STU-001",
      qualification: "B.Tech Computer Science",
    },
  });

  if (roleMap["STUDENT"]) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: studentUser.id, roleId: roleMap["STUDENT"] } },
      update: {},
      create: { userId: studentUser.id, roleId: roleMap["STUDENT"] },
    });
  }
  console.log("✅ Student seeded:", studentUser.email);
  // ── Counsellor User ───────────────────────────────────────────────────────
  const counselorPassword = process.env.SEED_COUNSELOR_PASSWORD ?? "Counselor@123";
  const counselorHash = await bcrypt.hash(counselorPassword, 12);

  await prisma.user.updateMany({
    where: { email: "counselor@aadya.in" },
    data: {
      passwordHash: counselorHash,
      status: "ACTIVE",
    },
  });

  const counselorUser = await prisma.user.upsert({
    where: { id: "seed-counselor-user" },
    update: {
      email: "counselor@aadya.in",
      passwordHash: counselorHash,
      name: "Kavita Nair",
      status: "ACTIVE",
    },
    create: {
      id: "seed-counselor-user",
      instituteId: institute.id,
      branchId: branch.id,
      name: "Kavita Nair",
      email: "counselor@aadya.in",
      phone: "9777777777",
      passwordHash: counselorHash,
    },
  });

  if (roleMap["COUNSELLOR"]) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: counselorUser.id, roleId: roleMap["COUNSELLOR"] } },
      update: {},
      create: { userId: counselorUser.id, roleId: roleMap["COUNSELLOR"] },
    });
  }
  console.log("✅ Counsellor seeded:", counselorUser.email);

  // ── Batch ───────────────────────────────────────────────────────────────
  const batch1 = await prisma.batch.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "WD-2026-A" } },
    update: {},
    create: {
      instituteId: institute.id,
      branchId: branch.id,
      courseId: course1.id,
      facultyId: faculty.id,
      name: "Web Dev Batch A (2026)",
      code: "WD-2026-A",
      startDate: new Date("2026-07-01"),
      expectedEndDate: new Date("2026-12-31"),
      status: "ACTIVE",
    },
  });
  console.log("✅ Batch seeded:", batch1.name);

  // ── Batch Modules ───────────────────────────────────────────────────────
  await prisma.batchModule.upsert({
    where: { batchId_sequence: { batchId: batch1.id, sequence: 1 } },
    update: {},
    create: { batchId: batch1.id, courseModuleId: mod1.id, sequence: 1, startDate: new Date("2026-07-01"), status: "INACTIVE" },
  });
  await prisma.batchModule.upsert({
    where: { batchId_sequence: { batchId: batch1.id, sequence: 2 } },
    update: {},
    create: { batchId: batch1.id, courseModuleId: mod2.id, sequence: 2, startDate: new Date("2026-08-01"), status: "ACTIVE" },
  });
  await prisma.batchModule.upsert({
    where: { batchId_sequence: { batchId: batch1.id, sequence: 3 } },
    update: {},
    create: { batchId: batch1.id, courseModuleId: mod3.id, sequence: 3, startDate: new Date("2026-10-01") },
  });
  console.log("✅ Batch modules seeded");




  console.log("\n🎉 Database seed completed!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

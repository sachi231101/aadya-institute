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
  "assignment.evaluate",
  "assignment.submit",

  // Recordings
  "recording.read",

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

  // Branches
  "branch.read",
  "branch.create",
  "branch.update",
  "branch.delete",

  // Reports
  "report.read",
];

/** Permissions granted to each role */
const rolePermissions: Record<string, string[]> = {
  // ADMIN gets everything
  ADMIN: permissions,

  CENTER_MANAGER: [
    "user.read",
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
    "dashboard.read",
    "report.read",
  ],


  COUNSELLOR: [
    "student.read",
    "admission.read",
    "admission.create",
    "course.read",
    "module.read",
    "batch.read",
    "schedule.read",
    "ai_call.read",
    "ai_call.create",
    "ai_call.update",
    "whatsapp.read",
    "dashboard.read",
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
    "assignment.evaluate",
    "recording.read",
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
    update: {},
    create: {
      instituteId: institute.id,
      name: "Main Branch",
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
    console.log(
      `✅ ${roleName} assigned ${permList.length} permissions`
    );
  }

  // ── Admin User ─────────────────────────────────────────────────────────────

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe@123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { id: "aadya-initial-admin" },
    update: {},
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

  console.log("\n🎉 Database seed completed!");
  console.log("   Admin email: admin@aadya.in");
  console.log("   Admin phone: 9999999999");
  console.log(`   Admin password: ${adminPassword === "ChangeMe@123" ? "ChangeMe@123 (default — set SEED_ADMIN_PASSWORD in .env)" : "*** (from env)"}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

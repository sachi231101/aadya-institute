import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const roles = [
  {
    name: "ADMIN",
    description: "Full institute administration access",
  },
  {
    name: "CENTER_MANAGER",
    description: "Branch-level management access",
  },
  {
    name: "COUNSELLOR",
    description: "Student and lead management access",
  },
  {
    name: "FACULTY",
    description: "Faculty and classroom access",
  },
  {
    name: "STUDENT",
    description: "Student portal access",
  },
];

const permissions = [
  "student.read",
  "student.create",
  "student.update",
  "student.delete",

  "faculty.read",
  "faculty.create",
  "faculty.update",

  "course.read",
  "course.create",
  "course.update",
  "course.delete",

  "module.read",
  "module.create",
  "module.update",
  "module.delete",

  "admission.read",
  "admission.create",
  "admission.update",

  "batch.read",
  "batch.create",
  "batch.update",
  "batch.delete",

  "schedule.read",
  "schedule.create",
  "schedule.update",
  "schedule.delete",

  "attendance.read",
  "attendance.mark",
  "attendance.update",

  "assignment.read",
  "assignment.create",
  "assignment.update",
  "assignment.evaluate",

  "recording.read",

  "feedback.read",
  "feedback.submit",

  "dashboard.read",

  "ai_call.read",
  "ai_call.create",
  "ai_call.update",

  "whatsapp.read",
  "whatsapp.send",

  "report.read",
];

async function main() {
  console.log("🌱 Starting database seed...");

  // -------------------------
  // Institute
  // -------------------------
  const institute = await prisma.institute.upsert({
    where: {
      code: "AADYA",
    },
    update: {},
    create: {
      name: "Aadya Institute",
      code: "AADYA",
      email: "admin@aadya.in",
      phone: "9999999999",
      address: "Bengaluru",
    },
  });

  console.log("✅ Institute created:", institute.name);

  // -------------------------
  // Branch
  // -------------------------
  const branch = await prisma.branch.upsert({
    where: {
      instituteId_code: {
        instituteId: institute.id,
        code: "MAIN",
      },
    },
    update: {},
    create: {
      instituteId: institute.id,
      name: "Main Branch",
      code: "MAIN",
      address: "Bengaluru",
    },
  });

  console.log("✅ Branch created:", branch.name);

  // -------------------------
  // Roles
  // -------------------------
  const roleMap: Record<string, string> = {};

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: {
        name: roleData.name,
      },
      update: {
        description: roleData.description,
      },
      create: roleData,
    });

    roleMap[role.name] = role.id;
  }

  console.log("✅ Roles created");

  // -------------------------
  // Permissions
  // -------------------------
  const permissionMap: Record<string, string> = {};

  for (const permissionName of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        name: permissionName,
      },
      update: {},
      create: {
        name: permissionName,
      },
    });

    permissionMap[permission.name] = permission.id;
  }

  console.log("✅ Permissions created");

  // -------------------------
  // ADMIN permissions
  // -------------------------
  const adminRoleId = roleMap["ADMIN"];

  for (const permissionId of Object.values(permissionMap)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRoleId,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId: adminRoleId,
        permissionId,
      },
    });
  }

  console.log("✅ Admin permissions assigned");

  // -------------------------
  // Admin password & user
  // -------------------------
  const passwordHash = await bcrypt.hash("ChangeMe@123", 12);

  const admin = await prisma.user.upsert({
    where: {
      id: "aadya-initial-admin",
    },
    update: {
      passwordHash,
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

  console.log("✅ Admin user created");

  // -------------------------
  // Assign Admin Role
  // -------------------------
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRoleId,
    },
  });

  console.log("✅ Admin role assigned");

  console.log("🎉 Database seed completed!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "../config/database";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

async function main() {
  console.log("🔧 Restoring Admin and Center Manager accounts for Aadya Institute...");

  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123";
  const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
  const managerHashedPassword = await bcrypt.hash("Manager@123", SALT_ROUNDS);

  // 1. Find the canonical Aadya Institute
  const institute = await prisma.institute.findFirst({
    where: { code: "AADYA-HQ" },
  });

  if (!institute) {
    throw new Error("Institute AADYA-HQ not found!");
  }

  // 2. Reactivate primary branches
  for (const code of ["KOR", "IND", "HSR"]) {
    const branch = await prisma.branch.findFirst({
      where: { instituteId: institute.id, code },
    });
    if (branch) {
      await prisma.branch.update({
        where: { id: branch.id },
        data: { status: "ACTIVE" },
      });
      console.log(`✓ Reactivated branch: ${code}`);
    }
  }

  const korBranch = await prisma.branch.findFirst({
    where: { instituteId: institute.id, code: "KOR" },
  });

  // 3. Ensure Roles exist
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const cmRole = await prisma.role.findUnique({ where: { name: "CENTER_MANAGER" } });
  if (!adminRole || !cmRole) {
    throw new Error("Roles ADMIN or CENTER_MANAGER missing!");
  }

  // 4. Remove duplicate admin users in test institutes or old corrupted ones, keeping one canonical in AADYA-HQ
  const allAdmins = await prisma.user.findMany({
    where: { email: "admin@aadya.in" },
    include: { institute: true },
  });

  console.log(`Found ${allAdmins.length} admin accounts in DB.`);

  let canonicalAdmin = allAdmins.find((u) => u.instituteId === institute.id);

  // If none or multiple, clean up extras
  for (const u of allAdmins) {
    if (canonicalAdmin && u.id !== canonicalAdmin.id) {
      console.log(`Cleaning up duplicate admin user ${u.id} (${u.institute?.code})...`);
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.userPermission.deleteMany({ where: { userId: u.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } }).catch(() => {
        return prisma.user.update({ where: { id: u.id }, data: { email: `admin_old_${u.id}@aadya.in` } });
      });
    }
  }

  if (!canonicalAdmin) {
    canonicalAdmin = await prisma.user.create({
      data: {
        instituteId: institute.id,
        branchId: korBranch?.id,
        name: "Aadya System Admin",
        email: "admin@aadya.in",
        phone: "+91 99999 99999",
        passwordHash: hashedPassword,
        status: "ACTIVE",
        whatsappEnabled: true,
      },
    });
  } else {
    canonicalAdmin = await prisma.user.update({
      where: { id: canonicalAdmin.id },
      data: {
        instituteId: institute.id,
        branchId: korBranch?.id,
        name: "Aadya System Admin",
        email: "admin@aadya.in",
        passwordHash: hashedPassword,
        status: "ACTIVE",
      },
    });
  }

  // Assign ADMIN role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: canonicalAdmin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: canonicalAdmin.id,
      roleId: adminRole.id,
    },
  });

  // Assign all permissions to Admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: canonicalAdmin.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        userId: canonicalAdmin.id,
        permissionId: perm.id,
        grantedById: canonicalAdmin.id,
      },
    });
  }

  console.log(`✅ Admin Account successfully restored: ${canonicalAdmin.email} (ACTIVE, ADMIN role, ${allPermissions.length} permissions)`);

  // 5. Also restore manager@aadya.in in AADYA-HQ
  const allManagers = await prisma.user.findMany({
    where: { email: "manager@aadya.in" },
    include: { institute: true },
  });

  let canonicalManager = allManagers.find((u) => u.instituteId === institute.id);
  for (const u of allManagers) {
    if (canonicalManager && u.id !== canonicalManager.id) {
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.userPermission.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } }).catch(() => {
        return prisma.user.update({ where: { id: u.id }, data: { email: `manager_old_${u.id}@aadya.in` } });
      });
    }
  }

  if (!canonicalManager) {
    canonicalManager = await prisma.user.create({
      data: {
        instituteId: institute.id,
        branchId: korBranch?.id,
        name: "Suresh Sharma",
        email: "manager@aadya.in",
        phone: "9876543210",
        passwordHash: managerHashedPassword,
        status: "ACTIVE",
      },
    });
  } else {
    canonicalManager = await prisma.user.update({
      where: { id: canonicalManager.id },
      data: {
        instituteId: institute.id,
        branchId: korBranch?.id,
        passwordHash: managerHashedPassword,
        status: "ACTIVE",
      },
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: canonicalManager.id,
        roleId: cmRole.id,
      },
    },
    update: {},
    create: {
      userId: canonicalManager.id,
      roleId: cmRole.id,
    },
  });

  console.log(`✅ Center Manager Account successfully restored: ${canonicalManager.email} (ACTIVE, CENTER_MANAGER role)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

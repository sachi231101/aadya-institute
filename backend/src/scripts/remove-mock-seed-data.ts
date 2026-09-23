import "dotenv/config";
import { prisma } from "../config/database";

/**
 * Removes mock/demo seed data (branches, billing plans, etc.)
 * Keeps: Institute, Roles, Permissions, Admin user login.
 */
async function main() {
  console.log("Removing mock seed data (branches, billing plans)...");

  // Unlink admin from any branch first
  const updatedUsers = await prisma.user.updateMany({
    data: { branchId: null },
  });
  console.log(`Cleared branchId on ${updatedUsers.count} user(s)`);

  // Clear optional branch access rows
  const uba = await prisma.userBranchAccess.deleteMany({});
  console.log(`Deleted UserBranchAccess: ${uba.count}`);

  // Delete all branches
  const branches = await prisma.branch.deleteMany({});
  console.log(`Deleted branches: ${branches.count}`);

  // Delete billing plans if present (seeded mock)
  try {
    const billing = await prisma.billingPlan.deleteMany({});
    console.log(`Deleted BillingPlan: ${billing.count}`);
  } catch {
    console.log("BillingPlan model not available or already empty");
  }

  const remaining = {
    users: await prisma.user.count(),
    institutes: await prisma.institute.count(),
    branches: await prisma.branch.count(),
    roles: await prisma.role.count(),
    students: await prisma.student.count(),
    courses: await prisma.course.count(),
  };

  const admin = await prisma.user.findFirst({
    where: { email: "admin@aadya.in" },
    select: { email: true, branchId: true, status: true },
  });

  console.log("\nDone. Remaining counts:", remaining);
  console.log("Admin:", admin);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

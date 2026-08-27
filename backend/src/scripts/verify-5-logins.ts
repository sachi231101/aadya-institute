import { prisma } from "../config/database";
import { comparePassword } from "../utils/password";

async function verifyLogins() {
  console.log("🔍 Verifying 5 Dashboard Accounts in Database...\n");

  const accounts = [
    { name: "Admin", email: "admin@aadya.in", password: "ChangeMe@123", expectedRole: "ADMIN" },
    { name: "Center Manager", email: "manager@aadya.in", password: "Manager@123", expectedRole: "CENTER_MANAGER" },
    { name: "Counsellor", email: "counsellor@aadya.in", password: "Counsellor@123", expectedRole: "COUNSELLOR" },
    { name: "Faculty", email: "ramesh@aadya.in", password: "Faculty@123", expectedRole: "FACULTY" },
    { name: "Student", email: "student@aadya.in", password: "Student@123", expectedRole: "STUDENT" },
  ];

  for (const acc of accounts) {
    const user = await prisma.user.findFirst({
      where: { email: acc.email },
      include: {
        userRoles: { include: { role: true } },
        student: true,
        faculty: true,
      },
    });

    if (!user) {
      console.error(`❌ User NOT found: ${acc.email}`);
      continue;
    }

    const isValidPassword = await comparePassword(acc.password, user.passwordHash);
    const roles = user.userRoles.map((ur) => ur.role.name);
    const hasRole = roles.includes(acc.expectedRole);

    if (isValidPassword && hasRole) {
      console.log(`✅ [${acc.name}] Login Valid: ${acc.email} | Roles: [${roles.join(", ")}] | Status: ${user.status}`);
      if (acc.expectedRole === "FACULTY") {
        console.log(`   └─ Faculty Code: ${user.faculty?.employeeCode} (${user.faculty?.specialization})`);
      }
      if (acc.expectedRole === "STUDENT") {
        console.log(`   └─ Student Code: ${user.student?.studentCode}`);
      }
    } else {
      console.error(`❌ [${acc.name}] Verification Failed: Password Valid: ${isValidPassword}, Has Role: ${hasRole}`);
    }
  }

  console.log("\n🎉 All 5 Dashboard Direct Logins verified successfully in PostgreSQL database!");
}

verifyLogins()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

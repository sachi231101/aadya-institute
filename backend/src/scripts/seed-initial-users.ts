import { prisma } from "../config/database";
import { hashPassword } from "../utils/password";

async function main() {
  console.log("🌱 Seeding 5 Dashboard Login Accounts...");

  // 1. Ensure Institute Exists
  let institute = await prisma.institute.findFirst();
  if (!institute) {
    institute = await prisma.institute.create({
      data: {
        name: "Aadya Institute of Technology",
        code: "AADYA-MAIN",
        email: "info@aadya.in",
        phone: "+91 99999 88888",
        address: "Tech Hub Tower, Koramangala 5th Block, Bengaluru, Karnataka 560034",
      },
    });
    console.log("✓ Created Institute:", institute.name);
  }

  // 2. Ensure Branches Exist
  let hsrBranch = await prisma.branch.findFirst({
    where: { instituteId: institute.id, code: "BLR-HSR" },
  });
  if (!hsrBranch) {
    hsrBranch = await prisma.branch.create({
      data: {
        instituteId: institute.id,
        name: "HSR Layout Campus",
        code: "BLR-HSR",
        address: "24th Main Road, Sector 2, HSR Layout, Bengaluru",
        phone: "+91 80 2345 6789",
      },
    });
    console.log("✓ Created HSR Branch:", hsrBranch.name);
  }

  let koraBranch = await prisma.branch.findFirst({
    where: { instituteId: institute.id, code: "BLR-KORA" },
  });
  if (!koraBranch) {
    koraBranch = await prisma.branch.create({
      data: {
        instituteId: institute.id,
        name: "Koramangala Campus",
        code: "BLR-KORA",
        address: "80 Feet Road, 4th Block, Koramangala, Bengaluru",
        phone: "+91 80 9876 5432",
      },
    });
    console.log("✓ Created Koramangala Branch:", koraBranch.name);
  }

  // 3. Ensure Roles Exist
  const roles = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"];
  const roleMap: Record<string, string> = {};

  for (const roleName of roles) {
    let role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: `${roleName} role with associated permissions`,
        },
      });
      console.log(`✓ Created Role: ${roleName}`);
    }
    roleMap[roleName] = role.id;
  }

  // 4. The 5 Direct Login Staff & Student Accounts matching Login.tsx
  const accounts = [
    {
      name: "Aadya System Admin",
      email: "admin@aadya.in",
      password: "ChangeMe@123",
      phone: "9999999999",
      role: "ADMIN",
    },
    {
      name: "Suresh Sharma",
      email: "manager@aadya.in",
      password: "Manager@123",
      phone: "9876543210",
      role: "CENTER_MANAGER",
    },
    {
      name: "Priya Singh",
      email: "counsellor@aadya.in",
      password: "Counsellor@123",
      phone: "9876543211",
      role: "COUNSELLOR",
    },
    {
      name: "Ramesh Kumar",
      email: "ramesh@aadya.in",
      password: "Faculty@123",
      phone: "9888888888",
      role: "FACULTY",
    },
    {
      name: "Rahul Verma",
      email: "student@aadya.in",
      password: "Student@123",
      phone: "9777777777",
      role: "STUDENT",
    },
  ];

  for (const acc of accounts) {
    const passwordHash = await hashPassword(acc.password);

    // Upsert User
    let user = await prisma.user.findFirst({
      where: {
        instituteId: institute.id,
        email: acc.email,
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: acc.name,
          passwordHash,
          phone: acc.phone,
          status: "ACTIVE",
          branchId: hsrBranch.id,
        },
      });
      console.log(`✓ Updated User: ${acc.email} (${acc.role})`);
    } else {
      user = await prisma.user.create({
        data: {
          instituteId: institute.id,
          branchId: hsrBranch.id,
          name: acc.name,
          email: acc.email,
          phone: acc.phone,
          passwordHash,
          status: "ACTIVE",
        },
      });
      console.log(`✓ Created User: ${acc.email} (${acc.role})`);
    }

    // Ensure UserRole mapping
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: roleMap[acc.role],
      },
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: roleMap[acc.role],
        },
      });
    }

    // Role-specific models: Faculty
    if (acc.role === "FACULTY") {
      const existingFaculty = await prisma.faculty.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { instituteId: institute.id, employeeCode: "FAC-101" },
          ],
        },
      });
      if (existingFaculty) {
        await prisma.faculty.update({
          where: { id: existingFaculty.id },
          data: {
            userId: user.id,
            employeeCode: "FAC-101",
            specialization: "Full Stack Web Development & AI",
            status: "ACTIVE",
          },
        });
      } else {
        await prisma.faculty.create({
          data: {
            userId: user.id,
            instituteId: institute.id,
            branchId: hsrBranch.id,
            employeeCode: "FAC-101",
            specialization: "Full Stack Web Development & AI",
            status: "ACTIVE",
          },
        });
      }
    }

    // Role-specific models: Student
    if (acc.role === "STUDENT") {
      const existingStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { instituteId: institute.id, studentCode: "AAD-2026-1001" },
          ],
        },
      });
      if (existingStudent) {
        await prisma.student.update({
          where: { id: existingStudent.id },
          data: {
            userId: user.id,
            studentCode: "AAD-2026-1001",
            status: "ACTIVE",
          },
        });
      } else {
        await prisma.student.create({
          data: {
            userId: user.id,
            instituteId: institute.id,
            branchId: hsrBranch.id,
            studentCode: "AAD-2026-1001",
            status: "ACTIVE",
          },
        });
      }
    }
  }

  // 5. Seed Courses
  const courses = [
    { name: "Full Stack Web Development (MERN + AI)", code: "FSWD-2026", category: "Web Development", duration: 6 },
    { name: "Data Analytics & AI", code: "DA-2026", category: "Data Science", duration: 4 },
    { name: "Digital Marketing & Performance Marketing", code: "DM-2026", category: "Marketing", duration: 3 },
  ];

  for (const c of courses) {
    const existingCourse = await prisma.course.findFirst({ where: { code: c.code } });
    if (existingCourse) {
      await prisma.course.update({
        where: { id: existingCourse.id },
        data: { name: c.name, duration: c.duration, category: c.category },
      });
    } else {
      await prisma.course.create({
        data: {
          instituteId: institute.id,
          name: c.name,
          code: c.code,
          category: c.category,
          duration: c.duration,
        },
      });
    }
  }

  // 6. Seed Classrooms & Masters
  const masters = [
    { entityType: "classroom", name: "Lab 101 (Frontend Studio)", code: "LAB-101", data: { capacity: 35 } },
    { entityType: "classroom", name: "Lab 102 (Backend & AI Lab)", code: "LAB-102", data: { capacity: 30 } },
    { entityType: "leadsource", name: "Walk-in Inquiry", code: "WALK-IN", data: {} },
    { entityType: "leadsource", name: "WhatsApp Inquiry", code: "WHATSAPP", data: {} },
    { entityType: "leadsource", name: "Google Search", code: "GOOGLE", data: {} },
    { entityType: "paymentmodes", name: "UPI / QR Code", code: "UPI", data: {} },
    { entityType: "paymentmodes", name: "Credit/Debit Card", code: "CARD", data: {} },
    { entityType: "paymentmodes", name: "Net Banking", code: "NET_BANKING", data: {} },
    { entityType: "paymentmodes", name: "Cash", code: "CASH", data: {} },
  ];

  for (const m of masters) {
    const existingMaster = await prisma.masterRecord.findFirst({
      where: { instituteId: institute.id, entityType: m.entityType, code: m.code },
    });
    if (!existingMaster) {
      await prisma.masterRecord.create({
        data: {
          instituteId: institute.id,
          branchId: hsrBranch.id,
          entityType: m.entityType,
          name: m.name,
          code: m.code,
          data: m.data,
          status: "ACTIVE",
        },
      });
    }
  }

  console.log("✨ All 5 Dashboard Direct Login accounts seeded and ready!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

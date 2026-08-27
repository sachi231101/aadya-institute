import "dotenv/config";
import { prisma } from "../src/config/database";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123";

async function main() {
  console.log("🌱 Starting Aadya Institute Database Seeding...");
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
  // 4. USERS
  // ───────────────────────────────────────────────────────────────────────────
  console.log("👤 Seeding Users & Granting User Permissions...");

  // Passwords matching UI Login.tsx
  const ADMIN_PASS = "ChangeMe@123";
  const MANAGER_PASS = "Manager@123";
  const COUNSELLOR_PASS = "Counsellor@123";
  const FACULTY_PASS = "Faculty@123";
  const STUDENT_PASS = "Student@123";

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASS, SALT_ROUNDS);
  const managerPasswordHash = await bcrypt.hash(MANAGER_PASS, SALT_ROUNDS);
  const counsellorPasswordHash = await bcrypt.hash(COUNSELLOR_PASS, SALT_ROUNDS);
  const facultyPasswordHash = await bcrypt.hash(FACULTY_PASS, SALT_ROUNDS);
  const studentPasswordHash = await bcrypt.hash(STUDENT_PASS, SALT_ROUNDS);

  // 4.1 Super Admin User (admin@aadya.in)
  let adminUser = await prisma.user.findFirst({
    where: { email: "admin@aadya.in" },
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        instituteId: institute.id,
        name: "Aadya System Admin",
        email: "admin@aadya.in",
        phone: "+91 99999 99999",
        passwordHash: adminPasswordHash,
        status: "ACTIVE",
        whatsappEnabled: true,
      },
    });
  } else {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        name: "Aadya System Admin",
        passwordHash: adminPasswordHash,
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

  // 4.2 Center Managers (manager@aadya.in + additional managers)
  const cmData = [
    {
      name: "Suresh Sharma",
      email: "manager@aadya.in",
      passwordHash: managerPasswordHash,
      phone: "+91 9876543210",
      branchId: branchKormangala.id,
    },
    {
      name: "Deepa Nair",
      email: "manager.indiranagar@aadya.com",
      passwordHash: managerPasswordHash,
      phone: "+91 9876543212",
      branchId: branchIndiranagar.id,
    },
    {
      name: "Ramesh Verma",
      email: "manager.hsr@aadya.com",
      passwordHash: managerPasswordHash,
      phone: "+91 9876543213",
      branchId: branchHSR.id,
    },
  ];

  for (const cm of cmData) {
    let u = await prisma.user.findFirst({ where: { email: cm.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          instituteId: institute.id,
          branchId: cm.branchId,
          name: cm.name,
          email: cm.email,
          phone: cm.phone,
          passwordHash: cm.passwordHash,
          status: "ACTIVE",
          whatsappEnabled: true,
        },
      });
    } else {
      u = await prisma.user.update({
        where: { id: u.id },
        data: {
          name: cm.name,
          passwordHash: cm.passwordHash,
          status: "ACTIVE",
        },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: roles["CENTER_MANAGER"].id } },
      update: {},
      create: { userId: u.id, roleId: roles["CENTER_MANAGER"].id },
    });

    // Grant all CM permissions to UserPermission table
    for (const permName of cmPermNames) {
      const p = permissions[permName];
      if (p) {
        await prisma.userPermission.upsert({
          where: { userId_permissionId: { userId: u.id, permissionId: p.id } },
          update: {},
          create: { userId: u.id, permissionId: p.id, grantedById: adminUser.id },
        });
      }
    }
  }

  // 4.3 Counsellors (counsellor@aadya.in + additional counsellors)
  const counsellorData = [
    {
      name: "Priya Singh",
      email: "counsellor@aadya.in",
      passwordHash: counsellorPasswordHash,
      phone: "+91 9876543211",
      branchId: branchKormangala.id,
    },
    {
      name: "Ananya Iyer",
      email: "counsellor.ananya@aadya.com",
      passwordHash: counsellorPasswordHash,
      phone: "+91 9876543220",
      branchId: branchKormangala.id,
    },
    {
      name: "Rohit Deshmukh",
      email: "counsellor.rohit@aadya.com",
      passwordHash: counsellorPasswordHash,
      phone: "+91 9876543221",
      branchId: branchIndiranagar.id,
    },
  ];

  const counsellorsList: any[] = [];
  for (const c of counsellorData) {
    let u = await prisma.user.findFirst({ where: { email: c.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          instituteId: institute.id,
          branchId: c.branchId,
          name: c.name,
          email: c.email,
          phone: c.phone,
          passwordHash: c.passwordHash,
          status: "ACTIVE",
          whatsappEnabled: true,
        },
      });
    } else {
      u = await prisma.user.update({
        where: { id: u.id },
        data: {
          name: c.name,
          passwordHash: c.passwordHash,
          status: "ACTIVE",
        },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: roles["COUNSELLOR"].id } },
      update: {},
      create: { userId: u.id, roleId: roles["COUNSELLOR"].id },
    });

    for (const permName of counsellorPermNames) {
      const p = permissions[permName];
      if (p) {
        await prisma.userPermission.upsert({
          where: { userId_permissionId: { userId: u.id, permissionId: p.id } },
          update: {},
          create: { userId: u.id, permissionId: p.id, grantedById: adminUser.id },
        });
      }
    }
    counsellorsList.push(u);
  }

  // 4.4 Faculty (ramesh@aadya.in + additional faculty)
  const facultyData = [
    {
      name: "Ramesh Kumar",
      email: "ramesh@aadya.in",
      passwordHash: facultyPasswordHash,
      phone: "+91 9888888888",
      branchId: branchKormangala.id,
      employeeCode: "FAC-101",
      specialization: "Full Stack Web Development & AI",
    },
    {
      name: "Prof. Rajesh Kumar",
      email: "faculty.rajesh@aadya.com",
      passwordHash: facultyPasswordHash,
      phone: "+91 9876543230",
      branchId: branchKormangala.id,
      employeeCode: "EMP-FAC-001",
      specialization: "Full Stack Web & Cloud Architecture",
    },
    {
      name: "Dr. Priya Sundaram",
      email: "faculty.priya@aadya.com",
      passwordHash: facultyPasswordHash,
      phone: "+91 9876543231",
      branchId: branchIndiranagar.id,
      employeeCode: "EMP-FAC-002",
      specialization: "Data Science & AI / ML",
    },
    {
      name: "Vikram Sethi",
      email: "faculty.vikram@aadya.com",
      passwordHash: facultyPasswordHash,
      phone: "+91 9876543232",
      branchId: branchHSR.id,
      employeeCode: "EMP-FAC-003",
      specialization: "UI/UX & Product Design",
    },
  ];

  const facultyList: any[] = [];
  for (const f of facultyData) {
    let u = await prisma.user.findFirst({ where: { email: f.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          instituteId: institute.id,
          branchId: f.branchId,
          name: f.name,
          email: f.email,
          phone: f.phone,
          passwordHash: f.passwordHash,
          status: "ACTIVE",
          whatsappEnabled: true,
        },
      });
    } else {
      u = await prisma.user.update({
        where: { id: u.id },
        data: {
          name: f.name,
          passwordHash: f.passwordHash,
          status: "ACTIVE",
        },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: roles["FACULTY"].id } },
      update: {},
      create: { userId: u.id, roleId: roles["FACULTY"].id },
    });

    const fac = await prisma.faculty.upsert({
      where: { instituteId_employeeCode: { instituteId: institute.id, employeeCode: f.employeeCode } },
      update: { userId: u.id, specialization: f.specialization, status: "ACTIVE" },
      create: {
        userId: u.id,
        instituteId: institute.id,
        branchId: f.branchId,
        employeeCode: f.employeeCode,
        specialization: f.specialization,
        status: "ACTIVE",
      },
    });
    facultyList.push(fac);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. COURSES & MODULES
  // ───────────────────────────────────────────────────────────────────────────
  console.log("📚 Seeding Courses & Modules...");

  // Course 1: Full Stack Web Development
  const courseFSD = await prisma.course.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "FSD-101" } },
    update: {},
    create: {
      instituteId: institute.id,
      name: "Full Stack Web Development (MERN & Next.js)",
      code: "FSD-101",
      description: "Complete full-stack web engineering from frontend to cloud deployment.",
      duration: 24,
      category: "Web Development",
      mode: "HYBRID",
      level: "INTERMEDIATE",
      totalHours: 180,
    },
  });

  const fsdModules = [
    { sequence: 1, name: "Modern JavaScript & TypeScript Fundamentals", code: "MOD-FSD-01", duration: 4 },
    { sequence: 2, name: "Advanced React, Hooks & State Architecture", code: "MOD-FSD-02", duration: 6 },
    { sequence: 3, name: "Node.js, Express & Microservices Backend", code: "MOD-FSD-03", duration: 6 },
    { sequence: 4, name: "PostgreSQL, Prisma ORM, Redis & BullMQ", code: "MOD-FSD-04", duration: 4 },
    { sequence: 5, name: "Cloud Deployment, Docker & DevOps Capstone", code: "MOD-FSD-05", duration: 4 },
  ];

  const courseFsdModules: any[] = [];
  for (const m of fsdModules) {
    const mod = await prisma.courseModule.upsert({
      where: { courseId_sequence: { courseId: courseFSD.id, sequence: m.sequence } },
      update: { name: m.name, code: m.code, duration: m.duration },
      create: {
        courseId: courseFSD.id,
        sequence: m.sequence,
        name: m.name,
        code: m.code,
        duration: m.duration,
      },
    });
    courseFsdModules.push(mod);
  }

  // Course 2: Data Science & AI Specialization
  const courseDS = await prisma.course.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "DSAI-201" } },
    update: {},
    create: {
      instituteId: institute.id,
      name: "Data Science & Applied AI Specialization",
      code: "DSAI-201",
      description: "Applied Machine Learning, Deep Learning, NLP and Large Language Models.",
      duration: 24,
      category: "Data Science",
      mode: "HYBRID",
      level: "ADVANCED",
      totalHours: 200,
    },
  });

  const dsModules = [
    { sequence: 1, name: "Python for Data Analysis & Statistical Modeling", code: "MOD-DS-01", duration: 4 },
    { sequence: 2, name: "Machine Learning Algorithms & Scikit-Learn", code: "MOD-DS-02", duration: 6 },
    { sequence: 3, name: "Deep Learning, PyTorch & Computer Vision", code: "MOD-DS-03", duration: 6 },
    { sequence: 4, name: "Generative AI, LangChain & LLM Agents", code: "MOD-DS-04", duration: 8 },
  ];

  for (const m of dsModules) {
    await prisma.courseModule.upsert({
      where: { courseId_sequence: { courseId: courseDS.id, sequence: m.sequence } },
      update: { name: m.name, code: m.code, duration: m.duration },
      create: {
        courseId: courseDS.id,
        sequence: m.sequence,
        name: m.name,
        code: m.code,
        duration: m.duration,
      },
    });
  }

  // Course 3: UI/UX & Digital Product Design
  const courseUIUX = await prisma.course.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "UIUX-301" } },
    update: {},
    create: {
      instituteId: institute.id,
      name: "UI/UX & Digital Product Design",
      code: "UIUX-301",
      description: "User research, Figma design systems, wireframing and micro-interactions.",
      duration: 16,
      category: "Design",
      mode: "OFFLINE",
      level: "BEGINNER",
      totalHours: 120,
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. BATCHES & SCHEDULES
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🏫 Seeding Batches & Class Schedules...");

  const now = new Date();
  const batchFSD1 = await prisma.batch.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "BATCH-FSD-2026-01" } },
    update: {},
    create: {
      instituteId: institute.id,
      branchId: branchKormangala.id,
      courseId: courseFSD.id,
      facultyId: facultyList[0].id,
      name: "FSD Morning Regular MWF",
      code: "BATCH-FSD-2026-01",
      startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      expectedEndDate: new Date(now.getFullYear(), now.getMonth() + 4, 1),
      schedulePattern: "MWF",
      timeSlot: "10:00 AM - 12:00 PM",
      capacity: 35,
      status: "ACTIVE",
    },
  });

  const batchDS1 = await prisma.batch.upsert({
    where: { instituteId_code: { instituteId: institute.id, code: "BATCH-DS-2026-01" } },
    update: {},
    create: {
      instituteId: institute.id,
      branchId: branchIndiranagar.id,
      courseId: courseDS.id,
      facultyId: facultyList[1].id,
      name: "DS & AI Evening TTS",
      code: "BATCH-DS-2026-01",
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      expectedEndDate: new Date(now.getFullYear(), now.getMonth() + 5, 15),
      schedulePattern: "TTS",
      timeSlot: "06:00 PM - 08:00 PM",
      capacity: 30,
      status: "ACTIVE",
    },
  });

  // Link batch modules
  for (let i = 0; i < courseFsdModules.length; i++) {
    await prisma.batchModule.upsert({
      where: { batchId_sequence: { batchId: batchFSD1.id, sequence: i + 1 } },
      update: {},
      create: {
        batchId: batchFSD1.id,
        courseModuleId: courseFsdModules[i].id,
        sequence: i + 1,
        startDate: new Date(now.getFullYear(), now.getMonth() - 2 + i, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 1 + i, 1),
        status: "ACTIVE",
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. STUDENTS, ADMISSIONS & FEES
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🎓 Seeding Students, Admissions & Enrollments...");

  const studentsData = [
    {
      name: "Rahul Verma",
      email: "student@aadya.in",
      passwordHash: studentPasswordHash,
      phone: "+91 9777777777",
      studentCode: "AAD-2026-1001",
      qualification: "B.Tech Computer Science",
      branchId: branchKormangala.id,
      feePlan: "INSTALLMENT" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Sneha Reddy",
      email: "student.sneha@aadya.com",
      passwordHash: studentPasswordHash,
      phone: "+91 9876543302",
      studentCode: "STD-2026-002",
      qualification: "BCA",
      branchId: branchKormangala.id,
      feePlan: "FULL_PAYMENT" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Rahul Sharma",
      email: "student.rahul@aadya.com",
      passwordHash: studentPasswordHash,
      phone: "+91 9876543303",
      studentCode: "STD-2026-003",
      qualification: "B.Sc Statistics",
      branchId: branchIndiranagar.id,
      feePlan: "INSTALLMENT" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Kavita Menon",
      email: "student.kavita@aadya.com",
      passwordHash: studentPasswordHash,
      phone: "+91 9876543304",
      studentCode: "STD-2026-004",
      qualification: "B.E Electronics",
      branchId: branchKormangala.id,
      feePlan: "INSTALLMENT" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Amit Patel",
      email: "student.amit@aadya.com",
      passwordHash: studentPasswordHash,
      phone: "+91 9876543305",
      studentCode: "STD-2026-005",
      qualification: "MCA",
      branchId: branchHSR.id,
      feePlan: "FULL_PAYMENT" as const,
      status: "ACTIVE" as const,
    },
  ];

  const studentsList: any[] = [];
  for (let i = 0; i < studentsData.length; i++) {
    const s = studentsData[i];
    let u = await prisma.user.findFirst({ where: { email: s.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          instituteId: institute.id,
          branchId: s.branchId,
          name: s.name,
          email: s.email,
          phone: s.phone,
          passwordHash: s.passwordHash,
          status: "ACTIVE",
          whatsappEnabled: true,
        },
      });
    } else {
      u = await prisma.user.update({
        where: { id: u.id },
        data: {
          name: s.name,
          passwordHash: s.passwordHash,
          status: "ACTIVE",
        },
      });
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: roles["STUDENT"].id } },
      update: {},
      create: { userId: u.id, roleId: roles["STUDENT"].id },
    });

    const student = await prisma.student.upsert({
      where: { instituteId_studentCode: { instituteId: institute.id, studentCode: s.studentCode } },
      update: { userId: u.id, qualification: s.qualification, status: s.status },
      create: {
        userId: u.id,
        instituteId: institute.id,
        branchId: s.branchId,
        studentCode: s.studentCode,
        qualification: s.qualification,
        status: s.status,
      },
    });
    studentsList.push(student);

    // Create admission
    const admissionNo = `ADM-2026-${(100 + i).toString()}`;
    const admission = await prisma.admission.upsert({
      where: { admissionNo },
      update: {},
      create: {
        admissionNo,
        studentId: student.id,
        instituteId: institute.id,
        branchId: s.branchId,
        courseId: i < 3 ? courseFSD.id : courseDS.id,
        batchId: i < 3 ? batchFSD1.id : batchDS1.id,
        studentName: s.name,
        email: s.email,
        phone: s.phone,
        feePlan: s.feePlan,
        status: "CONFIRMED",
        admissionDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      },
    });

    // Enroll into batch
    const targetBatchId = i < 3 ? batchFSD1.id : batchDS1.id;
    await prisma.batchEnrollment.upsert({
      where: { batchId_studentId: { batchId: targetBatchId, studentId: student.id } },
      update: {},
      create: {
        batchId: targetBatchId,
        studentId: student.id,
        admissionId: admission.id,
        status: "ACTIVE",
      },
    });

    // Create payment & fee records
    const feeHeadAmount = 65000;
    const paidAmount = s.feePlan === "FULL_PAYMENT" ? 65000 : 35000;
    const pendingAmount = feeHeadAmount - paidAmount;

    // Idempotent payment upsert
    const receiptNo = `RCP-2026-${(1000 + i).toString()}`;
    await prisma.payment.upsert({
      where: { receiptNo },
      update: {
        amount: paidAmount,
        notes: s.feePlan === "FULL_PAYMENT" ? "Full tuition fee payment" : "1st Installment paid",
      },
      create: {
        instituteId: institute.id,
        branchId: s.branchId,
        studentId: student.id,
        admissionId: admission.id,
        studentName: s.name,
        admissionNo: admissionNo,
        courseName: i < 3 ? courseFSD.name : courseDS.name,
        receiptNo,
        amount: paidAmount,
        date: new Date(now.getFullYear(), now.getMonth() - 2, 5),
        method: i % 2 === 0 ? "UPI" : "NET_BANKING",
        status: "SUCCESS",
        notes: s.feePlan === "FULL_PAYMENT" ? "Full tuition fee payment" : "1st Installment paid",
        transactionRef: `TXN-${Date.now()}-${i}`,
      },
    });

    if (pendingAmount > 0) {
      const existingPending = await prisma.pendingFee.findFirst({
        where: { admissionId: admission.id },
      });
      if (!existingPending) {
        await prisma.pendingFee.create({
          data: {
            instituteId: institute.id,
            branchId: s.branchId,
            studentId: student.id,
            admissionId: admission.id,
            studentName: s.name,
            admissionNo: admissionNo,
            phone: s.phone,
            courseName: i < 3 ? courseFSD.name : courseDS.name,
            totalFee: feeHeadAmount,
            amountPaid: paidAmount,
            dueAmount: pendingAmount,
            dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
            installmentNo: 2,
            overdueDays: 0,
            status: "DUE_SOON",
            notes: "2nd Installment balance",
          },
        });
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. CLASS SESSIONS & ATTENDANCE
  // ───────────────────────────────────────────────────────────────────────────
  console.log("🗓️  Seeding Class Sessions, Attendance & Recordings...");

  const existingSessions = await prisma.classSession.count({
    where: { batchId: batchFSD1.id },
  });

  if (existingSessions === 0) {
    for (let d = 5; d >= 1; d--) {
      const sessionDate = new Date(now.getTime() - d * 2 * 24 * 60 * 60 * 1000);
      const session = await prisma.classSession.create({
        data: {
          batchId: batchFSD1.id,
          facultyId: facultyList[0].id,
          branchId: branchKormangala.id,
          title: `Full Stack Engineering: Module 1 Session ${6 - d}`,
          scheduledDate: sessionDate,
          startTime: "10:00 AM",
          endTime: "12:00 PM",
          roomNo: "Lab 102",
          mode: "HYBRID",
          sessionStatus: "COMPLETED",
          status: "ACTIVE",
        },
      });

      await prisma.facultyAttendance.create({
        data: {
          facultyId: facultyList[0].id,
          classSessionId: session.id,
          loginAt: new Date(sessionDate.getTime() - 10 * 60000),
          logoutAt: new Date(sessionDate.getTime() + 120 * 60000),
        },
      });

      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const student = studentsList[sIdx];
        const isAbsent = sIdx === 1 && d === 2;
        await prisma.studentAttendance.create({
          data: {
            classSessionId: session.id,
            studentId: student.id,
            status: isAbsent ? "ABSENT" : "PRESENT",
            markedAt: sessionDate,
            markedBy: facultyList[0].userId,
          },
        });
      }

      await prisma.recording.create({
        data: {
          classSessionId: session.id,
          storageKey: `recordings/fsd/session_${session.id}.mp4`,
          duration: 115,
          startedAt: sessionDate,
          endedAt: new Date(sessionDate.getTime() + 115 * 60000),
          expiresAt: new Date(sessionDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
      });

      await prisma.feedback.create({
        data: {
          classSessionId: session.id,
          studentId: studentsList[0].id,
          facultyId: facultyList[0].id,
          rating: 5,
          comment: "Excellent explanation of React component lifecycle and custom hooks!",
        },
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. LEADS & AI CALLING
  // ───────────────────────────────────────────────────────────────────────────
  console.log("📞 Seeding Leads & AI Calling Logs...");

  const leadsData = [
    {
      name: "Vikas Deshpande",
      email: "vikas.d@gmail.com",
      phone: "+91 9845012345",
      interestedIn: "Full Stack Web Development",
      source: "ONLINE" as const,
      stage: "INTERESTED" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Pooja Hegde",
      email: "pooja.h@yahoo.com",
      phone: "+91 9845098765",
      interestedIn: "Data Science & AI Specialization",
      source: "WHATSAPP" as const,
      stage: "CONTACTED" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Manish Tiwari",
      email: "manish.t@outlook.com",
      phone: "+91 9845055443",
      interestedIn: "UI/UX & Digital Product Design",
      source: "FACEBOOK" as const,
      stage: "FOLLOW_UP" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Ritu Verma",
      email: "ritu.v@gmail.com",
      phone: "+91 9845022110",
      interestedIn: "Full Stack Web Development",
      source: "WALK_IN" as const,
      stage: "CONVERTED" as const,
      status: "CONVERTED" as const,
    },
  ];

  for (let i = 0; i < leadsData.length; i++) {
    const l = leadsData[i];
    let lead = await prisma.lead.findFirst({
      where: { phoneNumber: l.phone, instituteId: institute.id },
    });
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          instituteId: institute.id,
          branchId: branchKormangala.id,
          name: l.name,
          email: l.email,
          phoneNumber: l.phone,
          interestedIn: l.interestedIn,
          source: l.source,
          stage: l.stage,
          status: l.status,
          courseId: courseFSD.id,
          assignedCounsellorId: counsellorsList[0].id,
          createdById: adminUser.id,
        },
      });

      await prisma.callLog.create({
        data: {
          leadId: lead.id,
          externalCallId: `call_sarvam_${Date.now()}_${i}`,
          status: "COMPLETED",
          duration: 128,
          transcript: `Voice Agent: "Hello! Am I speaking with ${l.name}?"\nLead: "Yes, speaking."\nVoice Agent: "Calling from Aadya Institute regarding your query for ${l.interestedIn}. Would you prefer online or weekend offline classes?"\nLead: "I prefer offline classes at Koramangala."\nVoice Agent: "Great! I have shared the syllabus brochure on WhatsApp and our counsellor Ananya will connect with you."`,
        },
      });

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: counsellorsList[0].id,
          type: "CALL_COMPLETED",
          title: "AI Voice Qualification Call completed",
          description: `Lead confirmed high interest in ${l.interestedIn}. Duration: 2m 8s.`,
        },
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 10. MASTER MANAGEMENT REFERENCE DATA
  // ───────────────────────────────────────────────────────────────────────────
  console.log("⚙️  Seeding Master Reference Data...");

  const masterRecords = [
    { entityType: "classroom", name: "Lecture Hall A", code: "CR-LHA", data: { capacity: 60, projector: true, ac: true } },
    { entityType: "classroom", name: "Computer Lab 101", code: "CR-LAB1", data: { capacity: 40, workstations: 40 } },
    { entityType: "classroom", name: "Executive Seminar Room", code: "CR-SEM", data: { capacity: 25, smartBoard: true } },
    { entityType: "leadsource", name: "Official Website", code: "SRC-WEB", data: { costPerLead: 0 } },
    { entityType: "leadsource", name: "WhatsApp Inquiry", code: "SRC-WA", data: { automated: true } },
    { entityType: "leadsource", name: "Google Search Ads", code: "SRC-GGL", data: { costPerLead: 450 } },
    { entityType: "leadsource", name: "Campus Walk-in", code: "SRC-WLK", data: { conversionRate: "45%" } },
    { entityType: "leadstage", name: "New Lead", code: "STG-NEW", data: { color: "#3B82F6", slaHours: 2 } },
    { entityType: "leadstage", name: "AI Call Qualified", code: "STG-AIQ", data: { color: "#8B5CF6", slaHours: 4 } },
    { entityType: "leadstage", name: "Trial Class Booked", code: "STG-TRL", data: { color: "#F59E0B", slaHours: 24 } },
    { entityType: "leadstage", name: "Admission Confirmed", code: "STG-CNF", data: { color: "#10B981" } },
    { entityType: "feehead", name: "Tuition Fee", code: "FH-TUI", data: { taxExempt: true } },
    { entityType: "feehead", name: "Lab & Cloud Infrastructure Fee", code: "FH-LAB", data: { recurring: false } },
    { entityType: "feehead", name: "Placement & Certification Fee", code: "FH-PLC", data: { mandatory: true } },
    { entityType: "timeslot", name: "Morning Slot (10:00 AM - 12:00 PM)", code: "TS-MORN", data: { start: "10:00", end: "12:00" } },
    { entityType: "timeslot", name: "Afternoon Slot (02:00 PM - 04:00 PM)", code: "TS-AFT", data: { start: "14:00", end: "16:00" } },
    { entityType: "timeslot", name: "Evening Slot (06:00 PM - 08:00 PM)", code: "TS-EVE", data: { start: "18:00", end: "20:00" } },
  ];

  for (const m of masterRecords) {
    await prisma.masterRecord.upsert({
      where: {
        instituteId_entityType_name: {
          instituteId: institute.id,
          entityType: m.entityType,
          name: m.name,
        },
      },
      update: {
        code: m.code,
        data: m.data,
      },
      create: {
        instituteId: institute.id,
        branchId: branchKormangala.id,
        entityType: m.entityType,
        name: m.name,
        code: m.code,
        data: m.data,
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 11. NOTIFICATION TEMPLATES & RULES
  // ───────────────────────────────────────────────────────────────────────────
  console.log("📨 Seeding Notification Templates & Automation Rules...");

  await prisma.notificationTemplate.upsert({
    where: { name: "CLASS_REMINDER_TPL" },
    update: {},
    create: {
      name: "CLASS_REMINDER_TPL",
      event: "CLASS_REMINDER",
      providerTemplateName: "aadya_class_reminder_v1",
      language: "en",
      variables: ["student_name", "course_name", "batch_name", "start_time", "room_or_link"],
    },
  });

  await prisma.notificationTemplate.upsert({
    where: { name: "ABSENCE_ALERT_TPL" },
    update: {},
    create: {
      name: "ABSENCE_ALERT_TPL",
      event: "STUDENT_ABSENT",
      providerTemplateName: "aadya_absence_alert_v1",
      language: "en",
      variables: ["student_name", "course_name", "date", "consecutive_absences"],
    },
  });

  await prisma.notificationRule.upsert({
    where: { event_channel: { event: "CLASS_REMINDER", channel: "WHATSAPP" } },
    update: { enabled: true },
    create: {
      event: "CLASS_REMINDER",
      channel: "WHATSAPP",
      enabled: true,
      configuration: { offsetMinutes: -120 },
    },
  });

  console.log("\n===================================================================");
  console.log("✅ AADYA INSTITUTE DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("===================================================================");
  console.log("🔑 5 1-Click Instant Login Accounts Ready:");
  console.log("   • Admin:          admin@aadya.in      / ChangeMe@123");
  console.log("   • Center Manager: manager@aadya.in    / Manager@123");
  console.log("   • Counsellor:     counsellor@aadya.in / Counsellor@123");
  console.log("   • Faculty:        ramesh@aadya.in     / Faculty@123");
  console.log("   • Student:        student@aadya.in    / Student@123");
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

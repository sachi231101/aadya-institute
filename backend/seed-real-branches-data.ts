import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StudentStatus, FacultyStatus, BatchStatus, AdmissionStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting Comprehensive Real Branch Data Seed...");

  // 1. Get Institute
  let institute = await prisma.institute.findFirst();
  if (!institute) {
    institute = await prisma.institute.create({
      data: {
        name: "Aadya Institute of Skills & Technology",
        code: "AADYA-HQ",
        email: "contact@aadya.in",
        phone: "9999999999",
        address: "Bengaluru, Karnataka",
      },
    });
  }

  // 2. Ensure all 5 Branches exist
  const branchDefs = [
    { code: "MAIN", name: "Aadya Central Branch", address: "MG Road, Bengaluru", phone: "9845011001" },
    { code: "WHITE", name: "Whitefield Branch", address: "ITPL Main Road, Whitefield, Bengaluru", phone: "9845011002" },
    { code: "INDIRA", name: "Indiranagar Branch", address: "100ft Road, Indiranagar, Bengaluru", phone: "9845011003" },
    { code: "RMN", name: "Ramamurthy Nagar", address: "TC Palya Main Road, Ramamurthy Nagar, Bengaluru", phone: "9845011004" },
    { code: "JAYA", name: "Jayanagar Branch", address: "4th Block, Jayanagar, Bengaluru", phone: "9845011005" },
  ];

  const branchMap: Record<string, any> = {};
  for (const b of branchDefs) {
    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId: institute.id, code: b.code } },
      update: { name: b.name, address: b.address, phone: b.phone },
      create: { instituteId: institute.id, code: b.code, name: b.name, address: b.address, phone: b.phone },
    });
    branchMap[b.code] = branch;
    console.log(`✅ Branch: ${branch.name} (${branch.code}) [${branch.id}]`);
  }

  // 3. Ensure Roles exist
  const roles = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STUDENT"];
  const roleMap: Record<string, any> = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r, description: `${r} role` },
    });
    roleMap[r] = role;
  }

  // 4. Ensure Courses exist
  const courseDefs = [
    { code: "FSWD", name: "Full Stack Web Development", duration: 180, category: "Web Development" },
    { code: "PY-DS", name: "Python & Data Science", duration: 150, category: "Data Analytics" },
    { code: "GD-UIUX", name: "Graphic Design & UI/UX", duration: 120, category: "Design" },
    { code: "TP-FA", name: "Tally Prime & Financial Accounting", duration: 90, category: "Accounting" },
    { code: "DMM", name: "Digital Marketing Mastery", duration: 120, category: "Marketing" },
  ];

  const courseMap: Record<string, any> = {};
  for (const c of courseDefs) {
    const course = await prisma.course.upsert({
      where: { instituteId_code: { instituteId: institute.id, code: c.code } },
      update: { name: c.name, duration: c.duration, category: c.category },
      create: { instituteId: institute.id, code: c.code, name: c.name, duration: c.duration, category: c.category },
    });
    courseMap[c.code] = course;
    console.log(`✅ Course: ${course.name} (${course.code})`);
  }

  const passwordHash = await bcrypt.hash("Password@123", 10);

  // 5. Seed Data for each Branch
  const branchDataConfigs = [
    {
      branchCode: "MAIN",
      manager: { name: "Rajesh Varma", email: "manager.central@aadya.in", phone: "9800010001" },
      counsellor: { name: "Sneha Reddy", email: "sneha.counsellor@aadya.in", phone: "9800020001" },
      faculty: [
        { name: "Prof. HM Adithya", email: "adithya@aadya.in", phone: "9800030001", code: "FA-ADITHYA", spec: "Full Stack MERN & Cloud" },
        { name: "Sneha Iyer", email: "sneha.iyer.faculty@aadya.in", phone: "9800030002", code: "FA-SNEHA", spec: "Tally Prime & Taxation" },
      ],
      students: [
        { name: "Rahul Kumar", email: "rahul.kumar@gmail.com", phone: "9876543210", code: "AAD-MAIN-001", course: "FSWD", qual: "B.Tech CS", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Vikram Rao", email: "vikram.rao@gmail.com", phone: "9988776655", code: "AAD-MAIN-002", course: "TP-FA", qual: "B.Com", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Pooja Patel", email: "pooja.patel@gmail.com", phone: "7788990011", code: "AAD-MAIN-003", course: "GD-UIUX", qual: "12th Standard", status: StudentStatus.ACTIVE, absences: 2 },
        { name: "Kiran Gowda", email: "kiran.gowda@gmail.com", phone: "9741002233", code: "AAD-MAIN-004", course: "PY-DS", qual: "BCA", status: StudentStatus.COMPLETED, absences: 0 },
      ],
    },
    {
      branchCode: "WHITE",
      manager: { name: "Vikram Malhotra", email: "manager.whitefield@aadya.in", phone: "9800010002" },
      counsellor: { name: "Ananya Deshmukh", email: "ananya.whitefield@aadya.in", phone: "9800020002" },
      faculty: [
        { name: "Arjun Verma", email: "arjun.verma@aadya.in", phone: "9800030003", code: "FA-ARJUN", spec: "UI/UX & Design Systems" },
        { name: "Naveen Hegde", email: "naveen.hegde@aadya.in", phone: "9800030004", code: "FA-NAVEEN", spec: "Python, AI & Data Engineering" },
      ],
      students: [
        { name: "Tanmay Bhatia", email: "tanmay.bhatia@gmail.com", phone: "9811223344", code: "AAD-WHT-001", course: "FSWD", qual: "B.E ECE", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Deepika Padukone", email: "deepika.p@gmail.com", phone: "9822334455", code: "AAD-WHT-002", course: "GD-UIUX", qual: "B.Des", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Rohan Kulkarni", email: "rohan.kulkarni@gmail.com", phone: "9833445566", code: "AAD-WHT-003", course: "PY-DS", qual: "B.Sc Stats", status: StudentStatus.ACTIVE, absences: 1 },
        { name: "Megha Sundaram", email: "megha.s@gmail.com", phone: "9844556677", code: "AAD-WHT-004", course: "DMM", qual: "BBA", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Abhishek Joshi", email: "abhishek.j@gmail.com", phone: "9855667788", code: "AAD-WHT-005", course: "TP-FA", qual: "M.Com", status: StudentStatus.ACTIVE, absences: 3 },
      ],
    },
    {
      branchCode: "INDIRA",
      manager: { name: "Preeti Shenoy", email: "manager.indiranagar@aadya.in", phone: "9800010003" },
      counsellor: { name: "Kavya Murthy", email: "kavya.indira@aadya.in", phone: "9800020003" },
      faculty: [
        { name: "Priya Menon", email: "priya.menon@aadya.in", phone: "9800030005", code: "FA-PRIYA", spec: "Digital Marketing & SEO Growth" },
        { name: "Suresh Babu", email: "suresh.babu@aadya.in", phone: "9800030006", code: "FA-SURESH", spec: "Full Stack Java & Spring" },
      ],
      students: [
        { name: "Siddharth Roy", email: "siddharth.roy@gmail.com", phone: "9866778899", code: "AAD-IND-001", course: "DMM", qual: "B.Com", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Neha Sharma", email: "neha.sharma@gmail.com", phone: "9877889900", code: "AAD-IND-002", course: "FSWD", qual: "BCA", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Varun Teja", email: "varun.teja@gmail.com", phone: "9888990011", code: "AAD-IND-003", course: "PY-DS", qual: "B.Tech Mech", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Ritu Singhal", email: "ritu.singhal@gmail.com", phone: "9899001122", code: "AAD-IND-004", course: "GD-UIUX", qual: "BA Arts", status: StudentStatus.DISCONTINUED, absences: 3 },
      ],
    },
    {
      branchCode: "RMN",
      manager: { name: "Girish Karnad", email: "manager.rmn@aadya.in", phone: "9800010004" },
      counsellor: { name: "Nandini Rao", email: "nandini.rmn@aadya.in", phone: "9800020004" },
      faculty: [
        { name: "Rahul Dev", email: "rahul.dev@aadya.in", phone: "9800030007", code: "FA-RAHUL", spec: "Data Science, ML & Python" },
        { name: "Divya Nambiar", email: "divya.nambiar@aadya.in", phone: "9800030008", code: "FA-DIVYA", spec: "Advanced Tally & GST" },
      ],
      students: [
        { name: "Karan Singh", email: "karan.singh@gmail.com", phone: "8899001122", code: "AAD-RMN-001", course: "PY-DS", qual: "B.Sc Stats", status: StudentStatus.ACTIVE, absences: 2 },
        { name: "Ayesha Khan", email: "ayesha.khan@gmail.com", phone: "8800112233", code: "AAD-RMN-002", course: "TP-FA", qual: "B.Com General", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Manoj Kumar", email: "manoj.k@gmail.com", phone: "8811223344", code: "AAD-RMN-003", course: "FSWD", qual: "Diploma CS", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Divya Prakash", email: "divya.p@gmail.com", phone: "8822334455", code: "AAD-RMN-004", course: "DMM", qual: "BBA Marketing", status: StudentStatus.ACTIVE, absences: 0 },
      ],
    },
    {
      branchCode: "JAYA",
      manager: { name: "Anand Murthy", email: "manager.jayanagar@aadya.in", phone: "9800010005" },
      counsellor: { name: "Bhavana Gowda", email: "bhavana.jayanagar@aadya.in", phone: "9800020005" },
      faculty: [
        { name: "Dr. Sandeep Shastri", email: "sandeep.shastri@aadya.in", phone: "9800030009", code: "FA-SANDEEP", spec: "Full Stack Web & Mobile" },
        { name: "Rashmi Kulkarni", email: "rashmi.k@aadya.in", phone: "9800030010", code: "FA-RASHMI", spec: "UI/UX & Product Design" },
      ],
      students: [
        { name: "Anjali Sharma", email: "anjali.sharma@gmail.com", phone: "9123456780", code: "AAD-JAY-001", course: "GD-UIUX", qual: "BCA", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Mohammed Ali", email: "ali.mohammed@gmail.com", phone: "8899776655", code: "AAD-JAY-002", course: "FSWD", qual: "Diploma in CS", status: StudentStatus.ACTIVE, absences: 1 },
        { name: "Sneha Nair", email: "sneha.nair@gmail.com", phone: "9900887766", code: "AAD-JAY-003", course: "PY-DS", qual: "B.Tech IT", status: StudentStatus.ACTIVE, absences: 0 },
        { name: "Pranav Mohan", email: "pranav.m@gmail.com", phone: "9911223344", code: "AAD-JAY-004", course: "TP-FA", qual: "B.Com Honours", status: StudentStatus.ACTIVE, absences: 0 },
      ],
    },
  ];

  for (const cfg of branchDataConfigs) {
    const branch = branchMap[cfg.branchCode];
    console.log(`\n🏢 Populating data for ${branch.name}...`);

    // A. Center Manager
    let mgrUser = await prisma.user.findFirst({ where: { email: cfg.manager.email } });
    if (!mgrUser) {
      mgrUser = await prisma.user.create({
        data: {
          instituteId: institute.id,
          branchId: branch.id,
          name: cfg.manager.name,
          email: cfg.manager.email,
          phone: cfg.manager.phone,
          passwordHash,
        },
      });
      await prisma.userRole.create({
        data: { userId: mgrUser.id, roleId: roleMap["CENTER_MANAGER"].id },
      });
    }

    // B. Counsellor
    let cnsUser = await prisma.user.findFirst({ where: { email: cfg.counsellor.email } });
    if (!cnsUser) {
      cnsUser = await prisma.user.create({
        data: {
          instituteId: institute.id,
          branchId: branch.id,
          name: cfg.counsellor.name,
          email: cfg.counsellor.email,
          phone: cfg.counsellor.phone,
          passwordHash,
        },
      });
      await prisma.userRole.create({
        data: { userId: cnsUser.id, roleId: roleMap["COUNSELLOR"].id },
      });
    }

    // C. Faculty Members
    const createdFaculty: any[] = [];
    for (const f of cfg.faculty) {
      let fUser = await prisma.user.findFirst({ where: { email: f.email } });
      if (!fUser) {
        fUser = await prisma.user.create({
          data: {
            instituteId: institute.id,
            branchId: branch.id,
            name: f.name,
            email: f.email,
            phone: f.phone,
            passwordHash,
          },
        });
        await prisma.userRole.create({
          data: { userId: fUser.id, roleId: roleMap["FACULTY"].id },
        });
      }

      let facRecord = await prisma.faculty.findFirst({ where: { userId: fUser.id } });
      if (!facRecord) {
        facRecord = await prisma.faculty.create({
          data: {
            userId: fUser.id,
            instituteId: institute.id,
            branchId: branch.id,
            employeeCode: f.code,
            specialization: f.spec,
            status: FacultyStatus.ACTIVE,
          },
        });
      }
      createdFaculty.push(facRecord);
    }

    // D. Batches
    const batchMapByCourse: Record<string, any> = {};
    for (const c of courseDefs) {
      const course = courseMap[c.code];
      const batchCode = `${c.code}-${cfg.branchCode}-01`;
      const batchName = `${course.name} - Batch 01`;
      const assignedFac = createdFaculty[Math.floor(Math.random() * createdFaculty.length)];

      let batch = await prisma.batch.findFirst({
        where: { instituteId: institute.id, code: batchCode },
      });

      if (!batch) {
        batch = await prisma.batch.create({
          data: {
            instituteId: institute.id,
            branchId: branch.id,
            courseId: course.id,
            facultyId: assignedFac.id,
            name: batchName,
            code: batchCode,
            startDate: new Date("2026-06-01"),
            expectedEndDate: new Date("2026-12-31"),
            status: BatchStatus.ACTIVE,
            capacity: 35,
            schedulePattern: "MWF",
            timeSlot: "10:00 AM - 12:00 PM",
          },
        });
      }
      batchMapByCourse[c.code] = batch;
    }

    // E. Students & Class Sessions
    for (const s of cfg.students) {
      const course = courseMap[s.course];
      const batch = batchMapByCourse[s.course];
      const assignedFaculty = createdFaculty[0];

      let sUser = await prisma.user.findFirst({ where: { email: s.email } });
      if (!sUser) {
        sUser = await prisma.user.create({
          data: {
            instituteId: institute.id,
            branchId: branch.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            passwordHash,
          },
        });
        await prisma.userRole.create({
          data: { userId: sUser.id, roleId: roleMap["STUDENT"].id },
        });
      }

      let student = await prisma.student.findFirst({ where: { userId: sUser.id } });
      if (!student) {
        student = await prisma.student.create({
          data: {
            userId: sUser.id,
            instituteId: institute.id,
            branchId: branch.id,
            studentCode: s.code,
            qualification: s.qual,
            status: s.status,
            dateOfBirth: new Date("2002-05-15"),
          },
        });
      }

      // Admission
      const adm = await prisma.admission.findFirst({ where: { studentId: student.id } });
      if (!adm) {
        await prisma.admission.create({
          data: {
            studentId: student.id,
            instituteId: institute.id,
            branchId: branch.id,
            courseId: course.id,
            batchId: batch.id,
            admissionNo: `ADM-${s.code}`,
            status: AdmissionStatus.CONFIRMED,
          },
        });
      }

      // Batch Enrollment
      const enrollment = await prisma.batchEnrollment.findFirst({
        where: { studentId: student.id, batchId: batch.id },
      });
      if (!enrollment) {
        await prisma.batchEnrollment.create({
          data: {
            studentId: student.id,
            batchId: batch.id,
            status: "ACTIVE",
          },
        });
      }

      // Create 10 Past ClassSessions and StudentAttendance
      for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - dayOffset);
        sessionDate.setHours(10, 0, 0, 0);

        let classSession = await prisma.classSession.findFirst({
          where: {
            batchId: batch.id,
            scheduledDate: {
              gte: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()),
              lt: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate() + 1),
            },
          },
        });

        if (!classSession) {
          classSession = await prisma.classSession.create({
            data: {
              batchId: batch.id,
              facultyId: assignedFaculty.id,
              branchId: branch.id,
              title: `${course.name} - Session #${11 - dayOffset}`,
              scheduledDate: sessionDate,
              startTime: "10:00 AM",
              endTime: "12:00 PM",
              roomNo: "Room 101",
              sessionStatus: "COMPLETED",
            },
          });
        }

        let attStatus = "PRESENT";
        if (s.absences > 0 && dayOffset <= s.absences) {
          attStatus = "ABSENT";
        }

        const existingAtt = await prisma.studentAttendance.findUnique({
          where: {
            classSessionId_studentId: {
              classSessionId: classSession.id,
              studentId: student.id,
            },
          },
        });

        if (!existingAtt) {
          await prisma.studentAttendance.create({
            data: {
              classSessionId: classSession.id,
              studentId: student.id,
              status: attStatus,
              remarks: attStatus === "ABSENT" ? "Unexcused Absence" : "Present in Class",
            },
          });
        }
      }
    }
  }

  console.log("✨ Comprehensive Real Branch Data Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

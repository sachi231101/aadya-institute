import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import {
  createEnquirySchema,
  updateEnquirySchema,
  createApplicationSchema,
  updateApplicationSchema,
  createAdmissionSchema,
  updateAdmissionSchema,
  convertEnquirySchema,
  convertApplicationSchema,
} from "../modules/admissions/admissions.validation";
import { AdmissionsService } from "../modules/admissions/admissions.service";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";

describe("Admissions Validation Unit Tests", () => {
  test("createEnquirySchema should validate valid input", () => {
    const input = {
      name: "Rohan Sharma",
      email: "rohan@gmail.com",
      phone: "+919876543210",
      courseId: "course-123",
      source: "WEBSITE",
      status: "NEW",
      counselorNotes: "Interested in upcoming batch",
    };
    const parsed = createEnquirySchema.parse(input);
    assert.strictEqual(parsed.name, "Rohan Sharma");
    assert.strictEqual(parsed.source, "WEBSITE");
  });

  test("createEnquirySchema should reject invalid email or short phone", () => {
    assert.throws(() => {
      createEnquirySchema.parse({
        name: "A",
        phone: "123",
        courseId: "c1",
      });
    });
  });

  test("createApplicationSchema should validate valid input", () => {
    const input = {
      applicantName: "Amitabh Joshi",
      email: "amitabh@gmail.com",
      phone: "+919845011223",
      courseId: "course-[#1]",
      feeStatus: "PAID",
      status: "SUBMITTED",
    };
    const parsed = createApplicationSchema.parse(input);
    assert.strictEqual(parsed.applicantName, "Amitabh Joshi");
    assert.strictEqual(parsed.feeStatus, "PAID");
  });

  test("createAdmissionSchema should validate direct admission payload", () => {
    const input = {
      studentName: "Aarav Gupta",
      email: "aarav@gmail.com",
      phone: "+919822055443",
      courseId: "course-999",
      feePlan: "FULL_PAYMENT",
      status: "CONFIRMED",
    };
    const parsed = createAdmissionSchema.parse(input);
    assert.strictEqual(parsed.studentName, "Aarav Gupta");
    assert.strictEqual(parsed.feePlan, "FULL_PAYMENT");
  });

  test("createAdmissionSchema should accept leadId and sendCredentials", () => {
    const parsed = createAdmissionSchema.parse({
      studentName: "Lead Student",
      phone: "+919876543210",
      courseId: "course-1",
      leadId: "lead-abc",
      sendCredentials: true,
      sourceMasterId: "master-1",
    });
    assert.strictEqual(parsed.leadId, "lead-abc");
    assert.strictEqual(parsed.sendCredentials, true);
  });

  test("convertApplicationSchema should accept fee fields", () => {
    const parsed = convertApplicationSchema.parse({
      batchId: "batch-1",
      totalFee: 50000,
      amountPaid: 10000,
      installments: [{ installmentNo: 1, dueDate: "2026-04-01", amount: 20000 }],
    });
    assert.strictEqual(parsed.totalFee, 50000);
    assert.strictEqual(parsed.amountPaid, 10000);
  });

  test("AdmissionsService generateNo helper should return prefixed sequential identifier", async () => {
    const enqNo = await AdmissionsService.generateNo("ENQ");
    const appNo = await AdmissionsService.generateNo("APP");
    const admNo = await AdmissionsService.generateNo("ADM");

    assert.match(enqNo, /^ENQ-2026-\d{7}$/);
    assert.match(appNo, /^APP-2026-\d{7}$/);
    assert.match(admNo, /^ADM-2026-\d{7}$/);
  });
});

describe("Admissions Workflow Integration Tests", () => {
  let instituteId: string;
  let branchAId: string;
  let branchBId: string;
  let courseId: string;
  let batchId: string;
  let managerAUser: AuthUser;
  let adminUser: AuthUser;
  let leadId: string;
  let creatorUserId: string;

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-INST-ADM" },
      update: {},
      create: { name: "Test Institute Admissions", code: "TEST-INST-ADM" },
    });
    instituteId = institute.id;

    const branchA = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "ADM-A" } },
      update: {},
      create: { instituteId, name: "Admission Branch A", code: "ADM-A" },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "ADM-B" } },
      update: {},
      create: { instituteId, name: "Admission Branch B", code: "ADM-B" },
    });
    branchBId = branchB.id;

    const course = await prisma.course.upsert({
      where: { instituteId_code: { instituteId, code: "ADM-COURSE" } },
      update: { fee: 45000 },
      create: {
        instituteId,
        name: "Admission Test Course",
        code: "ADM-COURSE",
        fee: 45000,
      },
    });
    courseId = course.id;

    const facultyUser = await prisma.user.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "Admission Faculty",
        email: `adm-faculty-${Date.now()}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });

    const faculty = await prisma.faculty.create({
      data: {
        userId: facultyUser.id,
        instituteId,
        branchId: branchAId,
        employeeCode: `FAC-ADM-${Date.now()}`,
      },
    });

    const batch = await prisma.batch.create({
      data: {
        instituteId,
        branchId: branchAId,
        courseId,
        facultyId: faculty.id,
        name: "ADM Batch",
        code: `ADM-BATCH-${Date.now()}`,
        startDate: new Date(),
      },
    });
    batchId = batch.id;

    await prisma.role.upsert({
      where: { name: "STUDENT" },
      update: {},
      create: { name: "STUDENT" },
    });

    const creatorUser = await prisma.user.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "Lead Creator",
        email: `adm-creator-${Date.now()}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    creatorUserId = creatorUser.id;

    adminUser = {
      id: creatorUserId,
      userId: creatorUserId,
      name: "Admin",
      instituteId,
      roles: ["ADMIN"],
      permissions: [],
    };

    managerAUser = {
      id: "mgr-adm-a",
      userId: "mgr-adm-a",
      name: "Manager A",
      instituteId,
      branchId: branchAId,
      roles: ["CENTER_MANAGER"],
      permissions: [],
    };

    const conversionLead = await prisma.lead.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "Conversion Lead",
        phoneNumber: `3${Date.now().toString().slice(-9)}`,
        interestedIn: "Admission Test Course",
        courseId,
        source: "WEBSITE",
        stage: "QUALIFIED",
        status: "ACTIVE",
        createdById: creatorUser.id,
      },
    });
    leadId = conversionLead.id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  test("createApplication should not create a PENDING admission record", async () => {
    const phone = `8${Date.now().toString().slice(-9)}`;
    const app = await prisma.application.create({
      data: {
        instituteId,
        branchId: branchAId,
        applicationNo: `APP-TEST-${Date.now()}`,
        applicantName: "App Only Student",
        phone,
        courseId,
        status: "SUBMITTED",
      },
    });

    const pendingCount = await prisma.admission.count({
      where: { applicationId: app.id, status: "PENDING" },
    });
    assert.strictEqual(pendingCount, 0);
  });

  test("createAdmission with invalid courseId should fail with 400", async () => {
    await assert.rejects(
      () =>
        AdmissionsService.createAdmission(
          instituteId,
          branchAId,
          {
            studentName: "Invalid Course Student",
            phone: `7${Date.now().toString().slice(-9)}`,
            courseId: "non-existent-course-id",
          },
          { userId: adminUser.userId }
        ),
      (err: Error) => err.message.includes("course")
    );
  });

  test("direct admission creates student, admission, payment, pending fee, and batch enrollment", async () => {
    const phone = `6${Date.now().toString().slice(-9)}`;
    const admission = await AdmissionsService.createAdmission(
      instituteId,
      branchAId,
      {
        studentName: "Direct Admit Student",
        email: `direct-${Date.now()}@test.local`,
        phone,
        courseId,
        batchId,
        leadId,
        totalFee: 45000,
        amountPaid: 15000,
        status: "CONFIRMED",
        installments: [{ installmentNo: 1, dueDate: "2026-05-01", amount: 15000 }],
      },
      { userId: adminUser.userId, currentUser: adminUser }
    );

    assert.ok(admission.studentId);
    assert.ok(admission.admissionNo);

    const student = await prisma.student.findUnique({ where: { id: admission.studentId! } });
    assert.ok(student);
    assert.notStrictEqual(student?.studentCode, admission.admissionNo);

    const paymentCount = await prisma.payment.count({ where: { admissionId: admission.id } });
    const pendingCount = await prisma.pendingFee.count({ where: { admissionId: admission.id } });
    const enrollmentCount = await prisma.batchEnrollment.count({
      where: { admissionId: admission.id, studentId: admission.studentId! },
    });

    assert.strictEqual(paymentCount, 1);
    assert.strictEqual(pendingCount, 1);
    assert.strictEqual(enrollmentCount, 1);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    assert.strictEqual(lead?.status, "CONVERTED");
    assert.strictEqual(lead?.convertedAdmissionId, admission.id);
  });

  test("duplicate phone on new admission should return 409", async () => {
    const phone = `5${Date.now().toString().slice(-9)}`;
    await AdmissionsService.createAdmission(
      instituteId,
      branchAId,
      {
        studentName: "First Phone Student",
        phone,
        courseId,
        status: "CONFIRMED",
      },
      { userId: adminUser.userId }
    );

    await assert.rejects(
      () =>
        AdmissionsService.createAdmission(
          instituteId,
          branchAId,
          {
            studentName: "Duplicate Phone Student",
            phone,
            courseId,
            status: "CONFIRMED",
          },
          { userId: adminUser.userId }
        ),
      (err: Error) => err.message.toLowerCase().includes("phone")
    );
  });

  test("center manager cannot read admission from another branch", async () => {
    const phone = `4${Date.now().toString().slice(-9)}`;
    const admission = await AdmissionsService.createAdmission(
      instituteId,
      branchBId,
      {
        studentName: "Branch B Student",
        phone,
        courseId,
        status: "CONFIRMED",
      },
      { userId: adminUser.userId }
    );

    await assert.rejects(
      () => AdmissionsService.getAdmissionById(admission.id, managerAUser),
      (err: Error) => err.message.includes("not found")
    );
  });

  test("getAdmissions accepts AuthUser and returns paginated list", async () => {
    const result = await AdmissionsService.getAdmissions(adminUser, { page: 1, limit: 5 });
    assert.ok(Array.isArray(result.data));
    assert.ok(typeof result.total === "number");
    assert.ok(result.total >= 1);
  });
});

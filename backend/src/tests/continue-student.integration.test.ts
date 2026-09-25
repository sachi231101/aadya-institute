import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import * as studentService from "../modules/students/student.service";
import * as attendanceService from "../modules/attendance/attendance.service";

const FIXTURE_CODE = "TEST-CONTINUE-RESTORE";

let instituteId: string;
let branchId: string;
let courseId: string;
let facultyId: string;
let admin: AuthUser;

const asAdmin = (): AuthUser => ({
  id: "admin-continue-restore",
  userId: "admin-continue-restore",
  name: "Continue Restore Admin",
  email: "admin@continue-restore.test",
  instituteId,
  branchId: null,
  allowedBranchIds: [],
  roles: ["ADMIN"],
  permissions: [],
});

before(async () => {
  const existing = await prisma.institute.findFirst({ where: { code: FIXTURE_CODE } });
  if (existing) {
    await prisma.classSession.deleteMany({
      where: { batch: { instituteId: existing.id } },
    });
    await prisma.institute.delete({ where: { id: existing.id } });
  }

  const institute = await prisma.institute.create({
    data: { name: "Continue Restore Integration", code: FIXTURE_CODE },
  });
  instituteId = institute.id;

  const branch = await prisma.branch.create({
    data: { instituteId, name: "Continue Branch", code: "CR-BR-1" },
  });
  branchId = branch.id;

  const course = await prisma.course.create({
    data: {
      instituteId,
      name: "Continue Course",
      code: "CR-COURSE",
      fee: 15000,
      courseBranches: { create: [{ branchId }] },
    },
  });
  courseId = course.id;

  const facultyUser = await prisma.user.create({
    data: {
      instituteId,
      branchId,
      name: "CR Faculty",
      email: "faculty@continue-restore.test",
      passwordHash: "not-used",
      status: "ACTIVE",
    },
  });
  facultyId = (
    await prisma.faculty.create({
      data: {
        userId: facultyUser.id,
        instituteId,
        branchId,
        employeeCode: "CR-FAC-1",
      },
    })
  ).id;

  admin = asAdmin();
});

after(async () => {
  if (!instituteId) return;
  await prisma.classSession.deleteMany({ where: { batch: { instituteId } } });
  await prisma.institute.deleteMany({ where: { id: instituteId } });
});

async function createStudent(label: string) {
  const user = await prisma.user.create({
    data: {
      instituteId,
      branchId,
      name: `Student ${label}`,
      email: `student-${label}@continue-restore.test`,
      passwordHash: "not-used",
      status: "ACTIVE",
    },
  });
  return prisma.student.create({
    data: {
      userId: user.id,
      instituteId,
      branchId,
      studentCode: `CR-S-${label}`,
      status: "ACTIVE",
    },
  });
}

async function createBatch(opts: {
  code: string;
  capacity: number;
  status?: "ACTIVE" | "UPCOMING" | "COMPLETED" | "CANCELLED";
}) {
  return prisma.batch.create({
    data: {
      instituteId,
      branchId,
      courseId,
      facultyId,
      name: `Batch ${opts.code}`,
      code: opts.code,
      startDate: new Date(),
      capacity: opts.capacity,
      status: opts.status ?? "ACTIVE",
    },
  });
}

async function enrollStudent(
  studentId: string,
  batchId: string,
  admissionId?: string
) {
  return prisma.batchEnrollment.create({
    data: {
      batchId,
      studentId,
      admissionId,
      status: "ACTIVE",
    },
  });
}

describe("Continue student — enrollment restore integration", () => {
  test("discontinue then continue restores enrollment when batch open and has capacity", async () => {
    const tag = `open-${Date.now()}`;
    const batch = await createBatch({ code: `CR-OPEN-${tag}`, capacity: 35 });
    const student = await createStudent(`open-${tag}`);
    const admission = await prisma.admission.create({
      data: {
        instituteId,
        branchId,
        studentId: student.id,
        courseId,
        batchId: batch.id,
        studentName: student.studentCode,
        status: "CONFIRMED",
      },
    });
    const enrollment = await enrollStudent(student.id, batch.id, admission.id);

    await studentService.discontinueStudent(
      student.id,
      { reason: "Integration test discontinue" },
      admin
    );

    const afterDiscontinue = await prisma.batchEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    assert.strictEqual(afterDiscontinue?.status, "INACTIVE");
    assert.ok(afterDiscontinue?.leftAt);

    const discontinued = await prisma.student.findUnique({ where: { id: student.id } });
    assert.strictEqual(discontinued?.status, "DISCONTINUED");

    const result = await studentService.continueStudent(student.id, {}, admin);

    assert.strictEqual(result.status, "ACTIVE");
    assert.strictEqual(result.batchRestored, true);
    assert.strictEqual(result.batchCode, batch.code);

    const afterContinue = await prisma.batchEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    assert.strictEqual(afterContinue?.status, "ACTIVE");
    assert.strictEqual(afterContinue?.leftAt, null);

    const admissionAfter = await prisma.admission.findUnique({
      where: { id: admission.id },
    });
    assert.strictEqual(admissionAfter?.batchId, batch.id);
  });

  test("restored ACTIVE enrollment appears on class-session attendance roster", async () => {
    const tag = `roster-${Date.now()}`;
    const batch = await createBatch({ code: `CR-ROSTER-${tag}`, capacity: 35 });
    const student = await createStudent(`roster-${tag}`);
    const admission = await prisma.admission.create({
      data: {
        instituteId,
        branchId,
        studentId: student.id,
        courseId,
        batchId: batch.id,
        studentName: student.studentCode,
        status: "CONFIRMED",
      },
    });
    await enrollStudent(student.id, batch.id, admission.id);

    const classSession = await prisma.classSession.create({
      data: {
        batchId: batch.id,
        facultyId,
        branchId,
        title: "Theory roster check",
        scheduledDate: new Date(Date.UTC(2026, 2, 10)),
        startTime: "10:00",
        endTime: "12:00",
        sessionType: "THEORY",
        sessionStatus: "UPCOMING",
        status: "ACTIVE",
      },
    });

    const rosterWhileActive = await attendanceService.getSessionAttendance(
      admin,
      classSession.id
    );
    assert.ok(
      rosterWhileActive.students.some((s) => s.studentId === student.id),
      "ACTIVE enrollment should be on session roster"
    );

    await studentService.discontinueStudent(
      student.id,
      { reason: "Roster integration discontinue" },
      admin
    );

    const rosterWhileDiscontinued = await attendanceService.getSessionAttendance(
      admin,
      classSession.id
    );
    assert.strictEqual(
      rosterWhileDiscontinued.students.some((s) => s.studentId === student.id),
      false,
      "INACTIVE enrollment must not appear on session roster"
    );

    await studentService.continueStudent(student.id, {}, admin);

    const rosterAfterRestore = await attendanceService.getSessionAttendance(
      admin,
      classSession.id
    );
    assert.ok(
      rosterAfterRestore.students.some((s) => s.studentId === student.id),
      "Restored ACTIVE enrollment should reappear on session roster"
    );
  });

  test("continue rejects CENTER_MANAGER and COUNSELLOR with 403", async () => {
    const tag = `role-${Date.now()}`;
    const batch = await createBatch({ code: `CR-ROLE-${tag}`, capacity: 35 });
    const student = await createStudent(`role-${tag}`);
    await enrollStudent(student.id, batch.id);
    await studentService.discontinueStudent(
      student.id,
      { reason: "Role guard test" },
      admin
    );

    const centerManager: AuthUser = {
      ...admin,
      id: "cm-continue-deny",
      userId: "cm-continue-deny",
      roles: ["CENTER_MANAGER"],
      branchId,
      allowedBranchIds: [branchId],
    };
    const counsellor: AuthUser = {
      ...admin,
      id: "counsellor-continue-deny",
      userId: "counsellor-continue-deny",
      roles: ["COUNSELLOR"],
      branchId,
      allowedBranchIds: [branchId],
    };

    for (const actor of [centerManager, counsellor]) {
      await assert.rejects(
        () => studentService.continueStudent(student.id, {}, actor),
        (err: Error & { statusCode?: number }) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(
            err.message,
            /Only administrators can continue a discontinued student/
          );
          return true;
        }
      );
    }

    const stillDiscontinued = await prisma.student.findUnique({
      where: { id: student.id },
    });
    assert.strictEqual(stillDiscontinued?.status, "DISCONTINUED");
  });

  test("continue does not restore when batch is at capacity", async () => {
    const tag = `full-${Date.now()}`;
    const batch = await createBatch({ code: `CR-FULL-${tag}`, capacity: 1 });
    const discontinuedStudent = await createStudent(`full-d-${tag}`);
    const fillerStudent = await createStudent(`full-f-${tag}`);

    const dAdmission = await prisma.admission.create({
      data: {
        instituteId,
        branchId,
        studentId: discontinuedStudent.id,
        courseId,
        batchId: batch.id,
        studentName: discontinuedStudent.studentCode,
        status: "CONFIRMED",
      },
    });
    const dEnrollment = await enrollStudent(
      discontinuedStudent.id,
      batch.id,
      dAdmission.id
    );

    await studentService.discontinueStudent(
      discontinuedStudent.id,
      { reason: "Left temporarily for capacity test" },
      admin
    );

    await enrollStudent(fillerStudent.id, batch.id);

    const activeOnBatch = await prisma.batchEnrollment.count({
      where: { batchId: batch.id, status: "ACTIVE" },
    });
    assert.strictEqual(activeOnBatch, 1);

    const result = await studentService.continueStudent(
      discontinuedStudent.id,
      {},
      admin
    );

    assert.strictEqual(result.status, "ACTIVE");
    assert.strictEqual(result.batchRestored, false);
    assert.strictEqual(result.batchCode, undefined);

    const enrollmentAfter = await prisma.batchEnrollment.findUnique({
      where: { id: dEnrollment.id },
    });
    assert.strictEqual(enrollmentAfter?.status, "INACTIVE");
  });

  test("continue does not restore when batch is COMPLETED", async () => {
    const tag = `done-${Date.now()}`;
    const batch = await createBatch({ code: `CR-DONE-${tag}`, capacity: 35 });
    const student = await createStudent(`done-${tag}`);
    const admission = await prisma.admission.create({
      data: {
        instituteId,
        branchId,
        studentId: student.id,
        courseId,
        batchId: batch.id,
        studentName: student.studentCode,
        status: "CONFIRMED",
      },
    });
    const enrollment = await enrollStudent(student.id, batch.id, admission.id);

    await studentService.discontinueStudent(
      student.id,
      { reason: "Batch will complete before rejoin" },
      admin
    );

    await prisma.batch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED" },
    });

    const result = await studentService.continueStudent(student.id, {}, admin);

    assert.strictEqual(result.status, "ACTIVE");
    assert.strictEqual(result.batchRestored, false);
    assert.strictEqual(result.batchCode, undefined);

    const enrollmentAfter = await prisma.batchEnrollment.findUnique({
      where: { id: enrollment.id },
    });
    assert.strictEqual(enrollmentAfter?.status, "INACTIVE");
  });
});

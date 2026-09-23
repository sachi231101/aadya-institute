import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import * as studentService from "../modules/students/student.service";
import * as allocationService from "../modules/students/student-allocation.service";
import { getDiscontinuationRisk } from "../modules/attendance/attendance.service";
import * as batchService from "../modules/batches/batch.service";
import { AppError } from "../middlewares/error.middleware";

const fixtureCode = "TEST-CM-COUNS-STU-BRANCH";

let instituteId: string;
let branchAId: string;
let branchBId: string;
let courseId: string;
let facultyAId: string;
let studentAId: string;
let studentBId: string;
let batchAId: string;
let batchBId: string;
let managerA: AuthUser;
let counsellorA: AuthUser;
let multiManager: AuthUser;
let admin: AuthUser;

const asUser = (
  id: string,
  roles: string[],
  branchId: string | null,
  allowedBranchIds: string[] = []
): AuthUser => ({
  id,
  userId: id,
  name: roles[0] || "User",
  email: `${id}@${fixtureCode.toLowerCase()}.test`,
  instituteId,
  branchId,
  allowedBranchIds,
  roles,
  permissions: [],
});

before(async () => {
  const existing = await prisma.institute.findFirst({ where: { code: fixtureCode } });
  if (existing) {
    await prisma.studentAttendance.deleteMany({
      where: { student: { instituteId: existing.id } },
    });
    await prisma.classSession.deleteMany({
      where: { batch: { instituteId: existing.id } },
    });
    await prisma.institute.delete({ where: { id: existing.id } });
  }

  const institute = await prisma.institute.create({
    data: { name: "CM Counsellor Student Branch Isolation", code: fixtureCode },
  });
  instituteId = institute.id;

  const [branchA, branchB] = await Promise.all([
    prisma.branch.create({
      data: { instituteId, name: "Branch A", code: "ISO-BR-A" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "Branch B", code: "ISO-BR-B" },
    }),
  ]);
  branchAId = branchA.id;
  branchBId = branchB.id;

  const course = await prisma.course.create({
    data: {
      instituteId,
      name: "Isolation Course",
      code: "ISO-COURSE",
      fee: 10000,
      courseBranches: {
        create: [{ branchId: branchAId }, { branchId: branchBId }],
      },
    },
  });
  courseId = course.id;

  const facultyUser = await prisma.user.create({
    data: {
      instituteId,
      branchId: branchAId,
      name: "ISO Faculty",
      email: "faculty@iso-stu-branch.test",
      passwordHash: "not-used",
      status: "ACTIVE",
    },
  });
  facultyAId = (
    await prisma.faculty.create({
      data: {
        userId: facultyUser.id,
        instituteId,
        branchId: branchAId,
        employeeCode: "ISO-FAC-A",
      },
    })
  ).id;

  const makeStudent = async (branchId: string, label: string) => {
    const user = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: `Student ${label}`,
        email: `student-${label.toLowerCase()}@iso-stu-branch.test`,
        passwordHash: "not-used",
        status: "ACTIVE",
      },
    });
    return prisma.student.create({
      data: {
        userId: user.id,
        instituteId,
        branchId,
        studentCode: `ISO-S-${label}`,
        status: "ACTIVE",
      },
    });
  };

  const studentA = await makeStudent(branchAId, "A");
  const studentB = await makeStudent(branchBId, "B");
  studentAId = studentA.id;
  studentBId = studentB.id;

  const startDate = new Date();
  const makeBatch = async (branchId: string, code: string) =>
    prisma.batch.create({
      data: {
        instituteId,
        branchId,
        courseId,
        facultyId: facultyAId,
        name: `Batch ${code}`,
        code: `ISO-${code}`,
        startDate,
        status: "ACTIVE",
        capacity: 35,
      },
    });

  const batchA = await makeBatch(branchAId, "BA");
  const batchB = await makeBatch(branchBId, "BB");
  batchAId = batchA.id;
  batchBId = batchB.id;

  // Put both students at discontinuation risk via 3 consecutive THEORY absences
  const makeAbsences = async (studentId: string, branchId: string, batchId: string) => {
    for (let i = 0; i < 3; i++) {
      const session = await prisma.classSession.create({
        data: {
          batchId,
          facultyId: facultyAId,
          branchId,
          title: `Theory ${i + 1}`,
          scheduledDate: new Date(Date.UTC(2026, 0, 5 + i * 2)),
          startTime: "10:00",
          endTime: "12:00",
          sessionType: "THEORY",
          sessionStatus: "COMPLETED",
          status: "ACTIVE",
        },
      });
      await prisma.studentAttendance.create({
        data: {
          classSessionId: session.id,
          studentId,
          status: "ABSENT",
        },
      });
    }
  };

  await makeAbsences(studentAId, branchAId, batchAId);
  await makeAbsences(studentBId, branchBId, batchBId);

  admin = asUser("admin-iso", ["ADMIN"], null);
  managerA = asUser("cm-a-iso", ["CENTER_MANAGER"], branchAId, [branchAId]);
  counsellorA = asUser("couns-a-iso", ["COUNSELLOR"], branchAId, [branchAId]);
  multiManager = asUser("cm-multi-iso", ["CENTER_MANAGER"], branchAId, [
    branchAId,
    branchBId,
  ]);
});

after(async () => {
  if (!instituteId) return;
  await prisma.studentAttendance.deleteMany({
    where: { student: { instituteId } },
  });
  await prisma.classSession.deleteMany({
    where: { batch: { instituteId } },
  });
  await prisma.institute.deleteMany({ where: { id: instituteId } });
});

describe("CM/Counsellor student list branch isolation", () => {
  test("CENTER_MANAGER lists only own-branch students", async () => {
    const { data } = await studentService.getAllStudents(managerA, {
      page: 1,
      limit: 50,
    });
    const ids = data.map((s: { id: string }) => s.id);
    assert.ok(ids.includes(studentAId));
    assert.ok(!ids.includes(studentBId));
  });

  test("COUNSELLOR lists only own-branch students", async () => {
    const { data } = await studentService.getAllStudents(counsellorA, {
      page: 1,
      limit: 50,
    });
    const ids = data.map((s: { id: string }) => s.id);
    assert.ok(ids.includes(studentAId));
    assert.ok(!ids.includes(studentBId));
  });

  test("spoofed branchId query is ignored for CENTER_MANAGER", async () => {
    const { data } = await studentService.getAllStudents(managerA, {
      page: 1,
      limit: 50,
      branchId: branchBId,
    });
    const ids = data.map((s: { id: string }) => s.id);
    assert.ok(ids.includes(studentAId));
    assert.ok(!ids.includes(studentBId));
  });

  test("spoofed branchId query is ignored for COUNSELLOR", async () => {
    const { data } = await studentService.getAllStudents(counsellorA, {
      page: 1,
      limit: 50,
      branchId: branchBId,
    });
    const ids = data.map((s: { id: string }) => s.id);
    assert.ok(ids.includes(studentAId));
    assert.ok(!ids.includes(studentBId));
  });

  test("multi-branch CM with branchIds sees both allowed branches", async () => {
    const { data } = await studentService.getAllStudents(multiManager, {
      page: 1,
      limit: 50,
    });
    const ids = data.map((s: { id: string }) => s.id);
    assert.ok(ids.includes(studentAId));
    assert.ok(ids.includes(studentBId));
  });

  test("ADMIN without branchId still lists institute-wide students", async () => {
    const { data } = await studentService.getAllStudents(admin, {
      page: 1,
      limit: 50,
    });
    const ids = data.map((s: { id: string }) => s.id);
    assert.ok(ids.includes(studentAId));
    assert.ok(ids.includes(studentBId));
  });
});

describe("CM/Counsellor student detail isolation", () => {
  test("cross-branch student GET returns 404 for CENTER_MANAGER", async () => {
    await assert.rejects(
      () => studentService.getStudentById(studentBId, managerA),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test("cross-branch student GET returns 404 for COUNSELLOR", async () => {
    await assert.rejects(
      () => studentService.getStudentById(studentBId, counsellorA),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test("same-branch student GET succeeds for COUNSELLOR", async () => {
    const student = await studentService.getStudentById(studentAId, counsellorA);
    assert.strictEqual(student.id, studentAId);
  });
});

describe("CM/Counsellor discontinuation risk isolation", () => {
  test("CENTER_MANAGER risk list excludes other-branch students", async () => {
    const risk = await getDiscontinuationRisk(managerA, {});
    const ids = risk.map((r) => r.id as string);
    assert.ok(ids.includes(studentAId));
    assert.ok(!ids.includes(studentBId));
  });

  test("COUNSELLOR risk list excludes other-branch students", async () => {
    const risk = await getDiscontinuationRisk(counsellorA, {});
    const ids = risk.map((r) => r.id as string);
    assert.ok(ids.includes(studentAId));
    assert.ok(!ids.includes(studentBId));
  });

  test("spoofed branchId does not reveal other-branch risk for COUNSELLOR", async () => {
    const risk = await getDiscontinuationRisk(counsellorA, { branchId: branchBId });
    const ids = risk.map((r) => r.id as string);
    assert.ok(ids.includes(studentAId));
    assert.ok(!ids.includes(studentBId));
  });

  test("multi-branch CM risk list includes both allowed branches", async () => {
    const risk = await getDiscontinuationRisk(multiManager, {});
    const ids = risk.map((r) => r.id as string);
    assert.ok(ids.includes(studentAId));
    assert.ok(ids.includes(studentBId));
  });

  test("ADMIN without branchId still sees institute-wide risk", async () => {
    const risk = await getDiscontinuationRisk(admin, {});
    const ids = risk.map((r) => r.id as string);
    assert.ok(ids.includes(studentAId));
    assert.ok(ids.includes(studentBId));
  });
});

describe("CM/Counsellor allocation enroll isolation", () => {
  test("cross-branch enroll returns 404 for CENTER_MANAGER", async () => {
    await assert.rejects(
      () =>
        allocationService.assignStudentToBatch(
          batchBId,
          studentBId,
          instituteId,
          managerA
        ),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test("same-branch enroll succeeds for COUNSELLOR", async () => {
    const enrollment = await allocationService.assignStudentToBatch(
      batchAId,
      studentAId,
      instituteId,
      counsellorA
    );
    assert.strictEqual(enrollment.batchId, batchAId);
    assert.strictEqual(enrollment.studentId, studentAId);
  });

  test("cross-branch remove returns 404 for CENTER_MANAGER", async () => {
    await assert.rejects(
      () =>
        allocationService.removeStudentFromBatch(
          batchBId,
          studentBId,
          instituteId,
          managerA
        ),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });
});

describe("CM/Counsellor batch list branch isolation", () => {
  test("CENTER_MANAGER batch list excludes other-branch batches", async () => {
    const batches = await batchService.getBatches(managerA, {});
    const ids = batches.map((b) => b.id);
    assert.ok(ids.includes(batchAId));
    assert.ok(!ids.includes(batchBId));
  });

  test("multi-branch scope uses branchIds IN filter", async () => {
    const batches = await batchService.getBatches(multiManager, {});
    const ids = batches.map((b) => b.id);
    assert.ok(ids.includes(batchAId));
    assert.ok(ids.includes(batchBId));
  });
});

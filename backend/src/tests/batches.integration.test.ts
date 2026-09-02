import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import * as batchService from "../modules/batches/batch.service";
import * as allocationService from "../modules/students/student-allocation.service";
import * as facultyAllocation from "../modules/faculty/faculty-allocation.service";
import { batchIncludesCourse } from "../utils/batch-course.util";
import type { AuthUser } from "../modules/auth/auth.types";

describe("Multi-course batch integration", () => {
  let instituteId: string;
  let branchId: string;
  let course1Id: string;
  let course2Id: string;
  let courseOtherId: string;
  let faculty1Id: string;
  let faculty2Id: string;
  let batchId: string;
  let studentId: string;
  let admissionSecondaryId: string;
  let admissionOtherId: string;
  const tag = Date.now();

  const adminUser = (): AuthUser => ({
    id: "test-admin",
    instituteId,
    branchId,
    roles: ["ADMIN"],
    permissions: [],
    email: `admin-${tag}@test.local`,
    name: "Test Admin",
  });

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-MCBATCH" },
      update: {},
      create: { name: "Multi-Course Batch Test Institute", code: "TEST-MCBATCH" },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "MCB-A" } },
      update: {},
      create: { instituteId, name: "MCB Branch", code: "MCB-A" },
    });
    branchId = branch.id;

    const course1 = await prisma.course.create({
      data: { instituteId, name: "Python Programming", code: `PY-${tag}`, fee: 25000 },
    });
    course1Id = course1.id;

    const course2 = await prisma.course.create({
      data: { instituteId, name: "Django Web", code: `DJ-${tag}`, fee: 30000 },
    });
    course2Id = course2.id;

    const courseOther = await prisma.course.create({
      data: { instituteId, name: "Unrelated Course", code: `XX-${tag}`, fee: 10000 },
    });
    courseOtherId = courseOther.id;

    const facultyUser1 = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Faculty Python",
        email: `mcb-f1-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    faculty1Id = (
      await prisma.faculty.create({
        data: {
          userId: facultyUser1.id,
          instituteId,
          branchId,
          employeeCode: `MCB-F1-${tag}`,
        },
      })
    ).id;

    const facultyUser2 = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Faculty Django",
        email: `mcb-f2-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    faculty2Id = (
      await prisma.faculty.create({
        data: {
          userId: facultyUser2.id,
          instituteId,
          branchId,
          employeeCode: `MCB-F2-${tag}`,
        },
      })
    ).id;

    const studentUser = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "MCB Student",
        email: `mcb-s1-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    studentId = (
      await prisma.student.create({
        data: {
          userId: studentUser.id,
          instituteId,
          branchId,
          studentCode: `MCB-S-${tag}`,
        },
      })
    ).id;

    admissionSecondaryId = (
      await prisma.admission.create({
        data: {
          instituteId,
          branchId,
          studentId,
          courseId: course2Id,
          studentName: "MCB Student",
          status: "CONFIRMED",
        },
      })
    ).id;

    admissionOtherId = (
      await prisma.admission.create({
        data: {
          instituteId,
          branchId,
          studentId,
          courseId: courseOtherId,
          studentName: "MCB Student Other",
          status: "CONFIRMED",
        },
      })
    ).id;
  });

  after(async () => {
    if (batchId) {
      await prisma.batchEnrollment.deleteMany({ where: { batchId } });
      await prisma.batchCourse.deleteMany({ where: { batchId } });
      await prisma.batch.deleteMany({ where: { id: batchId } });
    }
    await prisma.admission.deleteMany({
      where: { id: { in: [admissionSecondaryId, admissionOtherId].filter(Boolean) } },
    });
    if (studentId) {
      await prisma.student.deleteMany({ where: { id: studentId } });
    }
    await prisma.faculty.deleteMany({
      where: { employeeCode: { in: [`MCB-F1-${tag}`, `MCB-F2-${tag}`] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            `mcb-f1-${tag}@test.local`,
            `mcb-f2-${tag}@test.local`,
            `mcb-s1-${tag}@test.local`,
          ],
        },
      },
    });
    await prisma.course.deleteMany({
      where: { code: { in: [`PY-${tag}`, `DJ-${tag}`, `XX-${tag}`] } },
    });
  });

  test("creates batch with multiple BatchCourse rows and per-subject faculty", async () => {
    const batch = await batchService.createBatch(instituteId, branchId, {
      name: "Full Stack Cohort",
      code: `MCB-${tag}`,
      courseId: course1Id,
      facultyId: faculty1Id,
      branchId,
      capacity: 30,
      startDate: new Date().toISOString().slice(0, 10),
      schedulePattern: "MWF",
      courses: [
        { courseId: course1Id, facultyId: faculty1Id, sequence: 1 },
        { courseId: course2Id, facultyId: faculty2Id, sequence: 2 },
      ],
    });

    batchId = batch.id;

    assert.strictEqual(batch.batchCourses?.length, 2);
    assert.strictEqual(batch.batchCourses?.[0]?.courseId, course1Id);
    assert.strictEqual(batch.batchCourses?.[1]?.courseId, course2Id);
    assert.strictEqual(batch.batchCourses?.[0]?.facultyId, faculty1Id);
    assert.strictEqual(batch.batchCourses?.[1]?.facultyId, faculty2Id);
  });

  test("finds batch when filtering by secondary course", async () => {
    const listed = await batchService.getBatches(instituteId, branchId, {
      courseId: course2Id,
    });
    assert.ok(listed.some((b) => b.id === batchId));
  });

  test("batchIncludesCourse recognizes both primary and junction courses", async () => {
    const batch = await batchService.getBatchById(batchId, instituteId);
    assert.strictEqual(batchIncludesCourse(batch, course1Id), true);
    assert.strictEqual(batchIncludesCourse(batch, course2Id), true);
    assert.strictEqual(batchIncludesCourse(batch, "nonexistent"), false);
  });

  test("enrolls student whose admission course is a secondary batch subject", async () => {
    const enrollment = await allocationService.assignStudentToBatch(
      batchId,
      studentId,
      instituteId,
      admissionSecondaryId
    );
    assert.strictEqual(enrollment.batchId, batchId);
    assert.strictEqual(enrollment.studentId, studentId);
    assert.strictEqual(enrollment.status, "ACTIVE");
  });

  test("rejects enrollment when admission course is not in batch subjects", async () => {
    await assert.rejects(
      () =>
        allocationService.assignStudentToBatch(
          batchId,
          studentId,
          instituteId,
          admissionOtherId
        ),
      (err: Error & { statusCode?: number }) => {
        assert.match(err.message, /not offered in this batch/i);
        return true;
      }
    );
  });

  test("assigns faculty to a specific subject without clearing other subject faculty", async () => {
    await facultyAllocation.assignFacultyToBatch(
      adminUser(),
      batchId,
      faculty1Id,
      course2Id
    );

    const rows = await prisma.batchCourse.findMany({
      where: { batchId },
      orderBy: { sequence: "asc" },
    });
    const py = rows.find((r) => r.courseId === course1Id);
    const dj = rows.find((r) => r.courseId === course2Id);
    assert.ok(py);
    assert.ok(dj);
    assert.strictEqual(dj?.facultyId, faculty1Id);
    // Primary subject faculty should remain unless reassigned
    assert.strictEqual(py?.facultyId, faculty1Id);
  });

  test("updates batch courses and syncs BatchCourse rows", async () => {
    await batchService.updateBatch(batchId, instituteId, {
      courses: [{ courseId: course2Id, facultyId: faculty2Id, sequence: 1 }],
      courseId: course2Id,
    });

    const updated = await batchService.getBatchById(batchId, instituteId);
    assert.strictEqual(updated.batchCourses?.length, 1);
    assert.strictEqual(updated.batchCourses?.[0]?.courseId, course2Id);
    assert.strictEqual(updated.courseId, course2Id);
  });
});

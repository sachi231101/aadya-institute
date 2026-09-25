import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import * as courseService from "../modules/courses/course.service";
import * as batchService from "../modules/batches/batch.service";
import * as assignmentService from "../modules/assignments/assignment.service";
import { AppError } from "../middlewares/error.middleware";

const fixtureCode = "TEST-ASSIGN-BRANCH-ISO";
const tag = Date.now();

let instituteId: string;
let branchAId: string;
let branchBId: string;
let courseABId: string;
let batchAId: string;
let batchBId: string;
let facultyHomeAId: string;
let facultyHomeAUserId: string;
let academicYearMasterId: string;
let studentBId: string;
let admin: AuthUser;
let managerA: AuthUser;
let managerNoScope: AuthUser;
let multiManager: AuthUser;
let facultyUser: AuthUser;
let facultyNoTeachUser: AuthUser;

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

const futureDue = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString();
};

const cleanupInstitute = async (id: string) => {
  const leftoverBatches = await prisma.batch.findMany({
    where: { instituteId: id },
    select: { id: true },
  });
  const batchIds = leftoverBatches.map((b) => b.id);
  const assignments = await prisma.assignment.findMany({
    where: { batch: { instituteId: id } },
    select: { id: true },
  });
  const assignmentIds = assignments.map((a) => a.id);
  if (assignmentIds.length) {
    await prisma.assignmentSubmission.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
    await prisma.assignmentRecipient.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
    await prisma.assignmentTarget.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
    await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
  }
  if (batchIds.length) {
    await prisma.batchEnrollment.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.classSession.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchSchedule.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchModule.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchCourse.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  }
  await prisma.faculty.deleteMany({ where: { instituteId: id } });
  await prisma.student.deleteMany({ where: { instituteId: id } });
  await prisma.user.deleteMany({ where: { instituteId: id } });
  await prisma.masterRecord.deleteMany({ where: { instituteId: id } });
  await prisma.course.deleteMany({ where: { instituteId: id } });
  await prisma.branch.deleteMany({ where: { instituteId: id } });
  await prisma.institute.deleteMany({ where: { id } });
};

before(async () => {
  const existing = await prisma.institute.findFirst({ where: { code: fixtureCode } });
  if (existing) {
    await cleanupInstitute(existing.id);
  }

  const institute = await prisma.institute.create({
    data: { name: "Assignment Branch Isolation", code: fixtureCode },
  });
  instituteId = institute.id;

  const [branchA, branchB] = await Promise.all([
    prisma.branch.create({
      data: { instituteId, name: "Branch A", code: "ABI-A", status: "ACTIVE" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "Branch B", code: "ABI-B", status: "ACTIVE" },
    }),
  ]);
  branchAId = branchA.id;
  branchBId = branchB.id;

  admin = asUser("admin-abi", ["ADMIN"], null);
  managerA = asUser("cm-a-abi", ["CENTER_MANAGER"], branchAId, [branchAId]);
  managerNoScope = asUser("cm-noscope-abi", ["CENTER_MANAGER"], null, []);
  multiManager = asUser("cm-multi-abi", ["CENTER_MANAGER"], branchAId, [
    branchAId,
    branchBId,
  ]);

  const year = await prisma.masterRecord.create({
    data: {
      instituteId,
      entityType: "academicyear",
      name: `ABI Year ${tag}`,
      code: `ABI-Y-${tag}`,
      status: "ACTIVE",
    },
  });
  academicYearMasterId = year.id;

  const courseAB = await courseService.createCourse(admin, {
    name: "Shared A+B Course",
    code: `ABI-AB-${tag}`,
    fee: 12000,
    branchIds: [branchAId, branchBId],
  });
  courseABId = courseAB.id;

  const mkFaculty = async (label: string, branchId: string) => {
    const user = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: `Faculty ${label}`,
        email: `faculty-${label.toLowerCase()}-${tag}@abi.test`,
        passwordHash: "not-used",
        status: "ACTIVE",
      },
    });
    const faculty = await prisma.faculty.create({
      data: {
        userId: user.id,
        instituteId,
        branchId,
        employeeCode: `ABI-F-${label}-${tag}`,
        status: "ACTIVE",
      },
    });
    return { userId: user.id, facultyId: faculty.id };
  };

  const facA = await mkFaculty("A", branchAId);
  facultyHomeAId = facA.facultyId;
  facultyHomeAUserId = facA.userId;
  facultyUser = asUser(facultyHomeAUserId, ["FACULTY"], branchAId);

  const facNoTeach = await mkFaculty("NT", branchAId);
  facultyNoTeachUser = asUser(facNoTeach.userId, ["FACULTY"], branchAId);

  const startDate = new Date().toISOString().slice(0, 10);
  const batchA = await batchService.createBatch(admin, {
    name: "Batch A",
    code: `ABI-BA-${tag}`,
    branchId: branchAId,
    courseId: courseABId,
    facultyId: facultyHomeAId,
    capacity: 20,
    startDate,
    courses: [{ courseId: courseABId, sequence: 1, facultyId: facultyHomeAId }],
  });
  batchAId = batchA.id;

  // Faculty A also teaches Batch B on another branch (teaching desk, not home branch)
  const batchB = await batchService.createBatch(admin, {
    name: "Batch B",
    code: `ABI-BB-${tag}`,
    branchId: branchBId,
    courseId: courseABId,
    facultyId: facultyHomeAId,
    capacity: 20,
    startDate,
    courses: [{ courseId: courseABId, sequence: 1, facultyId: facultyHomeAId }],
  });
  batchBId = batchB.id;

  const studentUser = await prisma.user.create({
    data: {
      instituteId,
      branchId: branchBId,
      name: "Student B",
      email: `student-b-${tag}@abi.test`,
      passwordHash: "not-used",
      status: "ACTIVE",
    },
  });
  const studentB = await prisma.student.create({
    data: {
      userId: studentUser.id,
      instituteId,
      branchId: branchBId,
      studentCode: `ABI-SB-${tag}`,
      status: "ACTIVE",
    },
  });
  studentBId = studentB.id;
  await prisma.batchEnrollment.create({
    data: { batchId: batchBId, studentId: studentBId, status: "ACTIVE" },
  });
});

after(async () => {
  if (!instituteId) return;
  await cleanupInstitute(instituteId);
});

describe("Assignment branch isolation", () => {
  test("CM of Branch A cannot create a target on Branch B", async () => {
    await assert.rejects(
      () =>
        assignmentService.createAssignment(managerA, {
          title: "CM cross-branch deny",
          dueDate: futureDue(),
          academicYearMasterId,
          facultyId: facultyHomeAId,
          targets: [{ courseId: courseABId, batchId: batchBId }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 404 &&
        err.message === "Batch not found"
    );
  });

  test("CM with allowedBranchIds A+B can target both; CM with only A cannot", async () => {
    const created = await assignmentService.createAssignment(multiManager, {
      title: "Multi-branch allow",
      dueDate: futureDue(),
      academicYearMasterId,
      facultyId: facultyHomeAId,
      targets: [
        { courseId: courseABId, batchId: batchAId },
        { courseId: courseABId, batchId: batchBId },
      ],
    });
    assert.ok(created.id);
    assert.equal(created.targets?.length, 2);

    await assert.rejects(
      () =>
        assignmentService.createAssignment(managerA, {
          title: "Only A cannot add B",
          dueDate: futureDue(),
          academicYearMasterId,
          facultyId: facultyHomeAId,
          targets: [
            { courseId: courseABId, batchId: batchAId },
            { courseId: courseABId, batchId: batchBId },
          ],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 404 &&
        err.message === "Batch not found"
    );

    await assignmentService.deleteAssignment(admin, created.id);
  });

  test("CM with no branch assignment gets empty list and rejected create", async () => {
    const listed = await assignmentService.getAssignments(managerNoScope, {
      page: 1,
      limit: 20,
    });
    assert.equal(listed.data.length, 0);

    await assert.rejects(
      () =>
        assignmentService.createAssignment(managerNoScope, {
          title: "Empty scope create",
          dueDate: futureDue(),
          academicYearMasterId,
          facultyId: facultyHomeAId,
          targets: [{ courseId: courseABId, batchId: batchAId }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 403 &&
        /branch assignment required/i.test(err.message)
    );
  });

  test("CM cannot grade or download a Branch B submission", async () => {
    const assignment = await assignmentService.createAssignment(admin, {
      title: "Grade isolation",
      dueDate: futureDue(),
      academicYearMasterId,
      facultyId: facultyHomeAId,
      targets: [{ courseId: courseABId, batchId: batchBId }],
    });

    const fileKey = `assignments/abi-test-${tag}.pdf`;
    const submission = await prisma.assignmentSubmission.update({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: studentBId,
        },
      },
      data: {
        submittedAt: new Date(),
        submissionStatus: "SUBMITTED",
        fileKey,
        fileName: "work.pdf",
      },
    });

    const uploadsDir = process.env.LOCAL_UPLOADS_DIR || "./uploads";
    const filePath = path.join(uploadsDir, fileKey);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "test");

    await assert.rejects(
      () =>
        assignmentService.gradeSubmission(managerA, submission.id, {
          marks: 10,
          feedback: "nope",
        }),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    await assert.rejects(
      () => assignmentService.getSubmissionDownload(managerA, submission.id),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
    await assignmentService.deleteAssignment(admin, assignment.id);
  });

  test("Faculty can target a batch they teach on another branch, and cannot target one they do not", async () => {
    const onOtherBranch = await assignmentService.createAssignment(facultyUser, {
      title: "Faculty teaching desk B",
      dueDate: futureDue(),
      academicYearMasterId,
      targets: [{ courseId: courseABId, batchId: batchBId }],
    });
    assert.ok(onOtherBranch.id);
    assert.equal(onOtherBranch.facultyId, facultyHomeAId);
    await assignmentService.deleteAssignment(admin, onOtherBranch.id);

    await assert.rejects(
      () =>
        assignmentService.createAssignment(facultyNoTeachUser, {
          title: "Faculty does not teach B",
          dueDate: futureDue(),
          academicYearMasterId,
          targets: [{ courseId: courseABId, batchId: batchBId }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        (err.statusCode === 400 || err.statusCode === 403)
    );
  });

  test("Admin create for another branch still succeeds", async () => {
    const created = await assignmentService.createAssignment(admin, {
      title: "Admin other branch",
      dueDate: futureDue(),
      academicYearMasterId,
      facultyId: facultyHomeAId,
      targets: [{ courseId: courseABId, batchId: batchBId }],
    });
    assert.ok(created.id);
    assert.equal(created.batchId, batchBId);

    const listedA = await assignmentService.getAssignments(managerA, {
      page: 1,
      limit: 50,
    });
    assert.ok(!listedA.data.some((a) => a.id === created.id));

    await assignmentService.deleteAssignment(admin, created.id);
  });

  test("CM can update targets only within scope", async () => {
    const created = await assignmentService.createAssignment(managerA, {
      title: "CM update scope",
      dueDate: futureDue(),
      academicYearMasterId,
      facultyId: facultyHomeAId,
      targets: [{ courseId: courseABId, batchId: batchAId }],
    });

    await assert.rejects(
      () =>
        assignmentService.updateAssignment(managerA, created.id, {
          targets: [{ courseId: courseABId, batchId: batchBId }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 404 &&
        err.message === "Batch not found"
    );

    await assignmentService.deleteAssignment(admin, created.id);
  });
});

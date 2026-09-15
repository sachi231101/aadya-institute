import { test, describe, before } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import {
  assertFacultyCanAccessStudent,
  assertFacultyOwnsBatch,
  facultyTeachingBatchWhere,
  getFacultyTeachingBatchIds,
  getFacultyTeachingStudentIds,
  isPureFaculty,
} from "../utils/auth-user.util";
import type { AuthUser } from "../modules/auth/auth.types";
import { StudyMaterialService } from "../modules/study-materials/study-material.service";
import { AnnouncementService } from "../modules/announcements/announcement.service";
import { getMyStudentAttendance } from "../modules/faculty/faculty.service";
import { AppError } from "../middlewares/error.middleware";
import * as studentService from "../modules/students/student.service";

const asFacultyUser = (
  userId: string,
  instituteId: string,
  branchId?: string | null
): AuthUser => ({
  id: userId,
  userId,
  name: "Faculty",
  instituteId,
  branchId: branchId ?? undefined,
  allowedBranchIds: branchId ? [branchId] : [],
  roles: ["FACULTY"],
  permissions: [],
});

describe("Faculty teaching-desk helpers", () => {
  test("isPureFaculty requires FACULTY without admin/manager/counsellor", () => {
    assert.strictEqual(isPureFaculty(["FACULTY"]), true);
    assert.strictEqual(isPureFaculty(["FACULTY", "ADMIN"]), false);
    assert.strictEqual(isPureFaculty(["FACULTY", "CENTER_MANAGER"]), false);
    assert.strictEqual(isPureFaculty(["FACULTY", "COUNSELLOR"]), false);
    assert.strictEqual(isPureFaculty(["ADMIN"]), false);
  });

  test("facultyTeachingBatchWhere includes coordinator, subject, schedule, session", () => {
    const where = facultyTeachingBatchWhere("fac-1");
    assert.ok(Array.isArray(where.OR));
    assert.strictEqual(where.OR.length, 4);
    assert.deepStrictEqual(where.OR[0], { facultyId: "fac-1" });
    assert.ok("batchCourses" in where.OR[1]);
    assert.ok("schedules" in where.OR[2]);
    assert.ok("classSessions" in where.OR[3]);
  });
});

describe("Faculty A vs B data isolation", () => {
  let ctx: {
    instituteId: string;
    facultyAUserId: string;
    facultyAId: string;
    facultyBUserId: string;
    facultyBId: string;
    batchAId: string | null;
    batchBId: string | null;
    studentAId: string | null;
    studentBId: string | null;
  } | null = null;

  before(async () => {
    const faculties = await prisma.faculty.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { id: true, instituteId: true, branchId: true } } },
      take: 20,
    });

    if (faculties.length < 2) {
      return;
    }

    // Prefer two faculty with distinct teaching desks in the same institute
    let facultyA = faculties[0];
    let facultyB = faculties.find((f) => f.id !== facultyA.id && f.instituteId === facultyA.instituteId) || faculties[1];
    let batchA: { id: string } | null = null;
    let batchB: { id: string } | null = null;

    for (const a of faculties) {
      const peers = faculties.filter((f) => f.id !== a.id && f.instituteId === a.instituteId);
      if (peers.length === 0) continue;
      const aBatch = await prisma.batch.findFirst({
        where: {
          instituteId: a.instituteId,
          ...facultyTeachingBatchWhere(a.id),
        },
        select: { id: true },
      });
      if (!aBatch) continue;
      for (const b of peers) {
        const bBatch = await prisma.batch.findFirst({
          where: {
            instituteId: b.instituteId,
            ...facultyTeachingBatchWhere(b.id),
            NOT: { id: aBatch.id },
          },
          select: { id: true },
        });
        if (bBatch) {
          facultyA = a;
          facultyB = b;
          batchA = aBatch;
          batchB = bBatch;
          break;
        }
      }
      if (batchA && batchB) break;
      if (aBatch && !batchA) {
        facultyA = a;
        batchA = aBatch;
      }
    }

    const studentA = batchA
      ? await prisma.batchEnrollment.findFirst({
          where: { batchId: batchA.id, status: "ACTIVE" },
          select: { studentId: true },
        })
      : null;
    const studentB = batchB
      ? await prisma.batchEnrollment.findFirst({
          where: { batchId: batchB.id, status: "ACTIVE" },
          select: { studentId: true },
        })
      : null;

    ctx = {
      instituteId: facultyA.instituteId,
      facultyAUserId: facultyA.userId,
      facultyAId: facultyA.id,
      facultyBUserId: facultyB.userId,
      facultyBId: facultyB.id,
      batchAId: batchA?.id ?? null,
      batchBId: batchB?.id ?? null,
      studentAId: studentA?.studentId ?? null,
      studentBId: studentB?.studentId ?? null,
    };
  });

  test("teaching batch ids are faculty-scoped", async () => {
    if (!ctx) {
      console.log("Skipping — seed faculty A/B not found");
      return;
    }
    const aIds = await getFacultyTeachingBatchIds(ctx.facultyAId, ctx.instituteId);
    const bIds = await getFacultyTeachingBatchIds(ctx.facultyBId, ctx.instituteId);
    assert.ok(Array.isArray(aIds));
    assert.ok(Array.isArray(bIds));
    // Cross-faculty overlap is allowed only when both teach same batch; still each list is derived from own id
    for (const id of aIds) {
      const owns = await prisma.batch.findFirst({
        where: { id, ...facultyTeachingBatchWhere(ctx.facultyAId) },
        select: { id: true },
      });
      assert.ok(owns, `Faculty A teaching list contains foreign batch ${id}`);
    }
  });

  test("faculty A cannot assert ownership of faculty B batch", async () => {
    if (!ctx?.batchBId) {
      console.log("Skipping — no distinct faculty B batch");
      return;
    }
    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    await assert.rejects(
      () => assertFacultyOwnsBatch(userA, ctx!.batchBId!),
      (err: unknown) =>
        err instanceof AppError && (err.statusCode === 403 || err.statusCode === 404)
    );
  });

  test("faculty A cannot access faculty B student", async () => {
    if (!ctx?.studentBId || !ctx.studentAId || ctx.studentAId === ctx.studentBId) {
      console.log("Skipping — no distinct faculty B student");
      return;
    }
    // Ensure student B is not also in faculty A desk
    const aStudentIds = await getFacultyTeachingStudentIds(ctx.facultyAId, ctx.instituteId);
    if (aStudentIds.includes(ctx.studentBId)) {
      console.log("Skipping — student B also enrolled in faculty A desk");
      return;
    }
    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    await assert.rejects(
      () => assertFacultyCanAccessStudent(userA, ctx!.studentBId!),
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  test("student list for faculty A only returns teaching-desk students", async () => {
    if (!ctx) {
      console.log("Skipping — seed faculty not found");
      return;
    }
    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    const result = await studentService.getAllStudents(userA, { page: 1, limit: 100 });
    const deskIds = new Set(
      await getFacultyTeachingStudentIds(ctx.facultyAId, ctx.instituteId)
    );
    for (const s of result.data) {
      assert.ok(deskIds.has(s.id), `Student ${s.id} not in faculty A teaching desk`);
    }
  });

  test("study materials list is own-faculty only", async () => {
    if (!ctx?.batchAId) {
      console.log("Skipping — no faculty A batch for study materials");
      return;
    }
    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    const userB = asFacultyUser(ctx.facultyBUserId, ctx.instituteId);

    const created = await StudyMaterialService.create(userA, {
      title: `Isolation Test Material ${Date.now()}`,
      fileType: "pdf",
      fileName: "isolation.pdf",
      fileUrl: "https://example.com/isolation.pdf",
      batchId: ctx.batchAId,
    });

    const listA = await StudyMaterialService.list(userA, { page: 1, limit: 100 });
    const listB = await StudyMaterialService.list(userB, { page: 1, limit: 100 });

    assert.ok(listA.data.some((m) => m.id === created.id));
    assert.ok(!listB.data.some((m) => m.id === created.id));

    await StudyMaterialService.remove(userA, created.id);
  });

  test("announcements list is own-faculty only", async () => {
    if (!ctx?.batchAId) {
      console.log("Skipping — no faculty A batch for announcements");
      return;
    }
    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    const userB = asFacultyUser(ctx.facultyBUserId, ctx.instituteId);

    const created = await AnnouncementService.create(userA, {
      title: `Isolation Announcement ${Date.now()}`,
      body: "Faculty isolation test body",
      type: "GENERAL",
      status: "PUBLISHED",
      batchId: ctx.batchAId,
    });

    const listA = await AnnouncementService.list(userA, { page: 1, limit: 100, status: "ALL" });
    const listB = await AnnouncementService.list(userB, { page: 1, limit: 100, status: "ALL" });

    assert.ok(listA.data.some((a) => a.id === created.id));
    assert.ok(!listB.data.some((a) => a.id === created.id));

    await AnnouncementService.remove(userA, created.id);
  });

  test("faculty B cannot delete faculty A study material", async () => {
    if (!ctx?.batchAId) {
      console.log("Skipping — no faculty A batch");
      return;
    }
    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    const userB = asFacultyUser(ctx.facultyBUserId, ctx.instituteId);
    const created = await StudyMaterialService.create(userA, {
      title: `Cross Delete Guard ${Date.now()}`,
      fileType: "pdf",
      fileName: "guard.pdf",
      fileUrl: "https://example.com/guard.pdf",
      batchId: ctx.batchAId,
    });

    await assert.rejects(
      () => StudyMaterialService.remove(userB, created.id),
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );

    await StudyMaterialService.remove(userA, created.id);
  });

  test("student attendance history is teaching-desk scoped", async () => {
    if (!ctx) {
      console.log("Skipping — seed faculty not found");
      return;
    }
    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    const result = await getMyStudentAttendance(userA, {
      page: 1,
      limit: 50,
      month: new Date().toISOString().slice(0, 7),
    });
    assert.ok(result.data);
    assert.ok(result.data.summary);
    assert.ok(result.data.calendar);
    assert.ok(Array.isArray(result.data.records));

    if (ctx.studentBId && ctx.studentAId && ctx.studentAId !== ctx.studentBId) {
      const aStudentIds = await getFacultyTeachingStudentIds(
        ctx.facultyAId,
        ctx.instituteId
      );
      if (!aStudentIds.includes(ctx.studentBId)) {
        await assert.rejects(
          () =>
            getMyStudentAttendance(userA, {
              page: 1,
              limit: 10,
              studentId: ctx!.studentBId!,
            }),
          (err: unknown) => err instanceof AppError && err.statusCode === 403
        );
      }
    }

    if (ctx.batchBId) {
      await assert.rejects(
        () =>
          getMyStudentAttendance(userA, {
            page: 1,
            limit: 10,
            batchId: ctx!.batchBId!,
          }),
        (err: unknown) =>
          err instanceof AppError &&
          (err.statusCode === 403 || err.statusCode === 404)
      );
    }
  });

  test("session roster includes past P/A/L stats and blocks other faculty", async () => {
    if (!ctx) {
      console.log("Skipping — seed faculty not found");
      return;
    }

    let sessionA = await prisma.classSession.findFirst({
      where: {
        facultyId: ctx.facultyAId,
        status: "ACTIVE",
        batch: { enrollments: { some: { status: "ACTIVE" } } },
      },
      select: { id: true },
    });

    if (!sessionA) {
      sessionA = await prisma.classSession.findFirst({
        where: { facultyId: ctx.facultyAId, status: "ACTIVE" },
        select: { id: true },
      });
    }

    if (!sessionA) {
      console.log("Skipping — no faculty A class session");
      return;
    }

    const userA = asFacultyUser(ctx.facultyAUserId, ctx.instituteId);
    const userB = asFacultyUser(ctx.facultyBUserId, ctx.instituteId);

    const { getSessionAttendance } = await import(
      "../modules/attendance/attendance.service"
    );

    const roster = await getSessionAttendance(userA, sessionA.id);
    assert.ok(roster.classSession);
    assert.ok(Array.isArray(roster.students));
    assert.ok(typeof roster.attendanceMarkedCount === "number");
    assert.ok(typeof roster.attendanceDonePercentage === "number");
    assert.ok(typeof roster.enrolledStudentsCount === "number");

    for (const row of roster.students) {
      assert.ok(typeof row.presentCount === "number");
      assert.ok(typeof row.absentCount === "number");
      assert.ok(typeof row.leaveCount === "number");
      assert.ok(typeof row.totalMarked === "number");
      assert.ok(typeof row.attendancePercentage === "number");
    }

    await assert.rejects(
      () => getSessionAttendance(userB, sessionA!.id),
      (err: unknown) =>
        err instanceof AppError &&
        (err.statusCode === 403 || err.statusCode === 404)
    );
  });
});

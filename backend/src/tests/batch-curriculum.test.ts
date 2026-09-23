import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import type { AuthUser } from "../modules/auth/auth.types";
import * as batchService from "../modules/batches/batch.service";
import * as curriculumService from "../modules/batches/batch-curriculum.service";
import {
  applyModuleCompletion,
  applyTopicCompletion,
  buildTopicProgressFromCourseTopics,
  resolveTeachableCourseIds,
  summarizeCurriculumProgress,
} from "../modules/batches/batch-curriculum.util";

describe("batch curriculum progress rules", () => {
  test("preserves topic completion by topicId when rebuilding from course topics", () => {
    const courseTopics = [
      { id: "t1", title: "A" },
      { id: "t2", title: "B" },
      { id: "t3", title: "C" },
    ];
    const preserved = [
      { topicId: "t1", isCompleted: true, completedAt: "2026-01-01T00:00:00.000Z", completedById: "u1" },
      { topicId: "t2", isCompleted: false },
      { topicId: "old", isCompleted: true },
    ];
    const next = buildTopicProgressFromCourseTopics(courseTopics, preserved);
    assert.equal(next.length, 3);
    assert.equal(next[0].isCompleted, true);
    assert.equal(next[0].completedById, "u1");
    assert.equal(next[1].isCompleted, false);
    assert.equal(next[2].isCompleted, false);
  });

  test("completing a module completes all topics", () => {
    const progress = [
      { topicId: "t1", isCompleted: false },
      { topicId: "t2", isCompleted: false },
    ];
    const next = applyModuleCompletion(progress, true, "actor", "2026-09-22T10:00:00.000Z");
    assert.equal(next.isCompleted, true);
    assert.equal(next.completedById, "actor");
    assert.ok(next.topicProgress.every((t) => t.isCompleted));
  });

  test("uncompleting a module clears all topics", () => {
    const progress = [
      { topicId: "t1", isCompleted: true, completedAt: "x", completedById: "u" },
      { topicId: "t2", isCompleted: true, completedAt: "x", completedById: "u" },
    ];
    const next = applyModuleCompletion(progress, false, "actor", "2026-09-22T10:00:00.000Z");
    assert.equal(next.isCompleted, false);
    assert.equal(next.completedAt, null);
    assert.ok(next.topicProgress.every((t) => !t.isCompleted));
  });

  test("completing the last topic auto-completes the module", () => {
    const progress = [
      { topicId: "t1", isCompleted: true },
      { topicId: "t2", isCompleted: false },
    ];
    const next = applyTopicCompletion(progress, "t2", true, "actor", "2026-09-22T10:00:00.000Z");
    assert.equal(next.topicFound, true);
    assert.equal(next.isCompleted, true);
    assert.ok(next.topicProgress.every((t) => t.isCompleted));
  });

  test("uncompleting any topic reopens the module", () => {
    const progress = [
      { topicId: "t1", isCompleted: true },
      { topicId: "t2", isCompleted: true },
    ];
    const next = applyTopicCompletion(progress, "t1", false, "actor", "2026-09-22T10:00:00.000Z");
    assert.equal(next.isCompleted, false);
    assert.equal(next.topicProgress.find((t) => t.topicId === "t1")?.isCompleted, false);
    assert.equal(next.topicProgress.find((t) => t.topicId === "t2")?.isCompleted, true);
  });

  test("summarizeCurriculumProgress computes topic-based percentage", () => {
    const summary = summarizeCurriculumProgress([
      {
        isCompleted: false,
        topicProgress: [
          { topicId: "t1", isCompleted: true },
          { topicId: "t2", isCompleted: false },
        ],
      },
      {
        isCompleted: true,
        topicProgress: [{ topicId: "t3", isCompleted: true }],
      },
    ]);
    assert.equal(summary.topicsTotal, 3);
    assert.equal(summary.topicsCompleted, 2);
    assert.equal(summary.modulesTotal, 2);
    assert.equal(summary.modulesCompleted, 1);
    assert.equal(summary.pct, 67);
  });

  test("teachable courses use BatchCourse faculty and primary batch faculty+course", () => {
    const batch = {
      courseId: "primary-course",
      facultyId: "fac-1",
      batchCourses: [
        { courseId: "c-a", facultyId: "fac-1" },
        { courseId: "c-b", facultyId: "fac-2" },
        { courseId: "primary-course", facultyId: null },
      ],
    };
    const teachable = resolveTeachableCourseIds(batch, "fac-1");
    assert.ok(teachable.has("c-a"));
    assert.ok(teachable.has("primary-course"));
    assert.equal(teachable.has("c-b"), false);
  });
});

describe("batch curriculum service integration", () => {
  const fixtureCode = "TEST-BATCH-CURRIC";
  const tag = Date.now();

  let instituteId = "";
  let branchId = "";
  let courseAId = "";
  let courseBId = "";
  let courseModuleAId = "";
  let courseModuleBId = "";
  let topicA1 = "";
  let topicA2 = "";
  let topicB1 = "";
  let facultyAUserId = "";
  let facultyAId = "";
  let facultyBUserId = "";
  let facultyBId = "";
  let adminUserId = "";
  let studentUserId = "";
  let studentId = "";
  let batchId = "";
  let batchModuleAId = "";
  let batchModuleBId = "";

  const asUser = (
    id: string,
    roles: string[],
    opts: { branchId?: string | null; permissions?: string[] } = {}
  ): AuthUser => ({
    id,
    userId: id,
    name: roles[0] || "User",
    email: `${id}@${fixtureCode.toLowerCase()}.test`,
    instituteId,
    branchId: opts.branchId ?? branchId,
    allowedBranchIds: opts.branchId ? [opts.branchId] : [branchId],
    roles,
    permissions: opts.permissions ?? [],
  });

  before(async () => {
    const existing = await prisma.institute.findFirst({ where: { code: fixtureCode } });
    if (existing) {
      const leftoverBatches = await prisma.batch.findMany({
        where: { instituteId: existing.id },
        select: { id: true },
      });
      for (const b of leftoverBatches) {
        await prisma.batchEnrollment.deleteMany({ where: { batchId: b.id } });
        await prisma.classSession.deleteMany({ where: { batchId: b.id } });
        await prisma.batchSchedule.deleteMany({ where: { batchId: b.id } });
        await prisma.batchModule.deleteMany({ where: { batchId: b.id } });
        await prisma.batchCourse.deleteMany({ where: { batchId: b.id } });
      }
      await prisma.batch.deleteMany({ where: { instituteId: existing.id } });
      await prisma.institute.delete({ where: { id: existing.id } });
    }

    const institute = await prisma.institute.create({
      data: { name: "Batch Curriculum Test", code: fixtureCode },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.create({
      data: { instituteId, name: "Curric Branch", code: "BCUR-A", status: "ACTIVE" },
    });
    branchId = branch.id;

    const courseA = await prisma.course.create({
      data: {
        instituteId,
        name: "Course A",
        code: `CA-${tag}`,
        fee: 10000,
        courseBranches: { create: [{ branchId }] },
      },
    });
    courseAId = courseA.id;

    const courseB = await prisma.course.create({
      data: {
        instituteId,
        name: "Course B",
        code: `CB-${tag}`,
        fee: 12000,
        courseBranches: { create: [{ branchId }] },
      },
    });
    courseBId = courseB.id;

    topicA1 = `topic-a1-${tag}`;
    topicA2 = `topic-a2-${tag}`;
    topicB1 = `topic-b1-${tag}`;

    const moduleA = await prisma.courseModule.create({
      data: {
        courseId: courseAId,
        name: "Module A",
        code: `MA-${tag}`,
        sequence: 1,
        duration: 10,
        topics: [
          { id: topicA1, title: "A1", durationHours: 2, isCompleted: false },
          { id: topicA2, title: "A2", durationHours: 2, isCompleted: false },
        ],
      },
    });
    courseModuleAId = moduleA.id;

    const moduleB = await prisma.courseModule.create({
      data: {
        courseId: courseBId,
        name: "Module B",
        code: `MB-${tag}`,
        sequence: 1,
        duration: 8,
        topics: [{ id: topicB1, title: "B1", durationHours: 2, isCompleted: false }],
      },
    });
    courseModuleBId = moduleB.id;

    const facultyUserA = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Faculty A",
        email: `bcur-fa-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    facultyAUserId = facultyUserA.id;
    facultyAId = (
      await prisma.faculty.create({
        data: {
          userId: facultyAUserId,
          instituteId,
          branchId,
          employeeCode: `BCUR-FA-${tag}`,
        },
      })
    ).id;

    const facultyUserB = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Faculty B",
        email: `bcur-fb-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    facultyBUserId = facultyUserB.id;
    facultyBId = (
      await prisma.faculty.create({
        data: {
          userId: facultyBUserId,
          instituteId,
          branchId,
          employeeCode: `BCUR-FB-${tag}`,
        },
      })
    ).id;

    const adminUser = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Admin Curric",
        email: `bcur-admin-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    adminUserId = adminUser.id;

    const studentUser = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Student Curric",
        email: `bcur-stu-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    studentUserId = studentUser.id;
    studentId = (
      await prisma.student.create({
        data: {
          userId: studentUserId,
          instituteId,
          branchId,
          studentCode: `BCUR-S-${tag}`,
        },
      })
    ).id;

    const batch = await batchService.createBatch(asUser(adminUserId, ["ADMIN"], { branchId }), {
      name: "Curriculum Cohort",
      code: `BCUR-${tag}`,
      courseId: courseAId,
      facultyId: facultyAId,
      branchId,
      capacity: 20,
      startDate: new Date().toISOString().slice(0, 10),
      schedulePattern: "MWF",
      courses: [
        { courseId: courseAId, facultyId: facultyAId, sequence: 1 },
        { courseId: courseBId, facultyId: facultyBId, sequence: 2 },
      ],
    });
    batchId = batch.id;

    const batchModules = await prisma.batchModule.findMany({
      where: { batchId },
      include: { courseModule: { select: { courseId: true } } },
    });
    batchModuleAId = batchModules.find((m) => m.courseModule.courseId === courseAId)!.id;
    batchModuleBId = batchModules.find((m) => m.courseModule.courseId === courseBId)!.id;

    await prisma.batchEnrollment.create({
      data: {
        batchId,
        studentId,
        status: "ACTIVE",
      },
    });
  });

  after(async () => {
    if (!instituteId) return;
    // BatchCourse.courseId is RESTRICT — remove batch graph before institute/courses.
    if (batchId) {
      await prisma.batchEnrollment.deleteMany({ where: { batchId } });
      await prisma.classSession.deleteMany({ where: { batchId } });
      await prisma.batchSchedule.deleteMany({ where: { batchId } });
      await prisma.batchModule.deleteMany({ where: { batchId } });
      await prisma.batchCourse.deleteMany({ where: { batchId } });
      await prisma.batch.deleteMany({ where: { id: batchId } });
    }
    await prisma.institute.deleteMany({ where: { id: instituteId } });
  });

  test("faculty GET curriculum is filtered to teachable courses only", async () => {
    const facultyA = asUser(facultyAUserId, ["FACULTY"]);
    const curriculum = await curriculumService.getBatchCurriculum(
      batchId,
      instituteId,
      facultyA
    );
    assert.ok(curriculum.modules.every((m) => m.courseId === courseAId));
    assert.equal(curriculum.modules.some((m) => m.courseId === courseBId), false);
  });

  test("faculty cannot mark module for a course they do not teach", async () => {
    const facultyA = asUser(facultyAUserId, ["FACULTY"]);
    await assert.rejects(
      () =>
        curriculumService.markBatchModuleCompletion(
          batchId,
          batchModuleBId,
          instituteId,
          facultyA,
          true
        ),
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  test("faculty can mark teachable module; completing last topic completes module", async () => {
    const facultyA = asUser(facultyAUserId, ["FACULTY"]);

    const afterFirst = await curriculumService.markBatchTopicCompletion(
      batchId,
      batchModuleAId,
      topicA1,
      instituteId,
      facultyA,
      true
    );
    assert.equal(afterFirst.isCompleted, false);
    assert.equal(afterFirst.topics.find((t) => t.topicId === topicA1)?.isCompleted, true);
    assert.equal(afterFirst.topics.find((t) => t.topicId === topicA2)?.isCompleted, false);

    const afterLast = await curriculumService.markBatchTopicCompletion(
      batchId,
      batchModuleAId,
      topicA2,
      instituteId,
      facultyA,
      true
    );
    assert.equal(afterLast.isCompleted, true);
    assert.ok(afterLast.topics.every((t) => t.isCompleted));

    const reopened = await curriculumService.markBatchTopicCompletion(
      batchId,
      batchModuleAId,
      topicA1,
      instituteId,
      facultyA,
      false
    );
    assert.equal(reopened.isCompleted, false);
    assert.equal(reopened.topics.find((t) => t.topicId === topicA1)?.isCompleted, false);
    assert.equal(reopened.topics.find((t) => t.topicId === topicA2)?.isCompleted, true);
  });

  test("admin can override completion on any batch module", async () => {
    const admin = asUser(adminUserId, ["ADMIN"], { branchId: null });
    const marked = await curriculumService.markBatchModuleCompletion(
      batchId,
      batchModuleBId,
      instituteId,
      admin,
      true
    );
    assert.equal(marked.isCompleted, true);
    assert.ok(marked.topics.every((t) => t.isCompleted));
    assert.equal(marked.completedById, adminUserId);

    const cleared = await curriculumService.markBatchModuleCompletion(
      batchId,
      batchModuleBId,
      instituteId,
      admin,
      false
    );
    assert.equal(cleared.isCompleted, false);
    assert.ok(cleared.topics.every((t) => !t.isCompleted));
  });

  test("student curriculum never returns incomplete topics", async () => {
    const facultyA = asUser(facultyAUserId, ["FACULTY"]);
    await curriculumService.markBatchTopicCompletion(
      batchId,
      batchModuleAId,
      topicA1,
      instituteId,
      facultyA,
      true
    );
    await curriculumService.markBatchTopicCompletion(
      batchId,
      batchModuleAId,
      topicA2,
      instituteId,
      facultyA,
      false
    );

    const student = asUser(studentUserId, ["STUDENT"]);
    const rows = await curriculumService.getMyCurriculum(student);
    const batchRow = rows.find((r) => r.batchId === batchId);
    assert.ok(batchRow);

    for (const mod of batchRow!.modules) {
      for (const topic of mod.topics) {
        assert.equal(topic.isCompleted, true);
      }
    }

    const modA = batchRow!.modules.find((m) => m.id === batchModuleAId);
    assert.ok(modA);
    assert.equal(modA!.topics.some((t) => t.topicId === topicA1), true);
    assert.equal(modA!.topics.some((t) => t.topicId === topicA2), false);
  });

  test("batch module sync preserves progress for same courseModuleId", async () => {
    const facultyA = asUser(facultyAUserId, ["FACULTY"]);
    await curriculumService.markBatchModuleCompletion(
      batchId,
      batchModuleAId,
      instituteId,
      facultyA,
      true
    );

    const before = await prisma.batchModule.findUnique({ where: { id: batchModuleAId } });
    assert.equal(before?.isCompleted, true);
    assert.equal(before?.courseModuleId, courseModuleAId);

    await batchService.updateBatch(batchId, asUser(adminUserId, ["ADMIN"], { branchId }), {
      courses: [
        { courseId: courseAId, facultyId: facultyAId, sequence: 1 },
        { courseId: courseBId, facultyId: facultyBId, sequence: 2 },
      ],
    });

    const afterSync = await prisma.batchModule.findFirst({
      where: { batchId, courseModuleId: courseModuleAId },
    });
    assert.ok(afterSync);
    assert.equal(afterSync.isCompleted, true);
    assert.equal(afterSync.completedById, facultyAUserId);

    const progress = Array.isArray(afterSync.topicProgress)
      ? (afterSync.topicProgress as Array<{ topicId: string; isCompleted: boolean }>)
      : [];
    assert.ok(progress.every((t) => t.isCompleted));

    // Refresh ids after sync recreate
    batchModuleAId = afterSync.id;
    const modB = await prisma.batchModule.findFirst({
      where: { batchId, courseModuleId: courseModuleBId },
    });
    if (modB) batchModuleBId = modB.id;
  });

  test("creating CourseModule after batch exists links BatchModules immediately", async () => {
    const topicNew = `topic-new-${tag}`;
    const created = await prisma.courseModule.create({
      data: {
        courseId: courseAId,
        name: "Module A Extra",
        code: `MA-EXTRA-${tag}`,
        sequence: 2,
        duration: 6,
        topics: [
          { id: topicNew, title: "New topic", durationHours: 2, isCompleted: false },
        ],
      },
    });

    // Before sync: no BatchModule for the new catalog module
    const before = await prisma.batchModule.findFirst({
      where: { batchId, courseModuleId: created.id },
    });
    assert.equal(before, null);

    const result = await curriculumService.syncCourseModuleToExistingBatches(created.id);
    assert.equal(result.created, 1);

    const linked = await prisma.batchModule.findFirst({
      where: { batchId, courseModuleId: created.id },
    });
    assert.ok(linked);
    const progress = Array.isArray(linked!.topicProgress)
      ? (linked!.topicProgress as Array<{ topicId: string; isCompleted: boolean }>)
      : [];
    assert.equal(progress.length, 1);
    assert.equal(progress[0].topicId, topicNew);
    assert.equal(progress[0].isCompleted, false);

    // Faculty can mark the newly linked module
    const facultyA = asUser(facultyAUserId, ["FACULTY"]);
    const marked = await curriculumService.markBatchTopicCompletion(
      batchId,
      linked!.id,
      topicNew,
      instituteId,
      facultyA,
      true
    );
    assert.equal(marked.isCompleted, true);
    assert.equal(marked.topics.find((t) => t.topicId === topicNew)?.isCompleted, true);

    // Adding a topic realigns progress and reopens a completed module
    const topicNew2 = `topic-new2-${tag}`;
    await prisma.courseModule.update({
      where: { id: created.id },
      data: {
        topics: [
          { id: topicNew, title: "New topic", durationHours: 2, isCompleted: false },
          { id: topicNew2, title: "Newer topic", durationHours: 2, isCompleted: false },
        ],
      },
    });
    const realign = await curriculumService.syncCourseModuleToExistingBatches(created.id);
    assert.equal(realign.updated, 1);

    const afterTopicAdd = await prisma.batchModule.findFirst({
      where: { batchId, courseModuleId: created.id },
    });
    assert.ok(afterTopicAdd);
    assert.equal(afterTopicAdd!.isCompleted, false);
    const progress2 = Array.isArray(afterTopicAdd!.topicProgress)
      ? (afterTopicAdd!.topicProgress as Array<{ topicId: string; isCompleted: boolean }>)
      : [];
    assert.equal(progress2.length, 2);
    assert.equal(progress2.find((t) => t.topicId === topicNew)?.isCompleted, true);
    assert.equal(progress2.find((t) => t.topicId === topicNew2)?.isCompleted, false);

    // Cleanup extra module links for subsequent tests / after hook
    await prisma.batchModule.deleteMany({ where: { courseModuleId: created.id } });
    await prisma.courseModule.delete({ where: { id: created.id } });
  });
});

/**
 * Pin-to-pin: shared course curriculum across 3 branches,
 * separate progress per batch / faculty / student.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import * as courseService from "../modules/courses/course.service";
import * as batchService from "../modules/batches/batch.service";
import * as moduleService from "../modules/modules/module.service";
import * as curriculumService from "../modules/batches/batch-curriculum.service";

const fixtureCode = "TEST-CURRIC-3BR";
const tag = Date.now();

let instituteId = "";
let branch1Id = "";
let branch2Id = "";
let branch3Id = "";
let courseId = "";
let courseModuleId = "";
let topic1Id = "";
let topic2Id = "";

let faculty1UserId = "";
let faculty1Id = "";
let faculty2UserId = "";
let faculty2Id = "";
let faculty3UserId = "";
let faculty3Id = "";

let student1UserId = "";
let student1Id = "";
let student2UserId = "";
let student2Id = "";

let batch1Id = "";
let batch2Id = "";
let batch3Id = "";
let batchModule1Id = "";
let batchModule2Id = "";
let batchModule3Id = "";

let admin: AuthUser;

const asUser = (
  id: string,
  roles: string[],
  branchId: string | null,
  allowed: string[] = []
): AuthUser => ({
  id,
  userId: id,
  name: roles[0] || "User",
  email: `${id}@${fixtureCode.toLowerCase()}.test`,
  instituteId,
  branchId,
  allowedBranchIds: allowed.length ? allowed : branchId ? [branchId] : [],
  roles,
  permissions: roles.includes("ADMIN")
    ? ["batch_curriculum.mark", "module.create", "module.read"]
    : ["batch_curriculum.mark"],
});

before(async () => {
  const existing = await prisma.institute.findFirst({ where: { code: fixtureCode } });
  if (existing) {
    const leftoverBatches = await prisma.batch.findMany({
      where: { instituteId: existing.id },
      select: { id: true },
    });
    const ids = leftoverBatches.map((b) => b.id);
    if (ids.length) {
      await prisma.batchEnrollment.deleteMany({ where: { batchId: { in: ids } } });
      await prisma.classSession.deleteMany({ where: { batchId: { in: ids } } });
      await prisma.batchSchedule.deleteMany({ where: { batchId: { in: ids } } });
      await prisma.batchModule.deleteMany({ where: { batchId: { in: ids } } });
      await prisma.batchCourse.deleteMany({ where: { batchId: { in: ids } } });
      await prisma.batch.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.institute.delete({ where: { id: existing.id } });
  }

  const institute = await prisma.institute.create({
    data: { name: "3-Branch Curriculum Pin Test", code: fixtureCode },
  });
  instituteId = institute.id;

  const [b1, b2, b3] = await Promise.all([
    prisma.branch.create({
      data: { instituteId, name: "Branch 1", code: `C3B-1-${tag}`, status: "ACTIVE" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "Branch 2", code: `C3B-2-${tag}`, status: "ACTIVE" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "Branch 3", code: `C3B-3-${tag}`, status: "ACTIVE" },
    }),
  ]);
  branch1Id = b1.id;
  branch2Id = b2.id;
  branch3Id = b3.id;

  admin = asUser(`admin-${tag}`, ["ADMIN"], null, [branch1Id, branch2Id, branch3Id]);

  // Shared course linked to all 3 branches
  const course = await courseService.createCourse(admin, {
    name: "Shared GenAI Course",
    code: `C3B-COURSE-${tag}`,
    fee: 9999,
    branchIds: [branch1Id, branch2Id, branch3Id],
  });
  courseId = course.id;

  // One faculty + one student per branch
  const mkFaculty = async (n: number, branchId: string) => {
    const user = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: `Faculty ${n}`,
        email: `c3b-f${n}-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    const faculty = await prisma.faculty.create({
      data: {
        userId: user.id,
        instituteId,
        branchId,
        employeeCode: `C3B-F${n}-${tag}`,
      },
    });
    return { userId: user.id, facultyId: faculty.id };
  };

  const mkStudent = async (n: number, branchId: string) => {
    const user = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: `Student ${n}`,
        email: `c3b-s${n}-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        instituteId,
        branchId,
        studentCode: `C3B-S${n}-${tag}`,
      },
    });
    return { userId: user.id, studentId: student.id };
  };

  ({ userId: faculty1UserId, facultyId: faculty1Id } = await mkFaculty(1, branch1Id));
  ({ userId: faculty2UserId, facultyId: faculty2Id } = await mkFaculty(2, branch2Id));
  ({ userId: faculty3UserId, facultyId: faculty3Id } = await mkFaculty(3, branch3Id));
  ({ userId: student1UserId, studentId: student1Id } = await mkStudent(1, branch1Id));
  ({ userId: student2UserId, studentId: student2Id } = await mkStudent(2, branch2Id));

  // One batch per branch, same shared course, different faculty
  const start = new Date().toISOString().slice(0, 10);
  const batch1 = await batchService.createBatch(admin, {
    name: "Batch Branch 1",
    code: `C3B-B1-${tag}`,
    branchId: branch1Id,
    courseId,
    facultyId: faculty1Id,
    capacity: 20,
    startDate: start,
    courses: [{ courseId, facultyId: faculty1Id, sequence: 1 }],
  });
  batch1Id = batch1.id;

  const batch2 = await batchService.createBatch(admin, {
    name: "Batch Branch 2",
    code: `C3B-B2-${tag}`,
    branchId: branch2Id,
    courseId,
    facultyId: faculty2Id,
    capacity: 20,
    startDate: start,
    courses: [{ courseId, facultyId: faculty2Id, sequence: 1 }],
  });
  batch2Id = batch2.id;

  const batch3 = await batchService.createBatch(admin, {
    name: "Batch Branch 3",
    code: `C3B-B3-${tag}`,
    branchId: branch3Id,
    courseId,
    facultyId: faculty3Id,
    capacity: 20,
    startDate: start,
    courses: [{ courseId, facultyId: faculty3Id, sequence: 1 }],
  });
  batch3Id = batch3.id;

  await prisma.batchEnrollment.createMany({
    data: [
      { batchId: batch1Id, studentId: student1Id, status: "ACTIVE" },
      { batchId: batch2Id, studentId: student2Id, status: "ACTIVE" },
    ],
  });
});

after(async () => {
  if (!instituteId) return;
  const batchIds = [batch1Id, batch2Id, batch3Id].filter(Boolean);
  if (batchIds.length) {
    await prisma.batchEnrollment.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.classSession.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchSchedule.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchModule.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchCourse.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  }
  await prisma.institute.deleteMany({ where: { id: instituteId } });
});

describe("Pin-to-pin: shared syllabus + separate faculty/batch progress", () => {
  test("1) Admin creates curriculum once → all 3 branch batches get the same modules/topics", async () => {
    topic1Id = `c3b-t1-${tag}`;
    topic2Id = `c3b-t2-${tag}`;

    const created = await moduleService.createModule(admin, {
      courseId,
      name: "Intro Module",
      code: `C3B-MOD-${tag}`,
      sequence: 1,
      duration: 20,
    });
    courseModuleId = created.id;

    await moduleService.addTopic(courseModuleId, admin, {
      title: "Topic One",
      durationHours: 4,
      description: "First topic",
    });
    // addTopic uses Date.now() ids — ensure distinct ids
    await new Promise((r) => setTimeout(r, 5));
    await moduleService.addTopic(courseModuleId, admin, {
      title: "Topic Two",
      durationHours: 4,
      description: "Second topic",
    });

    // Align topic ids from DB (addTopic generates ids)
    const refreshed = await prisma.courseModule.findUniqueOrThrow({
      where: { id: courseModuleId },
      select: { topics: true },
    });
    const topics = Array.isArray(refreshed.topics) ? (refreshed.topics as Array<{ id: string }>) : [];
    assert.equal(topics.length, 2);
    topic1Id = topics[0].id;
    topic2Id = topics[1].id;

    // Sync should have linked BatchModule on all 3 batches
    const links = await prisma.batchModule.findMany({
      where: { courseModuleId },
      select: { id: true, batchId: true, topicProgress: true },
    });
    assert.equal(links.length, 3);
    const byBatch = new Map(links.map((l) => [l.batchId, l]));
    assert.ok(byBatch.has(batch1Id));
    assert.ok(byBatch.has(batch2Id));
    assert.ok(byBatch.has(batch3Id));

    batchModule1Id = byBatch.get(batch1Id)!.id;
    batchModule2Id = byBatch.get(batch2Id)!.id;
    batchModule3Id = byBatch.get(batch3Id)!.id;

    for (const link of links) {
      const progress = Array.isArray(link.topicProgress)
        ? (link.topicProgress as Array<{ topicId: string; isCompleted: boolean }>)
        : [];
      assert.equal(progress.length, 2);
      assert.ok(progress.every((p) => !p.isCompleted));
      assert.ok(progress.some((p) => p.topicId === topic1Id));
      assert.ok(progress.some((p) => p.topicId === topic2Id));
    }
  });

  test("2) Faculty A (Branch 1) only sees/marks their batch — not Branch 2/3 work", async () => {
    const facultyA = asUser(faculty1UserId, ["FACULTY"], branch1Id, [branch1Id]);

    const curric1 = await curriculumService.getBatchCurriculum(batch1Id, instituteId, facultyA);
    assert.equal(curric1.modules.length, 1);
    assert.equal(curric1.modules[0].id, batchModule1Id);

    // Faculty A marks topic 1 on Branch 1 batch only
    await curriculumService.markBatchTopicCompletion(
      batch1Id,
      batchModule1Id,
      topic1Id,
      instituteId,
      facultyA,
      true
    );

    const bm1 = await prisma.batchModule.findUniqueOrThrow({ where: { id: batchModule1Id } });
    const bm2 = await prisma.batchModule.findUniqueOrThrow({ where: { id: batchModule2Id } });
    const bm3 = await prisma.batchModule.findUniqueOrThrow({ where: { id: batchModule3Id } });

    const p1 = bm1.topicProgress as Array<{ topicId: string; isCompleted: boolean }>;
    const p2 = bm2.topicProgress as Array<{ topicId: string; isCompleted: boolean }>;
    const p3 = bm3.topicProgress as Array<{ topicId: string; isCompleted: boolean }>;

    assert.equal(p1.find((t) => t.topicId === topic1Id)?.isCompleted, true);
    assert.equal(p1.find((t) => t.topicId === topic2Id)?.isCompleted, false);
    // Other branches untouched
    assert.ok(p2.every((t) => !t.isCompleted));
    assert.ok(p3.every((t) => !t.isCompleted));
  });

  test("3) Faculty B (Branch 2) progress is independent — does not inherit Faculty A marks", async () => {
    const facultyB = asUser(faculty2UserId, ["FACULTY"], branch2Id, [branch2Id]);

    const curric2 = await curriculumService.getBatchCurriculum(batch2Id, instituteId, facultyB);
    const mod = curric2.modules.find((m) => m.id === batchModule2Id);
    assert.ok(mod);
    assert.equal(mod!.topics.find((t) => t.topicId === topic1Id)?.isCompleted, false);

    await curriculumService.markBatchTopicCompletion(
      batch2Id,
      batchModule2Id,
      topic1Id,
      instituteId,
      facultyB,
      true
    );
    await curriculumService.markBatchTopicCompletion(
      batch2Id,
      batchModule2Id,
      topic2Id,
      instituteId,
      facultyB,
      true
    );

    const bm1 = await prisma.batchModule.findUniqueOrThrow({ where: { id: batchModule1Id } });
    const bm2 = await prisma.batchModule.findUniqueOrThrow({ where: { id: batchModule2Id } });

    const p1 = bm1.topicProgress as Array<{ topicId: string; isCompleted: boolean }>;
    const p2 = bm2.topicProgress as Array<{ topicId: string; isCompleted: boolean }>;

    // Branch 1 still only topic1 complete
    assert.equal(p1.find((t) => t.topicId === topic1Id)?.isCompleted, true);
    assert.equal(p1.find((t) => t.topicId === topic2Id)?.isCompleted, false);
    // Branch 2 both complete
    assert.ok(p2.every((t) => t.isCompleted));
    assert.equal(bm2.isCompleted, true);
  });

  test("4) Faculty analytics progress is per-faculty (A ≠ B)", async () => {
    const progressA = await curriculumService.getFacultyCurriculumProgress(
      faculty1Id,
      instituteId
    );
    const progressB = await curriculumService.getFacultyCurriculumProgress(
      faculty2Id,
      instituteId
    );
    const progressC = await curriculumService.getFacultyCurriculumProgress(
      faculty3Id,
      instituteId
    );

    assert.equal(progressA.byAssignment.length, 1);
    assert.equal(progressA.byAssignment[0].batchId, batch1Id);
    assert.equal(progressA.topicsCompleted, 1);
    assert.equal(progressA.topicsTotal, 2);
    assert.equal(progressA.overallPct, 50);

    assert.equal(progressB.byAssignment.length, 1);
    assert.equal(progressB.byAssignment[0].batchId, batch2Id);
    assert.equal(progressB.topicsCompleted, 2);
    assert.equal(progressB.topicsTotal, 2);
    assert.equal(progressB.overallPct, 100);

    // Faculty C never marked — 0%
    assert.equal(progressC.byAssignment.length, 1);
    assert.equal(progressC.byAssignment[0].batchId, batch3Id);
    assert.equal(progressC.topicsCompleted, 0);
    assert.equal(progressC.overallPct, 0);
  });

  test("5) Students only see completed topics for their own batch", async () => {
    const studentA = asUser(student1UserId, ["STUDENT"], branch1Id, [branch1Id]);
    const studentB = asUser(student2UserId, ["STUDENT"], branch2Id, [branch2Id]);

    const viewA = await curriculumService.getMyCurriculum(studentA);
    const viewB = await curriculumService.getMyCurriculum(studentB);

    assert.equal(viewA.length, 1);
    assert.equal(viewA[0].batchId, batch1Id);
    const topicsA = viewA[0].modules.flatMap((m) => m.topics);
    assert.ok(topicsA.every((t) => t.isCompleted));
    assert.equal(topicsA.length, 1); // only topic1 completed on batch 1
    assert.equal(topicsA[0].topicId, topic1Id);

    assert.equal(viewB.length, 1);
    assert.equal(viewB[0].batchId, batch2Id);
    const topicsB = viewB[0].modules.flatMap((m) => m.topics);
    assert.equal(topicsB.length, 2); // both topics on batch 2
    assert.ok(topicsB.every((t) => t.isCompleted));
  });
});

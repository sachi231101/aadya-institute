import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import * as courseService from "../modules/courses/course.service";
import * as batchService from "../modules/batches/batch.service";
import { AppError } from "../middlewares/error.middleware";

const fixtureCode = "TEST-BATCH-BRANCH-ISO";
const tag = Date.now();

let instituteId: string;
let branchAId: string;
let branchBId: string;
let courseABId: string;
let batchAId: string;
let batchBId: string;
let admin: AuthUser;
let managerA: AuthUser;
let managerB: AuthUser;
let managerNoScope: AuthUser;
let multiManager: AuthUser;

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
    data: { name: "Batch Branch Isolation", code: fixtureCode },
  });
  instituteId = institute.id;

  const [branchA, branchB] = await Promise.all([
    prisma.branch.create({
      data: { instituteId, name: "Branch A", code: "BBI-A", status: "ACTIVE" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "Branch B", code: "BBI-B", status: "ACTIVE" },
    }),
  ]);
  branchAId = branchA.id;
  branchBId = branchB.id;

  admin = asUser("admin-bbi", ["ADMIN"], null);
  managerA = asUser("cm-a-bbi", ["CENTER_MANAGER"], branchAId, [branchAId]);
  managerB = asUser("cm-b-bbi", ["CENTER_MANAGER"], branchBId, [branchBId]);
  managerNoScope = asUser("cm-noscope-bbi", ["CENTER_MANAGER"], null, []);
  multiManager = asUser("cm-multi-bbi", ["CENTER_MANAGER"], branchAId, [
    branchAId,
    branchBId,
  ]);

  const courseAB = await courseService.createCourse(admin, {
    name: "Shared A+B Course",
    code: `BBI-AB-${tag}`,
    fee: 12000,
    branchIds: [branchAId, branchBId],
  });
  courseABId = courseAB.id;

  const startDate = new Date().toISOString().slice(0, 10);
  const batchA = await batchService.createBatch(admin, {
    name: "Batch A",
    code: `BBI-BA-${tag}`,
    branchId: branchAId,
    courseId: courseABId,
    capacity: 20,
    startDate,
    courses: [{ courseId: courseABId, sequence: 1 }],
  });
  batchAId = batchA.id;

  const batchB = await batchService.createBatch(admin, {
    name: "Batch B",
    code: `BBI-BB-${tag}`,
    branchId: branchBId,
    courseId: courseABId,
    capacity: 20,
    startDate,
    courses: [{ courseId: courseABId, sequence: 1 }],
  });
  batchBId = batchB.id;
});

after(async () => {
  if (!instituteId) return;
  const leftoverBatches = await prisma.batch.findMany({
    where: { instituteId },
    select: { id: true },
  });
  const batchIds = leftoverBatches.map((b) => b.id);
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

describe("Batch branch isolation", () => {
  test("CM of Branch B cannot list Branch A batches", async () => {
    const listed = await batchService.getBatches(managerB);
    const ids = listed.map((b) => b.id);
    assert.ok(!ids.includes(batchAId));
    assert.ok(ids.includes(batchBId));
  });

  test("CM of Branch B cannot get/update/schedule a Branch A batch (404)", async () => {
    await assert.rejects(
      () => batchService.getBatchById(batchAId, managerB),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    await assert.rejects(
      () =>
        batchService.updateBatch(batchAId, managerB, {
          name: "Hijacked Batch",
        }),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    await assert.rejects(
      () =>
        batchService.addBatchSchedule(batchAId, managerB, {
          dayOfWeek: 1,
          startTime: "10:00",
          endTime: "12:00",
        }),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    await assert.rejects(
      () => batchService.getBatchSchedules(batchAId, managerB),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    await assert.rejects(
      () => batchService.getBatchStudents(batchAId, managerB),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });

  test("CM cannot create a batch with another branch's branchId", async () => {
    // Single-branch CM: spoofed branchId is ignored; batch is forced to their branch
    const forced = await batchService.createBatch(managerB, {
      name: "Forced Own Branch",
      code: `BBI-FORCE-${tag}`,
      branchId: branchAId,
      courseId: courseABId,
      capacity: 15,
      startDate: new Date().toISOString().slice(0, 10),
      courses: [{ courseId: courseABId, sequence: 1 }],
    });
    assert.equal(forced.branchId, branchBId);
    assert.notEqual(forced.branchId, branchAId);

    const listA = await batchService.getBatches(managerA);
    assert.ok(!listA.some((b) => b.id === forced.id));

    // Multi-branch CM with A+B access creating without branchId fails
    await assert.rejects(
      () =>
        batchService.createBatch(multiManager, {
          name: "Multi No Branch",
          code: `BBI-MULTINO-${tag}`,
          courseId: courseABId,
          capacity: 10,
          startDate: new Date().toISOString().slice(0, 10),
          courses: [{ courseId: courseABId, sequence: 1 }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /select a branch/i.test(err.message)
    );
  });

  test("Admin can list all / filter by branchId", async () => {
    const all = await batchService.getBatches(admin);
    const ids = all.map((b) => b.id);
    assert.ok(ids.includes(batchAId));
    assert.ok(ids.includes(batchBId));

    const filteredA = await batchService.getBatches(admin, {}, {
      requestedBranchId: branchAId,
    });
    const filteredAIds = filteredA.map((b) => b.id);
    assert.ok(filteredAIds.includes(batchAId));
    assert.ok(!filteredAIds.includes(batchBId));

    const filteredB = await batchService.getBatches(admin, {}, {
      requestedBranchId: branchBId,
    });
    const filteredBIds = filteredB.map((b) => b.id);
    assert.ok(filteredBIds.includes(batchBId));
    assert.ok(!filteredBIds.includes(batchAId));
  });

  test("Create without branchId fails when multiple branches exist; succeeds with authorized branch", async () => {
    await assert.rejects(
      () =>
        batchService.createBatch(admin, {
          name: "No Branch Admin",
          code: `BBI-NOBR-${tag}`,
          courseId: courseABId,
          capacity: 10,
          startDate: new Date().toISOString().slice(0, 10),
          courses: [{ courseId: courseABId, sequence: 1 }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /select a branch/i.test(err.message)
    );

    const created = await batchService.createBatch(admin, {
      name: "With Branch Admin",
      code: `BBI-WITHBR-${tag}`,
      branchId: branchAId,
      courseId: courseABId,
      capacity: 10,
      startDate: new Date().toISOString().slice(0, 10),
      courses: [{ courseId: courseABId, sequence: 1 }],
    });
    assert.equal(created.branchId, branchAId);

    await assert.rejects(
      () =>
        batchService.createBatch(admin, {
          name: "Bad Branch",
          code: `BBI-BADBR-${tag}`,
          branchId: "not-a-real-branch-id",
          courseId: courseABId,
          capacity: 10,
          startDate: new Date().toISOString().slice(0, 10),
          courses: [{ courseId: courseABId, sequence: 1 }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /invalid or inactive/i.test(err.message)
    );
  });

  test("branch-locked user with no branch scope sees no institute-wide batches", async () => {
    const listed = await batchService.getBatches(managerNoScope);
    assert.deepEqual(listed, []);
  });

  test("CM of Branch A can get and update own batch", async () => {
    const batch = await batchService.getBatchById(batchAId, managerA);
    assert.equal(batch.id, batchAId);

    await batchService.updateBatch(batchAId, managerA, {
      name: "Batch A Updated",
    });
    const updated = await batchService.getBatchById(batchAId, managerA);
    assert.equal(updated.name, "Batch A Updated");
  });

  test("updateBatch strips client-supplied branchId (no reassignment)", async () => {
    await batchService.updateBatch(batchAId, admin, {
      branchId: branchBId,
      name: "Batch A Still A",
    });
    const batch = await batchService.getBatchById(batchAId, admin);
    assert.equal(batch.branchId, branchAId);
    assert.equal(batch.name, "Batch A Still A");
  });
});

import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import * as courseService from "../modules/courses/course.service";
import * as batchService from "../modules/batches/batch.service";
import * as moduleService from "../modules/modules/module.service";
import { AppError } from "../middlewares/error.middleware";

const fixtureCode = "TEST-COURSE-BRANCH-ISO";

let instituteId: string;
let branchAId: string;
let branchBId: string;
let branchCId: string;
let courseAOnlyId: string;
let courseABId: string;
let admin: AuthUser;
let managerA: AuthUser;
let managerB: AuthUser;
let managerC: AuthUser;

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
    await prisma.institute.delete({ where: { id: existing.id } });
  }

  const institute = await prisma.institute.create({
    data: { name: "Course Branch Isolation", code: fixtureCode },
  });
  instituteId = institute.id;

  const [branchA, branchB, branchC] = await Promise.all([
    prisma.branch.create({
      data: { instituteId, name: "Branch A", code: "CBI-A", status: "ACTIVE" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "Branch B", code: "CBI-B", status: "ACTIVE" },
    }),
    prisma.branch.create({
      data: { instituteId, name: "Branch C", code: "CBI-C", status: "ACTIVE" },
    }),
  ]);
  branchAId = branchA.id;
  branchBId = branchB.id;
  branchCId = branchC.id;

  admin = asUser("admin-cbi", ["ADMIN"], null);
  managerA = asUser("cm-a-cbi", ["CENTER_MANAGER"], branchAId, [branchAId]);
  managerB = asUser("cm-b-cbi", ["CENTER_MANAGER"], branchBId, [branchBId]);
  managerC = asUser("cm-c-cbi", ["CENTER_MANAGER"], branchCId, [branchCId]);

  const courseAOnly = await courseService.createCourse(admin, {
    name: "Branch A Only Course",
    code: "CBI-A-ONLY",
    fee: 10000,
    branchIds: [branchAId],
  });
  courseAOnlyId = courseAOnly.id;

  const courseAB = await courseService.createCourse(admin, {
    name: "Branch A+B Course",
    code: "CBI-AB",
    fee: 12000,
    branchIds: [branchAId, branchBId],
  });
  courseABId = courseAB.id;
});

after(async () => {
  if (!instituteId) return;
  await prisma.institute.deleteMany({ where: { id: instituteId } });
});

describe("Course branch isolation", () => {
  test("CM of Branch B cannot list or get Branch-A-only course", async () => {
    const listed = await courseService.getCourses(managerB, {});
    const ids = listed.map((c) => c.id);
    assert.ok(!ids.includes(courseAOnlyId));
    assert.ok(ids.includes(courseABId));

    await assert.rejects(
      () => courseService.getCourseById(courseAOnlyId, managerB),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });

  test("Course linked to A+B is visible to both CMs but not Branch C", async () => {
    const listA = await courseService.getCourses(managerA, {});
    const listB = await courseService.getCourses(managerB, {});
    const listC = await courseService.getCourses(managerC, {});

    assert.ok(listA.some((c) => c.id === courseABId));
    assert.ok(listB.some((c) => c.id === courseABId));
    assert.ok(!listC.some((c) => c.id === courseABId));

    await courseService.getCourseById(courseABId, managerA);
    await courseService.getCourseById(courseABId, managerB);
    await assert.rejects(
      () => courseService.getCourseById(courseABId, managerC),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });

  test("Batch create on Branch B rejects Branch-A-only course", async () => {
    await assert.rejects(
      () =>
        batchService.createBatch(instituteId, branchBId, {
          name: "Invalid Batch",
          code: `CBI-BAD-${Date.now()}`,
          branchId: branchBId,
          courseId: courseAOnlyId,
          startDate: new Date().toISOString().slice(0, 10),
          capacity: 20,
          courses: [{ courseId: courseAOnlyId, sequence: 1 }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /not available for this branch/i.test(err.message)
    );
  });

  test("Admin lists all courses; optional branchId filter works", async () => {
    const all = await courseService.getCourses(admin, {});
    const ids = all.map((c) => c.id);
    assert.ok(ids.includes(courseAOnlyId));
    assert.ok(ids.includes(courseABId));

    const filteredA = await courseService.getCourses(admin, { branchId: branchAId });
    const filteredAIds = filteredA.map((c) => c.id);
    assert.ok(filteredAIds.includes(courseAOnlyId));
    assert.ok(filteredAIds.includes(courseABId));

    const filteredC = await courseService.getCourses(admin, { branchId: branchCId });
    const filteredCIds = filteredC.map((c) => c.id);
    assert.ok(!filteredCIds.includes(courseAOnlyId));
    assert.ok(!filteredCIds.includes(courseABId));
  });

  test("Updating branchIds removes visibility from deselected branch", async () => {
    await courseService.updateCourse(courseABId, admin, {
      branchIds: [branchAId],
    });

    const listB = await courseService.getCourses(managerB, {});
    assert.ok(!listB.some((c) => c.id === courseABId));

    await assert.rejects(
      () => courseService.getCourseById(courseABId, managerB),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    // Restore for any subsequent assertions / cleanup clarity
    await courseService.updateCourse(courseABId, admin, {
      branchIds: [branchAId, branchBId],
    });
  });

  test("Curriculum modules for Branch-A-only course are hidden from Branch B CM", async () => {
    await assert.rejects(
      () => moduleService.getModulesByCourse(courseAOnlyId, managerB),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
    const modules = await moduleService.getModulesByCourse(courseAOnlyId, managerA);
    assert.ok(Array.isArray(modules));
  });
});

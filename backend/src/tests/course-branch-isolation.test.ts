import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import * as courseService from "../modules/courses/course.service";
import * as batchService from "../modules/batches/batch.service";
import * as moduleService from "../modules/modules/module.service";
import { AdmissionsService } from "../modules/admissions/admissions.service";
import { assertCourseAvailableForBranch } from "../utils/course-branch.util";
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
        batchService.createBatch(managerB, {
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

  test("createCourse with empty branchIds fails when institute has multiple branches", async () => {
    await assert.rejects(
      () =>
        courseService.createCourse(admin, {
          name: "No Branches",
          code: `CBI-EMPTY-${Date.now()}`,
          fee: 1000,
          branchIds: [],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /select at least one branch/i.test(err.message)
    );
  });

  test("createCourse rejects invalid or inactive branch ids", async () => {
    await assert.rejects(
      () =>
        courseService.createCourse(admin, {
          name: "Bad Branch",
          code: `CBI-BADBR-${Date.now()}`,
          fee: 1000,
          branchIds: ["not-a-real-branch-id"],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /invalid or inactive/i.test(err.message)
    );
  });

  test("createCourse with all branches is visible to every CM (select-all)", async () => {
    const course = await courseService.createCourse(admin, {
      name: "All Branches Course",
      code: `CBI-ALL-${Date.now()}`,
      fee: 15000,
      branchIds: [branchAId, branchBId, branchCId],
    });

    assert.deepEqual(
      [...(course.branchIds ?? [])].sort(),
      [branchAId, branchBId, branchCId].sort()
    );

    for (const manager of [managerA, managerB, managerC]) {
      const listed = await courseService.getCourses(manager, {});
      assert.ok(listed.some((c) => c.id === course.id));
      await courseService.getCourseById(course.id, manager);
    }
  });

  test("duplicate branchIds in create are deduped", async () => {
    const course = await courseService.createCourse(admin, {
      name: "Deduped Branches",
      code: `CBI-DEDUP-${Date.now()}`,
      fee: 5000,
      branchIds: [branchAId, branchAId, branchBId],
    });
    assert.equal(course.branchIds?.length, 2);
    assert.ok(course.branchIds?.includes(branchAId));
    assert.ok(course.branchIds?.includes(branchBId));
  });

  test("single-branch CM create is forced to their own branch even if another id is sent", async () => {
    const course = await courseService.createCourse(managerA, {
      name: "CM Forced Branch",
      code: `CBI-CMFORCE-${Date.now()}`,
      fee: 8000,
      branchIds: [branchBId],
    });
    assert.deepEqual(course.branchIds, [branchAId]);

    const listB = await courseService.getCourses(managerB, {});
    assert.ok(!listB.some((c) => c.id === course.id));
  });

  test("updateCourse rejecting empty branchIds", async () => {
    await assert.rejects(
      () =>
        courseService.updateCourse(courseAOnlyId, admin, {
          branchIds: [],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /select at least one branch/i.test(err.message)
    );
  });

  test("re-adding a branch restores CM visibility", async () => {
    await courseService.updateCourse(courseABId, admin, {
      branchIds: [branchAId],
    });
    assert.ok(
      !(await courseService.getCourses(managerB, {})).some((c) => c.id === courseABId)
    );

    await courseService.updateCourse(courseABId, admin, {
      branchIds: [branchAId, branchBId],
    });
    assert.ok(
      (await courseService.getCourses(managerB, {})).some((c) => c.id === courseABId)
    );
  });

  test("assertCourseAvailableForBranch rejects wrong branch and accepts linked branch", async () => {
    await assert.rejects(
      () => assertCourseAvailableForBranch(instituteId, courseAOnlyId, branchBId),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /not available for this branch/i.test(err.message)
    );

    await assert.doesNotReject(() =>
      assertCourseAvailableForBranch(instituteId, courseAOnlyId, branchAId)
    );
  });

  test("admission create rejects course not linked to target branch", async () => {
    await assert.rejects(
      () =>
        AdmissionsService.createAdmission(
          instituteId,
          branchBId,
          {
            studentName: "Edge Case Student",
            phone: `9${String(Date.now()).slice(-9)}`,
            courseId: courseAOnlyId,
            branchId: branchBId,
            status: "PENDING",
          },
          { userId: admin.id, currentUser: admin }
        ),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /not available for this branch/i.test(err.message)
    );
  });
});

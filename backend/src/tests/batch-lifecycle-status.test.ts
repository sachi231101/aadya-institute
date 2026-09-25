import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import * as batchService from "../modules/batches/batch.service";
import { resolveBatchLifecycleStatus } from "../modules/batches/batch-lifecycle-status.util";
import type { AuthUser } from "../modules/auth/auth.types";
import { istTodayKey } from "../utils/session-window.util";
import { utcNoonFromDateKey } from "../modules/batches/batch-schedule.util";

describe("resolveBatchLifecycleStatus", () => {
  test("before start → UPCOMING", () => {
    assert.strictEqual(
      resolveBatchLifecycleStatus({
        startDate: "2026-09-26",
        expectedEndDate: "2026-12-01",
        todayKey: "2026-09-25",
      }),
      "UPCOMING"
    );
  });

  test("start today, end future → ACTIVE", () => {
    assert.strictEqual(
      resolveBatchLifecycleStatus({
        startDate: "2026-09-25",
        expectedEndDate: "2026-12-01",
        todayKey: "2026-09-25",
      }),
      "ACTIVE"
    );
  });

  test("after expected end → COMPLETED", () => {
    assert.strictEqual(
      resolveBatchLifecycleStatus({
        startDate: "2026-01-01",
        expectedEndDate: "2026-09-24",
        currentStatus: "UPCOMING",
        todayKey: "2026-09-25",
      }),
      "COMPLETED"
    );
  });

  test("CANCELLED overrides past end date", () => {
    assert.strictEqual(
      resolveBatchLifecycleStatus({
        startDate: "2026-01-01",
        expectedEndDate: "2026-09-24",
        currentStatus: "CANCELLED",
        todayKey: "2026-09-25",
      }),
      "CANCELLED"
    );
  });

  test("missing expectedEndDate after start → ACTIVE (not COMPLETED)", () => {
    assert.strictEqual(
      resolveBatchLifecycleStatus({
        startDate: "2026-01-01",
        expectedEndDate: null,
        todayKey: "2026-09-25",
      }),
      "ACTIVE"
    );
  });
});

describe("Batch date-driven status reconcile", () => {
  let instituteId: string;
  let branchId: string;
  let courseId: string;
  const tag = Date.now();
  const createdBatchIds: string[] = [];
  const today = istTodayKey();

  const shiftDay = (dateKey: string, deltaDays: number): string => {
    const d = utcNoonFromDateKey(dateKey);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  };

  const yesterday = shiftDay(today, -1);
  const tomorrow = shiftDay(today, 1);
  const nextMonth = shiftDay(today, 30);

  const adminUser = (): AuthUser => ({
    id: "test-admin-batch-status",
    instituteId,
    branchId,
    roles: ["ADMIN"],
    permissions: [],
    email: `admin-batch-status-${tag}@test.local`,
    name: "Batch Status Admin",
  });

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-BATCH-STATUS" },
      update: {},
      create: { name: "Batch Status Test Institute", code: "TEST-BATCH-STATUS" },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "BS-A" } },
      update: { status: "ACTIVE" },
      create: { instituteId, name: "BS Branch", code: "BS-A", status: "ACTIVE" },
    });
    branchId = branch.id;

    const course = await prisma.course.create({
      data: {
        instituteId,
        name: "Status Course",
        code: `BS-${tag}`,
        fee: 10000,
        courseBranches: { create: [{ branchId }] },
      },
    });
    courseId = course.id;
  });

  after(async () => {
    if (createdBatchIds.length > 0) {
      await prisma.batchEnrollment.deleteMany({ where: { batchId: { in: createdBatchIds } } });
      await prisma.batchSchedule.deleteMany({ where: { batchId: { in: createdBatchIds } } });
      await prisma.batchCourse.deleteMany({ where: { batchId: { in: createdBatchIds } } });
      await prisma.batchModule.deleteMany({ where: { batchId: { in: createdBatchIds } } }).catch(() => undefined);
      await prisma.classSession.deleteMany({ where: { batchId: { in: createdBatchIds } } }).catch(() => undefined);
      await prisma.batch.deleteMany({ where: { id: { in: createdBatchIds } } });
    }
    if (courseId) {
      await prisma.courseBranch.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
  });

  const seedBatch = async (params: {
    code: string;
    startDate: string;
    expectedEndDate: string | null;
    status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  }) => {
    const batch = await prisma.batch.create({
      data: {
        instituteId,
        branchId,
        courseId,
        name: `Status ${params.code}`,
        code: params.code,
        startDate: utcNoonFromDateKey(params.startDate),
        expectedEndDate: params.expectedEndDate
          ? utcNoonFromDateKey(params.expectedEndDate)
          : null,
        status: params.status,
        capacity: 35,
      },
    });
    createdBatchIds.push(batch.id);
    return batch;
  };

  test("end date yesterday + stored UPCOMING → get/list returns and persists COMPLETED", async () => {
    const seeded = await seedBatch({
      code: `BS-DONE-${tag}`,
      startDate: shiftDay(today, -30),
      expectedEndDate: yesterday,
      status: "UPCOMING",
    });

    const got = await batchService.getBatchById(seeded.id, adminUser());
    assert.strictEqual(got.status, "COMPLETED");

    const fromDb = await prisma.batch.findUniqueOrThrow({ where: { id: seeded.id } });
    assert.strictEqual(fromDb.status, "COMPLETED");

    const listed = await batchService.getBatches(adminUser(), { status: "COMPLETED" });
    assert.ok(listed.some((b) => b.id === seeded.id && b.status === "COMPLETED"));
  });

  test("start today, end future → ACTIVE on create", async () => {
    const created = await batchService.createBatch(adminUser(), {
      name: "Active Now",
      code: `BS-ACT-${tag}`,
      courseId,
      branchId,
      startDate: today,
      expectedEndDate: nextMonth,
      status: "UPCOMING",
    });
    createdBatchIds.push(created.id);
    assert.strictEqual(created.status, "ACTIVE");
  });

  test("start tomorrow → UPCOMING on create", async () => {
    const created = await batchService.createBatch(adminUser(), {
      name: "Upcoming Soon",
      code: `BS-UP-${tag}`,
      courseId,
      branchId,
      startDate: tomorrow,
      expectedEndDate: nextMonth,
      status: "ACTIVE",
    });
    createdBatchIds.push(created.id);
    assert.strictEqual(created.status, "UPCOMING");
  });

  test("CANCELLED with past end date stays CANCELLED on list/get", async () => {
    const seeded = await seedBatch({
      code: `BS-CXL-${tag}`,
      startDate: shiftDay(today, -30),
      expectedEndDate: yesterday,
      status: "CANCELLED",
    });

    const got = await batchService.getBatchById(seeded.id, adminUser());
    assert.strictEqual(got.status, "CANCELLED");

    const listed = await batchService.getBatches(adminUser(), { status: "CANCELLED" });
    assert.ok(listed.some((b) => b.id === seeded.id && b.status === "CANCELLED"));

    const fromDb = await prisma.batch.findUniqueOrThrow({ where: { id: seeded.id } });
    assert.strictEqual(fromDb.status, "CANCELLED");
  });
});

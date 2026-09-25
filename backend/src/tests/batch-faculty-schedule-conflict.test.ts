import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import * as batchService from "../modules/batches/batch.service";
import { AppError } from "../middlewares/error.middleware";
import type { AuthUser } from "../modules/auth/auth.types";
import { FACULTY_SCHEDULE_CONFLICT_MESSAGE } from "../modules/batches/batch.service";

describe("Faculty schedule conflict validation", () => {
  let instituteId: string;
  let branchId: string;
  let courseId: string;
  let facultyId: string;
  let otherFacultyId: string;
  let batchAId: string;
  const tag = Date.now();
  const startDate = "2026-04-01";
  const expectedEndDate = "2026-07-01";
  const slot = {
    dayOfWeek: 1,
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    timeSlot: "10:00 AM - 12:00 PM",
  };

  const adminUser = (): AuthUser => ({
    id: "test-admin-fac-conflict",
    instituteId,
    branchId,
    roles: ["ADMIN"],
    permissions: [],
    email: `admin-fac-conflict-${tag}@test.local`,
    name: "Conflict Test Admin",
  });

  const isConflictError = (err: unknown) =>
    err instanceof AppError &&
    err.statusCode === 400 &&
    err.message === FACULTY_SCHEDULE_CONFLICT_MESSAGE;

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-FAC-CONFLICT" },
      update: {},
      create: { name: "Faculty Conflict Test Institute", code: "TEST-FAC-CONFLICT" },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "FC-A" } },
      update: { status: "ACTIVE" },
      create: { instituteId, name: "FC Branch", code: "FC-A", status: "ACTIVE" },
    });
    branchId = branch.id;

    const course = await prisma.course.create({
      data: {
        instituteId,
        name: "Conflict Course",
        code: `FC-${tag}`,
        fee: 10000,
        courseBranches: { create: [{ branchId }] },
      },
    });
    courseId = course.id;

    const facultyUser = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Busy Faculty",
        email: `fc-f1-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    facultyId = (
      await prisma.faculty.create({
        data: {
          userId: facultyUser.id,
          instituteId,
          branchId,
          employeeCode: `FC-F1-${tag}`,
          status: "ACTIVE",
        },
      })
    ).id;

    const otherUser = await prisma.user.create({
      data: {
        instituteId,
        branchId,
        name: "Free Faculty",
        email: `fc-f2-${tag}@test.local`,
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    otherFacultyId = (
      await prisma.faculty.create({
        data: {
          userId: otherUser.id,
          instituteId,
          branchId,
          employeeCode: `FC-F2-${tag}`,
          status: "ACTIVE",
        },
      })
    ).id;

    const batchA = await batchService.createBatch(adminUser(), {
      name: "Batch A Occupied Slot",
      code: `FC-A-${tag}`,
      branchId,
      courseId,
      facultyId,
      startDate,
      expectedEndDate,
      capacity: 20,
      scheduleLines: [
        {
          courseId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeSlot: slot.timeSlot,
          facultyId,
          status: "ACTIVE",
        },
      ],
    });
    batchAId = batchA.id;
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
    await prisma.faculty.deleteMany({ where: { instituteId } });
    await prisma.user.deleteMany({ where: { instituteId } });
    await prisma.course.deleteMany({ where: { instituteId } });
    await prisma.branch.deleteMany({ where: { instituteId } });
    await prisma.institute.deleteMany({ where: { id: instituteId } });
  });

  test("create batch with faculty/day/slot already used by another batch → 400", async () => {
    await assert.rejects(
      () =>
        batchService.createBatch(adminUser(), {
          name: "Batch B Conflict",
          code: `FC-B-${tag}`,
          branchId,
          courseId,
          facultyId,
          startDate,
          expectedEndDate,
          capacity: 20,
          scheduleLines: [
            {
              courseId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              timeSlot: slot.timeSlot,
              facultyId,
              status: "ACTIVE",
            },
          ],
        }),
      isConflictError
    );
  });

  test("update batch into a conflicting slot → 400", async () => {
    const batchB = await batchService.createBatch(adminUser(), {
      name: "Batch B Free Slot",
      code: `FC-B-UPD-${tag}`,
      branchId,
      courseId,
      facultyId: otherFacultyId,
      startDate,
      expectedEndDate,
      capacity: 20,
      scheduleLines: [
        {
          courseId,
          dayOfWeek: 3,
          startTime: "2:00 PM",
          endTime: "4:00 PM",
          timeSlot: "2:00 PM - 4:00 PM",
          facultyId: otherFacultyId,
          status: "ACTIVE",
        },
      ],
    });

    await assert.rejects(
      () =>
        batchService.updateBatch(batchB.id, adminUser(), {
          expectedEndDate,
          scheduleLines: [
            {
              courseId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              timeSlot: slot.timeSlot,
              facultyId,
              status: "ACTIVE",
            },
          ],
        }),
      isConflictError
    );
  });

  test("edit own batch keeping same slots → allowed (excludeBatchId)", async () => {
    const updated = await batchService.updateBatch(batchAId, adminUser(), {
      name: "Batch A Renamed",
      expectedEndDate,
      scheduleLines: [
        {
          courseId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeSlot: slot.timeSlot,
          facultyId,
          status: "ACTIVE",
        },
      ],
    });
    assert.ok(updated);
    assert.strictEqual(updated.count, 1);
  });

  test("two lines in one payload with same faculty/day/slot → 400", async () => {
    await assert.rejects(
      () =>
        batchService.createBatch(adminUser(), {
          name: "Batch Intra Dup",
          code: `FC-DUP-${tag}`,
          branchId,
          courseId,
          facultyId: otherFacultyId,
          startDate,
          expectedEndDate,
          capacity: 20,
          scheduleLines: [
            {
              courseId,
              dayOfWeek: 2,
              startTime: "9:00 AM",
              endTime: "11:00 AM",
              timeSlot: "9:00 AM - 11:00 AM",
              facultyId: otherFacultyId,
              status: "ACTIVE",
            },
            {
              courseId,
              dayOfWeek: 2,
              startTime: "9:00 AM",
              endTime: "11:00 AM",
              timeSlot: "9:00 AM - 11:00 AM",
              facultyId: otherFacultyId,
              status: "ACTIVE",
            },
          ],
        }),
      isConflictError
    );
  });
});

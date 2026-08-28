import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import { assertActiveMaster } from "../modules/masters/master.validator";
import { isAllowedMasterEntityType } from "../modules/masters/master.entity-types";

describe("Master Module Integration Tests", () => {
  let instituteId: string;
  let branchId: string;
  let classroomMasterId: string;
  let inactiveMasterId: string;

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-INST-MASTERS" },
      update: {},
      create: { name: "Test Institute Masters", code: "TEST-INST-MASTERS" },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "BR-MASTER" } },
      update: {},
      create: { instituteId, name: "Master Test Branch", code: "BR-MASTER" },
    });
    branchId = branch.id;

    const classroom = await prisma.masterRecord.create({
      data: {
        instituteId,
        branchId,
        entityType: "classroom",
        name: "Test Lab 201",
        code: "LAB-201",
        status: "ACTIVE",
      },
    });
    classroomMasterId = classroom.id;

    const inactive = await prisma.masterRecord.create({
      data: {
        instituteId,
        entityType: "leadsource",
        name: "Inactive Source",
        code: "INACTIVE_SRC",
        status: "INACTIVE",
      },
    });
    inactiveMasterId = inactive.id;
  });

  after(async () => {
    await prisma.masterRecord.deleteMany({ where: { instituteId } });
    await prisma.branch.deleteMany({ where: { instituteId } });
    await prisma.institute.delete({ where: { id: instituteId } });
    await prisma.$disconnect();
  });

  test("isAllowedMasterEntityType accepts tier 1 types", () => {
    assert.strictEqual(isAllowedMasterEntityType("classroom"), true);
    assert.strictEqual(isAllowedMasterEntityType("leadsource"), true);
    assert.strictEqual(isAllowedMasterEntityType("invalid_type"), false);
  });

  test("assertActiveMaster resolves active classroom for branch", async () => {
    const resolved = await assertActiveMaster({
      instituteId,
      entityType: "classroom",
      masterRecordId: classroomMasterId,
      branchId,
    });
    assert.strictEqual(resolved.id, classroomMasterId);
    assert.strictEqual(resolved.name, "Test Lab 201");
  });

  test("assertActiveMaster rejects inactive master", async () => {
    await assert.rejects(
      () =>
        assertActiveMaster({
          instituteId,
          entityType: "leadsource",
          masterRecordId: inactiveMasterId,
        }),
      (err: Error) => err.message.includes("inactive")
    );
  });

  test("assertActiveMaster rejects wrong entity type", async () => {
    await assert.rejects(
      () =>
        assertActiveMaster({
          instituteId,
          entityType: "paymentmodes",
          masterRecordId: classroomMasterId,
        }),
      (err: Error) => err.message.includes("does not match")
    );
  });
});

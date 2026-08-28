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

  test("isAllowedMasterEntityType accepts numberingseries", () => {
    assert.strictEqual(isAllowedMasterEntityType("numberingseries"), true);
  });

  test("SequenceService generates sequential numbers with configured pattern", async () => {
    const { SequenceService } = await import("../modules/masters/sequence.service");

    // Create a numbering series master record
    await prisma.masterRecord.create({
      data: {
        instituteId,
        entityType: "numberingseries",
        name: "Test Admission Series",
        code: "ADMISSION",
        status: "ACTIVE",
        data: {
          target: "ADMISSION",
          pattern: "TEST/{YEAR}/{SEQ:4}",
          startNumber: 1,
          currentSequence: 0,
          resetFrequency: "YEARLY",
        },
      },
    });

    const currentYear = new Date().getFullYear();
    const num1 = await SequenceService.getNextNumber(instituteId, "ADMISSION");
    const num2 = await SequenceService.getNextNumber(instituteId, "ADMISSION");
    const num3 = await SequenceService.getNextNumber(instituteId, "ADMISSION");

    assert.strictEqual(num1, `TEST/${currentYear}/0001`);
    assert.strictEqual(num2, `TEST/${currentYear}/0002`);
    assert.strictEqual(num3, `TEST/${currentYear}/0003`);
  });

  test("SequenceService previewNextNumber does not increment counter", async () => {
    const { SequenceService } = await import("../modules/masters/sequence.service");
    const currentYear = new Date().getFullYear();

    const preview = await SequenceService.previewNextNumber(instituteId, "ADMISSION");
    assert.strictEqual(preview.currentSequence, 3);
    assert.strictEqual(preview.nextSequence, 4);
    assert.strictEqual(preview.preview, `TEST/${currentYear}/0004`);

    // Actual next number should be 0004
    const actual = await SequenceService.getNextNumber(instituteId, "ADMISSION");
    assert.strictEqual(actual, `TEST/${currentYear}/0004`);
  });

  test("SequenceService falls back gracefully when no series configured", async () => {
    const { SequenceService } = await import("../modules/masters/sequence.service");
    const unconfigured = await SequenceService.getNextNumber(instituteId, "UNCONFIGURED_TARGET");
    assert.ok(unconfigured.length > 5);
  });
});

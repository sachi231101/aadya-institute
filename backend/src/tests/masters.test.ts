import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import { assertActiveMaster } from "../modules/masters/master.validator";
import { isAllowedMasterEntityType } from "../modules/masters/master.entity-types";
import { createMasterService, updateMasterService, deleteMasterService, toggleMasterStatusService } from "../modules/masters/master.service";

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
    const { getRedis } = await import("../config/redis");
    getRedis()?.disconnect();
    await prisma.$disconnect();
  });

  test("isAllowedMasterEntityType accepts tier 1 types", () => {
    assert.strictEqual(isAllowedMasterEntityType("classroom"), true);
    assert.strictEqual(isAllowedMasterEntityType("leadsource"), true);
    assert.strictEqual(isAllowedMasterEntityType("feetypes"), true);
    assert.strictEqual(isAllowedMasterEntityType("termsconditions"), true);
    assert.strictEqual(isAllowedMasterEntityType("holiday"), true);
    assert.strictEqual(isAllowedMasterEntityType("invalid_type"), false);
  });

  test("holiday create requires a valid date", async () => {
    await assert.rejects(
      () =>
        createMasterService(
          { userId: "admin", instituteId, roles: ["ADMIN"] },
          { entityType: "holiday", name: "Missing Date", data: {} }
        ),
      (err: Error) => err.message.includes("YYYY-MM-DD")
    );
  });

  test("fee head rejects an invalid fee type master", async () => {
    await assert.rejects(
      () =>
        createMasterService(
          { userId: "admin", instituteId, roles: ["ADMIN"] },
          {
            entityType: "feeheads",
            name: "Invalid Typed Fee",
            data: { feeTypeMasterId: "missing-fee-type" },
          }
        ),
      (err: Error) => err.message.includes("not found or inactive")
    );
  });

  test("fee head stores the selected fee type id and synchronized name", async () => {
    const feeType = await prisma.masterRecord.create({
      data: {
        instituteId,
        entityType: "feetypes",
        name: "Test Recurring",
        status: "ACTIVE",
      },
    });
    const feeHead = await createMasterService(
      { userId: "admin", instituteId, roles: ["ADMIN"] },
      {
        entityType: "feeheads",
        name: "Test Monthly Fee",
        data: { feeTypeMasterId: feeType.id },
      }
    );
    const data = feeHead.data as { feeTypeMasterId?: string; type?: string };
    assert.strictEqual(data.feeTypeMasterId, feeType.id);
    assert.strictEqual(data.type, feeType.name);
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

  test("SequenceService auto-creates series from default pattern when none configured", async () => {
    const { SequenceService } = await import("../modules/masters/sequence.service");
    const currentYear = new Date().getFullYear();
    const unconfigured = await SequenceService.getNextNumber(instituteId, "UNCONFIGURED_TARGET");
    assert.strictEqual(unconfigured, `AADYA/${currentYear}/0001`);
  });

  test("SequenceService generates INVOICE numbers from master pattern", async () => {
    const { SequenceService } = await import("../modules/masters/sequence.service");
    const currentYear = new Date().getFullYear();

    await prisma.masterRecord.updateMany({
      where: { instituteId, entityType: "numberingseries", code: "INVOICE" },
      data: { status: "INACTIVE" },
    });

    await prisma.masterRecord.create({
      data: {
        instituteId,
        entityType: "numberingseries",
        name: "Test Invoice Series",
        code: "INVOICE",
        status: "ACTIVE",
        data: {
          target: "INVOICE",
          // Unique prefix avoids collisions with real INV/{YEAR}/… rows in shared DB
          pattern: "TINV/{YEAR}/{SEQ:4}",
          startNumber: 1,
          currentSequence: 0,
          resetFrequency: "YEARLY",
          lastResetPeriod: String(currentYear),
        },
      },
    });

    const inv1 = await SequenceService.getNextNumber(instituteId, "INVOICE");
    const inv2 = await SequenceService.getNextNumber(instituteId, "INVOICE");
    assert.strictEqual(inv1, `TINV/${currentYear}/0001`);
    assert.strictEqual(inv2, `TINV/${currentYear}/0002`);
    assert.ok(!inv1.includes("LEGACY"));
    assert.ok(!/^\d{4}$/.test(inv1));
  });

  test("SequenceService RECEIPT skips globally taken receipt numbers", async () => {
    const { SequenceService } = await import("../modules/masters/sequence.service");
    const currentYear = new Date().getFullYear();
    const taken = `XRCP/${currentYear}/0001`;

    const otherInstitute = await prisma.institute.create({
      data: {
        name: `Receipt Collision Inst ${Date.now()}`,
        code: `RCI${Date.now().toString().slice(-6)}`,
      },
    });

    await prisma.payment.create({
      data: {
        receiptNo: taken,
        instituteId: otherInstitute.id,
        studentName: "Other Institute Student",
        admissionNo: "OTHER-ADM",
        courseName: "Test",
        amount: 100,
        method: "CASH",
        status: "SUCCESS",
      },
    });

    // Deactivate any existing RECEIPT series for this institute so our test series wins by code.
    await prisma.masterRecord.updateMany({
      where: { instituteId, entityType: "numberingseries", code: "RECEIPT" },
      data: { status: "INACTIVE" },
    });

    await prisma.masterRecord.create({
      data: {
        instituteId,
        entityType: "numberingseries",
        name: "Receipt Global Collision Series",
        code: "RECEIPT",
        status: "ACTIVE",
        data: {
          target: "RECEIPT",
          pattern: "XRCP/{YEAR}/{SEQ:4}",
          startNumber: 1,
          currentSequence: 0,
          resetFrequency: "YEARLY",
          lastResetPeriod: String(currentYear),
        },
      },
    });

    const next = await SequenceService.getNextNumber(instituteId, "RECEIPT");
    assert.strictEqual(next, `XRCP/${currentYear}/0002`);

    await prisma.payment.deleteMany({ where: { instituteId: otherInstitute.id } });
    await prisma.institute.delete({ where: { id: otherInstitute.id } });
  });

  test("timeslot uniqueness is scoped by branchId; active list returns branch + shared", async () => {
    const { findActiveMasterRecords } = await import(
      "../modules/masters/master.repository"
    );

    const branchB = await prisma.branch.create({
      data: {
        instituteId,
        name: "Master Test Branch B",
        code: `BR-M-${Date.now().toString().slice(-5)}`,
      },
    });

    const slotName = "11:00 AM - 11:15 AM";
    const slotData = {
      startTime: "11:00 AM",
      endTime: "11:15 AM",
      slotType: "BREAK",
    };

    const shared = await createMasterService(
      { userId: "admin", instituteId, roles: ["ADMIN"] },
      {
        entityType: "timeslot",
        name: "9:00 AM - 10:00 AM",
        data: { startTime: "9:00 AM", endTime: "10:00 AM", slotType: "TEACHING" },
      }
    );
    assert.strictEqual(shared.branchId, null);

    const onA = await createMasterService(
      { userId: "admin", instituteId, roles: ["ADMIN"] },
      {
        entityType: "timeslot",
        name: slotName,
        branchId,
        data: slotData,
      }
    );
    assert.strictEqual(onA.branchId, branchId);

    const onB = await createMasterService(
      { userId: "admin", instituteId, roles: ["ADMIN"] },
      {
        entityType: "timeslot",
        name: slotName,
        branchId: branchB.id,
        data: slotData,
      }
    );
    assert.strictEqual(onB.branchId, branchB.id);

    await assert.rejects(
      () =>
        createMasterService(
          { userId: "admin", instituteId, roles: ["ADMIN"] },
          {
            entityType: "timeslot",
            name: slotName,
            branchId,
            data: slotData,
          }
        ),
      (err: Error) => err.message.includes("already exists")
    );

    const forA = await findActiveMasterRecords(instituteId, "timeslot", branchId);
    const idsForA = forA.map((r) => r.id);
    assert.ok(idsForA.includes(shared.id), "shared (null branch) slot visible for branch A");
    assert.ok(idsForA.includes(onA.id), "branch A break visible for branch A");
    assert.ok(!idsForA.includes(onB.id), "branch B break hidden for branch A");

    const forB = await findActiveMasterRecords(instituteId, "timeslot", branchB.id);
    const idsForB = forB.map((r) => r.id);
    assert.ok(idsForB.includes(shared.id));
    assert.ok(idsForB.includes(onB.id));
    assert.ok(!idsForB.includes(onA.id));

    await prisma.branch.delete({ where: { id: branchB.id } });
  });

  test("center manager cannot mutate shared (All branches) timeslot", async () => {
    const shared = await createMasterService(
      { userId: "admin", instituteId, roles: ["ADMIN"] },
      {
        entityType: "timeslot",
        name: "2:00 PM - 2:15 PM CM-GUARD",
        data: { startTime: "2:00 PM", endTime: "2:15 PM", slotType: "BREAK" },
      }
    );
    assert.strictEqual(shared.branchId, null);

    const cm = {
      userId: "cm-user",
      instituteId,
      branchId,
      roles: ["CENTER_MANAGER"],
    };

    await assert.rejects(
      () =>
        updateMasterService(cm, shared.id, {
          name: "2:00 PM - 2:15 PM hijacked",
          branchId,
        }),
      (err: Error & { statusCode?: number }) =>
        err.message.includes("not found") || err.statusCode === 404
    );

    await assert.rejects(
      () => deleteMasterService(cm, shared.id),
      (err: Error & { statusCode?: number }) =>
        err.message.includes("not found") || err.statusCode === 404
    );

    await assert.rejects(
      () => toggleMasterStatusService(cm, shared.id),
      (err: Error & { statusCode?: number }) =>
        err.message.includes("not found") || err.statusCode === 404
    );

    await prisma.masterRecord.delete({ where: { id: shared.id } });
  });
});

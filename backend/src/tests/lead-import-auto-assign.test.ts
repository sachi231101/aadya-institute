/**
 * Excel / CSV lead upload + dial-on-ingest (counsellor assign deferred to post-call score).
 * Covers header aliases, Branch Name resolve, xlsx preview, ingest dial, manual assign.
 */
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import ExcelJS from "exceljs";
import { prisma } from "../config/database";
import { getRedis } from "../config/redis";
import type { AuthUser } from "../modules/auth/auth.types";
import {
  DEFAULT_LEAD_INTERESTED_IN,
  LEADS_IMPORT_TEMPLATE_CSV,
  applyLeadImportDefaults,
  canonicalizeLeadImportRow,
  loadImportRows,
  normalizeImportHeader,
  normalizeImportPhone,
  parseXlsxBuffer,
  resolveLeadBranchId,
} from "../modules/data-management/lead-import.util";
import { DataManagementService } from "../modules/data-management/data-management.service";
import { ingestLeadRow } from "../modules/leads/services/lead-ingest.service";
import { resetAutoAssignCountersForTests } from "../modules/leads/services/lead-auto-assign.service";
import { LeadAssignmentService } from "../modules/leads/services/lead-assignment.service";
import { LeadService } from "../modules/leads/lead.service";
import { aiCallingQueue } from "../queues/ai-calling.queue";

// ---------------------------------------------------------------------------
// 1. Header aliases + Branch Name resolve (pure)
// ---------------------------------------------------------------------------

describe("Lead import header aliases + Branch Name resolve", () => {
  test("normalizeImportHeader strips BOM, case, spaces, dashes, underscores", () => {
    assert.strictEqual(normalizeImportHeader("Phone Number"), "phonenumber");
    assert.strictEqual(normalizeImportHeader("\uFEFFBranch Name"), "branchname");
    assert.strictEqual(normalizeImportHeader("phone_number"), "phonenumber");
    assert.strictEqual(normalizeImportHeader("Interested-In"), "interestedin");
  });

  test("canonicalizeLeadImportRow maps human + legacy headers", () => {
    const row = canonicalizeLeadImportRow({
      Name: "Priya",
      "Phone Number": "9876543210",
      Email: "priya@test.org",
      "Interested In": "NEET",
      "Branch Name": "Bengaluru HQ",
      Source: "AI_CALLING",
    });
    assert.deepStrictEqual(row, {
      name: "Priya",
      phoneNumber: "9876543210",
      email: "priya@test.org",
      interestedIn: "NEET",
      branchName: "Bengaluru HQ",
      source: "AI_CALLING",
    });

    const legacy = canonicalizeLeadImportRow({
      name: "Rahul",
      phoneNumber: "9123456789",
      branchId: "branch-uuid-1",
    });
    assert.strictEqual(legacy.branchId, "branch-uuid-1");
    assert.strictEqual(legacy.name, "Rahul");
  });

  test("applyLeadImportDefaults fills interestedIn when blank", () => {
    const withDefault = applyLeadImportDefaults({ name: "A", phoneNumber: "1" });
    assert.strictEqual(withDefault.interestedIn, DEFAULT_LEAD_INTERESTED_IN);

    const kept = applyLeadImportDefaults({
      name: "A",
      phoneNumber: "1",
      interestedIn: "MBA",
    });
    assert.strictEqual(kept.interestedIn, "MBA");
  });

  test("LEADS_IMPORT_TEMPLATE_CSV uses human-friendly headers", () => {
    assert.ok(LEADS_IMPORT_TEMPLATE_CSV.startsWith("Name,Phone Number,"));
    assert.ok(LEADS_IMPORT_TEMPLATE_CSV.includes("Branch Name"));
    assert.ok(!LEADS_IMPORT_TEMPLATE_CSV.toLowerCase().includes("branchid"));
  });

  test("resolveLeadBranchId happy path (case-insensitive Branch Name)", () => {
    const branchNameToId = new Map([
      ["bengaluru hq", "br-1"],
      ["mysuru", "br-2"],
    ]);
    const allowed = new Set(["br-1", "br-2"]);

    const ok = resolveLeadBranchId(
      { branchName: "  Bengaluru HQ  " },
      branchNameToId,
      allowed
    );
    assert.strictEqual(ok.branchId, "br-1");
    assert.strictEqual(ok.error, undefined);
  });

  test("resolveLeadBranchId unknown Branch Name returns error", () => {
    const branchNameToId = new Map([["bengaluru hq", "br-1"]]);
    const allowed = new Set(["br-1"]);

    const bad = resolveLeadBranchId(
      { branchName: "Unknown Campus" },
      branchNameToId,
      allowed
    );
    assert.strictEqual(bad.branchId, undefined);
    assert.match(bad.error ?? "", /Unknown Branch Name: Unknown Campus/);
  });

  test("normalizeImportPhone handles scientific notation and .0 suffix", () => {
    assert.strictEqual(normalizeImportPhone("9.87654321e+9"), "9876543210");
    assert.strictEqual(normalizeImportPhone("9876543210.0"), "9876543210");
    assert.strictEqual(normalizeImportPhone("+91 98765 43210"), "+91 98765 43210");
  });

  test("resolveLeadBranchId prefers valid legacy branchId", () => {
    const branchNameToId = new Map([["bengaluru hq", "br-1"]]);
    const allowed = new Set(["br-1", "br-legacy"]);

    const viaId = resolveLeadBranchId(
      { branchId: "br-legacy", branchName: "Ignored Name" },
      branchNameToId,
      allowed
    );
    assert.strictEqual(viaId.branchId, "br-legacy");

    const badId = resolveLeadBranchId(
      { branchId: "not-in-institute" },
      branchNameToId,
      allowed
    );
    assert.match(badId.error ?? "", /not in this institute/);
  });

  test("resolveLeadBranchId requires Branch Name or branchId", () => {
    const result = resolveLeadBranchId({}, new Map(), new Set());
    assert.match(result.error ?? "", /Branch Name or branchId is required/);
  });
});

// ---------------------------------------------------------------------------
// 2. Excel sample buffer → parse / preview
// ---------------------------------------------------------------------------

async function buildSampleLeadsXlsx(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");
  for (const row of rows) {
    sheet.addRow(row);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("Lead import Excel parse + preview", () => {
  let instituteId: string;
  let branchId: string;
  let branchName: string;
  let admin: AuthUser;
  let userId: string;

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-LEAD-IMPORT-XLSX" },
      update: {
        name: "Lead Import Xlsx Test",
        timezone: "Asia/Kolkata",
        status: "ACTIVE",
      },
      create: {
        name: "Lead Import Xlsx Test",
        code: "TEST-LEAD-IMPORT-XLSX",
        email: "lead-import-xlsx@test.org",
        timezone: "Asia/Kolkata",
      },
    });
    instituteId = institute.id;

    branchName = "Import Test HQ";
    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "IMP-XLSX-HQ" } },
      update: { name: branchName, status: "ACTIVE" },
      create: {
        instituteId,
        name: branchName,
        code: "IMP-XLSX-HQ",
      },
    });
    branchId = branch.id;

    let user = await prisma.user.findFirst({
      where: { email: "lead-import-xlsx-admin@test.org" },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Import Xlsx Admin",
          email: "lead-import-xlsx-admin@test.org",
          phone: "9000000401",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId,
          branchId,
          status: "ACTIVE",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { instituteId, branchId, status: "ACTIVE" },
      });
    }
    userId = user.id;

    admin = {
      id: userId,
      userId,
      name: user.name,
      email: user.email ?? "",
      instituteId,
      branchId,
      roles: ["ADMIN"],
      permissions: ["*"],
    };
  });

  after(async () => {
    await prisma.dataImportJob.deleteMany({ where: { instituteId } });
  });

  test("parseXlsxBuffer reads human headers into row maps", async () => {
    const buffer = await buildSampleLeadsXlsx([
      ["Name", "Phone Number", "Email", "Interested In", "Branch Name", "Source"],
      ["Asha", "9876501101", "asha@test.org", "NEET", branchName, "AI_CALLING"],
    ]);

    const parsed = await parseXlsxBuffer(buffer);
    assert.ok(parsed.headers.includes("Name"));
    assert.ok(parsed.headers.includes("Branch Name"));
    assert.strictEqual(parsed.rows.length, 1);
    assert.strictEqual(parsed.rows[0]["Name"], "Asha");
    assert.strictEqual(parsed.rows[0]["Phone Number"], "9876501101");
    assert.strictEqual(parsed.rows[0]["Branch Name"], branchName);
  });

  test("loadImportRows from fileBase64 + preview resolves Branch Name", async () => {
    const buffer = await buildSampleLeadsXlsx([
      ["Name", "Phone Number", "Email", "Interested In", "Branch Name", "Source"],
      ["Vikram", "9876501102", "", "", branchName, ""],
      ["Bad Branch", "9876501103", "", "MBA", "No Such Campus", "WALK_IN"],
    ]);

    const loaded = await loadImportRows({
      fileBase64: buffer.toString("base64"),
      fileName: "leads-sample.xlsx",
    });
    assert.strictEqual(loaded.source, "xlsx");
    assert.strictEqual(loaded.rows.length, 2);

    const preview = await DataManagementService.previewImport(admin, {
      entityType: "leads",
      fileBase64: buffer.toString("base64"),
      fileName: "leads-sample.xlsx",
      defaultLeadSource: "AI_CALLING",
    });

    assert.strictEqual(preview.totalRows, 2);
    assert.strictEqual(preview.validRows, 1);
    assert.strictEqual(preview.errorRows, 1);
    assert.strictEqual(preview.preview.length, 1);
    assert.strictEqual(preview.preview[0].name, "Vikram");
    assert.strictEqual(preview.preview[0].branchId, branchId);
    assert.strictEqual(preview.preview[0].interestedIn, DEFAULT_LEAD_INTERESTED_IN);
    assert.ok(
      preview.errors.some((e) => /Unknown Branch Name/i.test(e.message)),
      "unknown branch must surface as preview error"
    );
  });

  test("CSV preview with Branch Name also validates", async () => {
    const csv = [
      "Name,Phone Number,Email,Interested In,Branch Name,Source",
      `Meera,9876501104,meera@test.org,Full Stack,${branchName},WALK_IN`,
    ].join("\n");

    const preview = await DataManagementService.previewImport(admin, {
      entityType: "leads",
      csv,
      fileName: "leads.csv",
    });

    assert.strictEqual(preview.validRows, 1);
    assert.strictEqual(preview.errorRows, 0);
    assert.strictEqual(preview.preview[0].branchId, branchId);
    assert.strictEqual(preview.preview[0].phoneNumber, "9876501104");
  });
});

// ---------------------------------------------------------------------------
// 3–4. Ingest round-robin auto-assign + dial + manual reassign
// ---------------------------------------------------------------------------

describe("Lead ingest auto-assign round-robin + dial + manual reassign", () => {
  let instituteId: string;
  let branchId: string;
  let counsellorAId: string;
  let counsellorBId: string;
  let adminUserId: string;
  let admin: AuthUser;
  let originalQueueAdd: typeof aiCallingQueue.add;
  let queueAdds: Array<{ name: string; data: unknown }> = [];

  const phone1 = "9876502201";
  const phone2 = "9876502202";
  const phone3 = "9876502203";

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-LEAD-AUTO-ASSIGN" },
      update: {
        name: "Lead Auto Assign Test",
        timezone: "Asia/Kolkata",
        status: "ACTIVE",
      },
      create: {
        name: "Lead Auto Assign Test",
        code: "TEST-LEAD-AUTO-ASSIGN",
        email: "lead-auto-assign@test.org",
        timezone: "Asia/Kolkata",
      },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "AUTO-ASSIGN-HQ" } },
      update: { name: "Auto Assign HQ", status: "ACTIVE" },
      create: {
        instituteId,
        name: "Auto Assign HQ",
        code: "AUTO-ASSIGN-HQ",
      },
    });
    branchId = branch.id;

    const counsellorRole = await prisma.role.upsert({
      where: { name: "COUNSELLOR" },
      update: {},
      create: { name: "COUNSELLOR" },
    });

    let adminUser = await prisma.user.findFirst({
      where: { email: "lead-auto-assign-admin@test.org" },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: "Auto Assign Admin",
          email: "lead-auto-assign-admin@test.org",
          phone: "9000000501",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId,
          branchId,
          status: "ACTIVE",
        },
      });
    } else {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { instituteId, branchId, status: "ACTIVE" },
      });
    }
    adminUserId = adminUser.id;

    admin = {
      id: adminUserId,
      userId: adminUserId,
      name: adminUser.name,
      email: adminUser.email ?? "",
      instituteId,
      branchId,
      roles: ["ADMIN"],
      permissions: ["*"],
    };

    // Two ACTIVE counsellors on the SAME branch (ordered by createdAt for RR)
    let cA = await prisma.user.findFirst({
      where: { email: "lead-auto-assign-c-a@test.org" },
    });
    if (!cA) {
      cA = await prisma.user.create({
        data: {
          name: "RR Counsellor A",
          email: "lead-auto-assign-c-a@test.org",
          phone: "9000000502",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId,
          branchId,
          status: "ACTIVE",
        },
      });
    } else {
      cA = await prisma.user.update({
        where: { id: cA.id },
        data: { instituteId, branchId, status: "ACTIVE", name: "RR Counsellor A" },
      });
    }
    counsellorAId = cA.id;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: cA.id, roleId: counsellorRole.id } },
      update: {},
      create: { userId: cA.id, roleId: counsellorRole.id },
    });

    // Ensure B is created after A for stable orderBy createdAt asc
    await new Promise((r) => setTimeout(r, 20));

    let cB = await prisma.user.findFirst({
      where: { email: "lead-auto-assign-c-b@test.org" },
    });
    if (!cB) {
      cB = await prisma.user.create({
        data: {
          name: "RR Counsellor B",
          email: "lead-auto-assign-c-b@test.org",
          phone: "9000000503",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId,
          branchId,
          status: "ACTIVE",
        },
      });
    } else {
      cB = await prisma.user.update({
        where: { id: cB.id },
        data: { instituteId, branchId, status: "ACTIVE", name: "RR Counsellor B" },
      });
    }
    counsellorBId = cB.id;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: cB.id, roleId: counsellorRole.id } },
      update: {},
      create: { userId: cB.id, roleId: counsellorRole.id },
    });

    // If both already existed, force createdAt order so A < B
    if (cA.createdAt >= cB.createdAt) {
      await prisma.user.update({
        where: { id: counsellorAId },
        data: { createdAt: new Date(Date.now() - 60_000) },
      });
      await prisma.user.update({
        where: { id: counsellorBId },
        data: { createdAt: new Date(Date.now() - 30_000) },
      });
    }

    await prisma.instituteAiCallingConfig.upsert({
      where: { instituteId },
      create: {
        instituteId,
        fromNumber: "+910000000088",
        callingScript: "Auto-assign dial script",
        isEnabled: true,
        dailyCallLimit: 200,
        maxAttemptsPerLead: 3,
      },
      update: {
        fromNumber: "+910000000088",
        isEnabled: true,
        dailyCallLimit: 200,
        maxAttemptsPerLead: 3,
        callingHoursStart: null,
        callingHoursEnd: null,
        callingDays: [],
      },
    });

    originalQueueAdd = aiCallingQueue.add.bind(aiCallingQueue);
  });

  beforeEach(async () => {
    queueAdds = [];
    (aiCallingQueue as { add: typeof aiCallingQueue.add }).add = (async (
      name: string,
      data: unknown
    ) => {
      queueAdds.push({ name, data });
      return { id: `test-stub-${queueAdds.length}` } as Awaited<
        ReturnType<typeof aiCallingQueue.add>
      >;
    }) as typeof aiCallingQueue.add;

    // Reset RR cursor so first ingest lands on counsellor[0] (createdAt asc)
    await resetAutoAssignCountersForTests(instituteId, branchId);

    await prisma.callLog.deleteMany({ where: { instituteId } });
    await prisma.leadActivity.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.leadAssignment.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.leadFollowUp.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.leadStageHistory.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.lead.deleteMany({ where: { instituteId } });
    await prisma.aiCallingUsageDaily.deleteMany({ where: { instituteId } });
  });

  after(async () => {
    if (originalQueueAdd) {
      (aiCallingQueue as { add: typeof aiCallingQueue.add }).add = originalQueueAdd;
    }
    await prisma.callLog.deleteMany({ where: { instituteId } });
    await prisma.leadActivity.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.leadAssignment.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.leadFollowUp.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.leadStageHistory.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.lead.deleteMany({ where: { instituteId } });
    await prisma.dataImportJob.deleteMany({ where: { instituteId } });
    await prisma.aiCallingUsageDaily.deleteMany({ where: { instituteId } });
    const redis = getRedis();
    if (redis) {
      try {
        await redis.quit();
      } catch {
        // ignore
      }
    }
    await prisma.$disconnect();
  });

  test("ingest leaves counsellor unassigned and still enqueues dial", async () => {
    const ordered = await prisma.user.findMany({
      where: {
        instituteId,
        branchId,
        status: "ACTIVE",
        userRoles: { some: { role: { name: "COUNSELLOR" } } },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    assert.ok(ordered.length >= 2);
    assert.strictEqual(ordered[0].id, counsellorAId);
    assert.strictEqual(ordered[1].id, counsellorBId);

    const first = await ingestLeadRow({
      instituteId,
      createdById: adminUserId,
      defaultSource: "AI_CALLING",
      row: {
        name: "RR Lead One",
        phoneNumber: phone1,
        interestedIn: "NEET",
        branchId,
      },
    });
    assert.strictEqual(first.created, true);
    assert.strictEqual(first.dialQueued, true);
    assert.strictEqual(first.autoAssigned, false);

    const second = await ingestLeadRow({
      instituteId,
      createdById: adminUserId,
      defaultSource: "AI_CALLING",
      row: {
        name: "RR Lead Two",
        phoneNumber: phone2,
        interestedIn: "MBA",
        branchId,
      },
    });
    assert.strictEqual(second.created, true);
    assert.strictEqual(second.dialQueued, true);
    assert.strictEqual(second.autoAssigned, false);

    const third = await ingestLeadRow({
      instituteId,
      createdById: adminUserId,
      defaultSource: "AI_CALLING",
      row: {
        name: "RR Lead Three",
        phoneNumber: "9876502204",
        interestedIn: "CA",
        branchId,
      },
    });
    assert.strictEqual(third.created, true);
    assert.strictEqual(third.dialQueued, true);
    assert.strictEqual(third.autoAssigned, false);

    const lead1 = await prisma.lead.findUnique({ where: { id: first.leadId } });
    const lead2 = await prisma.lead.findUnique({ where: { id: second.leadId } });
    const lead3 = await prisma.lead.findUnique({ where: { id: third.leadId } });
    assert.ok(lead1 && lead2 && lead3);

    assert.strictEqual(
      lead1!.assignedCounsellorId,
      null,
      "ingest must not auto-assign (score threshold runs post-call)"
    );
    assert.strictEqual(lead2!.assignedCounsellorId, null);
    assert.strictEqual(lead3!.assignedCounsellorId, null);

    const assignment1 = await prisma.leadAssignment.findFirst({
      where: { leadId: first.leadId, isCurrent: true },
    });
    const assignment2 = await prisma.leadAssignment.findFirst({
      where: { leadId: second.leadId, isCurrent: true },
    });
    assert.strictEqual(assignment1, null);
    assert.strictEqual(assignment2, null);

    // Dial still enqueued (CallLog + queue stub)
    const call1 = await prisma.callLog.findFirst({
      where: { leadId: first.leadId, instituteId },
    });
    const call2 = await prisma.callLog.findFirst({
      where: { leadId: second.leadId, instituteId },
    });
    const call3 = await prisma.callLog.findFirst({
      where: { leadId: third.leadId, instituteId },
    });
    assert.ok(call1, "first ingest must create CallLog via startInitialAiCall");
    assert.ok(call2, "second ingest must create CallLog via startInitialAiCall");
    assert.ok(call3, "third ingest must create CallLog via startInitialAiCall");
    assert.ok(
      queueAdds.length >= 3,
      `expected ≥3 queue adds, got ${queueAdds.length}`
    );
  });

  test("manual assign works on unassigned ingested lead", async () => {
    const ingested = await ingestLeadRow({
      instituteId,
      createdById: adminUserId,
      defaultSource: "AI_CALLING",
      row: {
        name: "Reassign Lead",
        phoneNumber: phone3,
        interestedIn: "Full Stack",
        branchId,
      },
    });
    assert.strictEqual(ingested.created, true);
    assert.strictEqual(ingested.autoAssigned, false);

    const afterIngest = await prisma.lead.findUnique({
      where: { id: ingested.leadId },
    });
    assert.ok(afterIngest);
    assert.strictEqual(afterIngest!.assignedCounsellorId, null);

    const result = await LeadService.assignLead(ingested.leadId, admin, {
      counsellorId: counsellorAId,
      notes: "Manual assign after ingest (no auto-assign)",
    });

    assert.strictEqual(result.lead.assignedCounsellorId, counsellorAId);

    const current = await prisma.leadAssignment.findMany({
      where: { leadId: ingested.leadId },
      orderBy: { assignedAt: "asc" },
    });
    assert.ok(current.length >= 1);
    const active = current.filter((a) => a.isCurrent);
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].counsellorId, counsellorAId);

    const reassigned = await LeadService.assignLead(ingested.leadId, admin, {
      counsellorId: counsellorBId,
      notes: "Manual reassign",
    });
    assert.strictEqual(reassigned.lead.assignedCounsellorId, counsellorBId);

    await LeadAssignmentService.assignLeadInternal({
      leadId: ingested.leadId,
      counsellorId: counsellorAId,
      assignedById: adminUserId,
      assignedByName: "Test internal",
      notes: "Internal reassign back",
      notify: false,
    });
    const back = await prisma.lead.findUnique({ where: { id: ingested.leadId } });
    assert.strictEqual(back!.assignedCounsellorId, counsellorAId);
  });
});

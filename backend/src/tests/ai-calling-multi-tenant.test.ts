import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import { AppError } from "../middlewares/error.middleware";
import { ingestLeadRow } from "../modules/leads/services/lead-ingest.service";
import { LeadService } from "../modules/leads/lead.service";
import { AiCallingService } from "../modules/ai-calling/ai-calling.service";
import { resolveAiCallingConfig } from "../modules/ai-calling/ai-calling.config";
import {
  buildIdempotencyKey,
  mapProviderCallStatus,
} from "../modules/ai-calling/ai-calling.types";
import {
  isWithinCallingHours,
  msUntilNextCallingWindow,
  usageDateKey,
} from "../modules/ai-calling/ai-calling.hours";
import { aiCallingQueue } from "../queues/ai-calling.queue";

type QueueAddCapture = {
  name: string;
  data: unknown;
  opts?: { delay?: number };
};

describe("Multi-tenant AI Calling — hours helpers", () => {
  test("isWithinCallingHours allows when no hours configured", () => {
    assert.strictEqual(
      isWithinCallingHours({
        timezone: "Asia/Kolkata",
        callingHoursStart: null,
        callingHoursEnd: null,
        callingDays: null,
      }),
      true
    );
  });

  test("isWithinCallingHours rejects wrong weekday", () => {
    // 2026-09-08 is a Tuesday (weekday 2)
    const tuesday = new Date("2026-09-08T10:00:00.000Z");
    assert.strictEqual(
      isWithinCallingHours({
        now: tuesday,
        timezone: "UTC",
        callingHoursStart: "00:00",
        callingHoursEnd: "23:59",
        callingDays: [0, 1], // Sun/Mon only
      }),
      false
    );
  });

  test("isWithinCallingHours respects HH:MM window", () => {
    const noonUtc = new Date("2026-09-08T12:00:00.000Z");
    assert.strictEqual(
      isWithinCallingHours({
        now: noonUtc,
        timezone: "UTC",
        callingHoursStart: "09:00",
        callingHoursEnd: "17:00",
        callingDays: null,
      }),
      true
    );
    assert.strictEqual(
      isWithinCallingHours({
        now: noonUtc,
        timezone: "UTC",
        callingHoursStart: "14:00",
        callingHoursEnd: "17:00",
        callingDays: null,
      }),
      false
    );
  });

  test("msUntilNextCallingWindow returns delay when outside hours", () => {
    const noonUtc = new Date("2026-09-08T12:00:00.000Z");
    const delay = msUntilNextCallingWindow({
      now: noonUtc,
      timezone: "UTC",
      callingHoursStart: "14:00",
      callingHoursEnd: "17:00",
      callingDays: null,
    });
    assert.ok(delay > 0);
  });

  test("mapProviderCallStatus maps common provider statuses", () => {
    assert.strictEqual(mapProviderCallStatus("connected"), "COMPLETED");
    assert.strictEqual(mapProviderCallStatus("no_answer"), "NO_ANSWER");
    assert.strictEqual(mapProviderCallStatus("busy"), "BUSY");
  });
});

describe("Multi-tenant AI Calling — isolation & business rules", () => {
  let instituteAId: string;
  let instituteBId: string;
  let branchAId: string;
  let branchBId: string;
  let adminA: AuthUser;
  let adminB: AuthUser;
  let userAId: string;
  let userBId: string;

  const phoneShared = "9876543210";
  const phoneUniqueA = "9123456780";
  const phoneUniqueB = "9123456781";

  let queueAdds: QueueAddCapture[] = [];
  let originalQueueAdd: typeof aiCallingQueue.add;

  before(async () => {
    const instituteA = await prisma.institute.upsert({
      where: { code: "TEST-AICALL-A" },
      update: {
        name: "AI Call Academy A",
        timezone: "Asia/Kolkata",
        status: "ACTIVE",
      },
      create: {
        name: "AI Call Academy A",
        code: "TEST-AICALL-A",
        email: "aicall-a@test.org",
        timezone: "Asia/Kolkata",
      },
    });
    instituteAId = instituteA.id;

    const instituteB = await prisma.institute.upsert({
      where: { code: "TEST-AICALL-B" },
      update: {
        name: "AI Call Academy B",
        timezone: "Asia/Kolkata",
        status: "ACTIVE",
      },
      create: {
        name: "AI Call Academy B",
        code: "TEST-AICALL-B",
        email: "aicall-b@test.org",
        timezone: "Asia/Kolkata",
      },
    });
    instituteBId = instituteB.id;

    const branchA = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId: instituteAId, code: "AIC-A-HQ" } },
      update: {},
      create: {
        instituteId: instituteAId,
        name: "AIC A HQ",
        code: "AIC-A-HQ",
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId: instituteBId, code: "AIC-B-HQ" } },
      update: {},
      create: {
        instituteId: instituteBId,
        name: "AIC B HQ",
        code: "AIC-B-HQ",
      },
    });
    branchBId = branchB.id;

    let userA = await prisma.user.findFirst({
      where: { email: "aicall-admin-a@test.org" },
    });
    if (!userA) {
      userA = await prisma.user.create({
        data: {
          name: "AIC Admin A",
          email: "aicall-admin-a@test.org",
          phone: "9000000201",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId: instituteAId,
          branchId: branchAId,
          status: "ACTIVE",
        },
      });
    } else {
      userA = await prisma.user.update({
        where: { id: userA.id },
        data: {
          instituteId: instituteAId,
          branchId: branchAId,
          status: "ACTIVE",
        },
      });
    }
    userAId = userA.id;

    let userB = await prisma.user.findFirst({
      where: { email: "aicall-admin-b@test.org" },
    });
    if (!userB) {
      userB = await prisma.user.create({
        data: {
          name: "AIC Admin B",
          email: "aicall-admin-b@test.org",
          phone: "9000000202",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId: instituteBId,
          branchId: branchBId,
          status: "ACTIVE",
        },
      });
    } else {
      userB = await prisma.user.update({
        where: { id: userB.id },
        data: {
          instituteId: instituteBId,
          branchId: branchBId,
          status: "ACTIVE",
        },
      });
    }
    userBId = userB.id;

    adminA = {
      id: userAId,
      userId: userAId,
      name: "AIC Admin A",
      email: "aicall-admin-a@test.org",
      instituteId: instituteAId,
      branchId: branchAId,
      roles: ["ADMIN"],
      permissions: ["*"],
    };

    adminB = {
      id: userBId,
      userId: userBId,
      name: "AIC Admin B",
      email: "aicall-admin-b@test.org",
      instituteId: instituteBId,
      branchId: branchBId,
      roles: ["ADMIN"],
      permissions: ["*"],
    };

    // Distinct institute configs so resolve() is meaningful
    await prisma.instituteAiCallingConfig.upsert({
      where: { instituteId: instituteAId },
      create: {
        instituteId: instituteAId,
        fromNumber: "+910000000001",
        callingScript: "Script A",
        isEnabled: true,
        dailyCallLimit: 100,
        maxAttemptsPerLead: 3,
      },
      update: {
        fromNumber: "+910000000001",
        callingScript: "Script A",
        isEnabled: true,
        dailyCallLimit: 100,
        maxAttemptsPerLead: 3,
        callingHoursStart: null,
        callingHoursEnd: null,
        callingDays: undefined,
      },
    });

    await prisma.instituteAiCallingConfig.upsert({
      where: { instituteId: instituteBId },
      create: {
        instituteId: instituteBId,
        fromNumber: "+910000000002",
        callingScript: "Script B",
        isEnabled: true,
        dailyCallLimit: 50,
        maxAttemptsPerLead: 2,
      },
      update: {
        fromNumber: "+910000000002",
        callingScript: "Script B",
        isEnabled: true,
        dailyCallLimit: 50,
        maxAttemptsPerLead: 2,
        callingHoursStart: null,
        callingHoursEnd: null,
      },
    });

    originalQueueAdd = aiCallingQueue.add.bind(aiCallingQueue);
  });

  beforeEach(async () => {
    queueAdds = [];
    (aiCallingQueue as { add: typeof aiCallingQueue.add }).add = (async (
      name: string,
      data: unknown,
      opts?: { delay?: number }
    ) => {
      queueAdds.push({ name, data, opts });
      return { id: `test-stub-${queueAdds.length}` } as Awaited<
        ReturnType<typeof aiCallingQueue.add>
      >;
    }) as typeof aiCallingQueue.add;

    // Clean leads/call logs/usage/import jobs for both institutes between tests
    await prisma.callLog.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
    await prisma.leadActivity.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.leadStageHistory.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.leadAssignment.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.leadFollowUp.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.lead.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
    await prisma.aiCallingUsageDaily.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
    await prisma.dataImportJob.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
  });

  after(async () => {
    if (originalQueueAdd) {
      (aiCallingQueue as { add: typeof aiCallingQueue.add }).add = originalQueueAdd;
    }
    await prisma.callLog.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
    await prisma.leadActivity.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.leadStageHistory.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.leadAssignment.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.leadFollowUp.deleteMany({
      where: { lead: { instituteId: { in: [instituteAId, instituteBId] } } },
    });
    await prisma.lead.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
    await prisma.aiCallingUsageDaily.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
    await prisma.dataImportJob.deleteMany({
      where: { instituteId: { in: [instituteAId, instituteBId] } },
    });
  });

  test("1) Institute A import cannot create leads for Institute B", async () => {
    const job = await prisma.dataImportJob.create({
      data: {
        instituteId: instituteAId,
        createdById: userAId,
        entityType: "leads",
        status: "COMPLETED",
        fileName: "a-leads.csv",
        totalRows: 1,
      },
    });

    const result = await ingestLeadRow({
      instituteId: instituteAId, // JWT-scoped — never B
      createdById: userAId,
      importJobId: job.id,
      defaultSource: "AI_CALLING",
      row: {
        name: "Lead Belonging To A",
        phoneNumber: phoneUniqueA,
        interestedIn: "Full Stack",
        branchId: branchAId,
      },
    });

    assert.strictEqual(result.created, true);
    const lead = await prisma.lead.findUnique({ where: { id: result.leadId } });
    assert.ok(lead);
    assert.strictEqual(lead!.instituteId, instituteAId);
    assert.notStrictEqual(lead!.instituteId, instituteBId);
    assert.strictEqual(lead!.importJobId, job.id);

    const leaked = await prisma.lead.findFirst({
      where: { instituteId: instituteBId, phoneNumber: phoneUniqueA },
    });
    assert.strictEqual(leaked, null);
  });

  test("2) Institute A cannot read B’s CallLogs / config / usage", async () => {
    const leadB = await prisma.lead.create({
      data: {
        instituteId: instituteBId,
        branchId: branchBId,
        name: "B Lead",
        phoneNumber: phoneUniqueB,
        normalizedPhone: phoneUniqueB,
        interestedIn: "Data Science",
        source: "AI_CALLING",
        createdById: userBId,
      },
    });

    const callB = await prisma.callLog.create({
      data: {
        instituteId: instituteBId,
        branchId: branchBId,
        leadId: leadB.id,
        externalCallId: `ext_b_${Date.now()}`,
        status: "COMPLETED",
        duration: 30,
        attemptNumber: 1,
        idempotencyKey: buildIdempotencyKey(instituteBId, leadB.id, 1),
        aiSummary: "Secret summary for B only",
      },
    });

    const dateKey = usageDateKey(new Date(), "Asia/Kolkata");
    await prisma.aiCallingUsageDaily.create({
      data: {
        instituteId: instituteBId,
        date: dateKey,
        initiatedCount: 7,
        completedCount: 3,
        durationSeconds: 120,
      },
    });

    await assert.rejects(
      () => AiCallingService.getCallLogById(callB.id, instituteAId),
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    const historyA = await LeadService.getCallHistory(adminA, { page: 1, limit: 50 });
    assert.ok(!historyA.callLogs.some((c) => c.id === callB.id));

    const configA = await AiCallingService.getInstituteConfig(instituteAId);
    assert.strictEqual(configA.fromNumber, "+910000000001");
    assert.notStrictEqual(configA.fromNumber, "+910000000002");

    const usageA = await AiCallingService.getUsage(instituteAId, { days: 7 });
    assert.strictEqual(usageA.totals.initiatedCount, 0);

    const usageB = await AiCallingService.getUsage(instituteBId, { days: 7 });
    assert.strictEqual(usageB.totals.initiatedCount, 7);
  });

  test("3) Duplicate phone in same institute does not create second ACTIVE lead or double-dial", async () => {
    const first = await ingestLeadRow({
      instituteId: instituteAId,
      createdById: userAId,
      defaultSource: "AI_CALLING",
      row: {
        name: "Dup Lead",
        phoneNumber: `+91${phoneShared}`,
        interestedIn: "MBA",
        branchId: branchAId,
      },
    });
    assert.strictEqual(first.created, true);
    assert.strictEqual(first.dialQueued, true);

    const second = await ingestLeadRow({
      instituteId: instituteAId,
      createdById: userAId,
      defaultSource: "AI_CALLING",
      row: {
        name: "Dup Lead Again",
        phoneNumber: phoneShared,
        interestedIn: "MBA",
        branchId: branchAId,
      },
    });
    assert.strictEqual(second.created, false);
    assert.strictEqual(second.dialQueued, false);
    assert.strictEqual(second.leadId, first.leadId);
    assert.strictEqual(second.skippedReason, "duplicate_active_lead");

    const activeCount = await prisma.lead.count({
      where: {
        instituteId: instituteAId,
        status: "ACTIVE",
        normalizedPhone: phoneShared,
      },
    });
    assert.strictEqual(activeCount, 1);

    const callCount = await prisma.callLog.count({
      where: { leadId: first.leadId, instituteId: instituteAId },
    });
    assert.strictEqual(callCount, 1);
  });

  test("4) Two import files for same institute still resolve the same config", async () => {
    const job1 = await prisma.dataImportJob.create({
      data: {
        instituteId: instituteAId,
        createdById: userAId,
        entityType: "leads",
        status: "COMPLETED",
        fileName: "file-1.csv",
      },
    });
    const job2 = await prisma.dataImportJob.create({
      data: {
        instituteId: instituteAId,
        createdById: userAId,
        entityType: "leads",
        status: "COMPLETED",
        fileName: "file-2.csv",
      },
    });

    const cfg1 = await resolveAiCallingConfig(instituteAId);
    const cfg2 = await resolveAiCallingConfig(instituteAId);
    assert.strictEqual(cfg1.instituteId, instituteAId);
    assert.strictEqual(cfg2.instituteId, instituteAId);
    assert.strictEqual(cfg1.fromNumber, cfg2.fromNumber);
    assert.strictEqual(cfg1.callingScript, cfg2.callingScript);
    assert.strictEqual(cfg1.dailyCallLimit, cfg2.dailyCallLimit);

    const r1 = await ingestLeadRow({
      instituteId: instituteAId,
      createdById: userAId,
      importJobId: job1.id,
      defaultSource: "AI_CALLING",
      row: {
        name: "File1 Lead",
        phoneNumber: "9111111111",
        interestedIn: "Course",
        branchId: branchAId,
      },
    });
    const r2 = await ingestLeadRow({
      instituteId: instituteAId,
      createdById: userAId,
      importJobId: job2.id,
      defaultSource: "AI_CALLING",
      row: {
        name: "File2 Lead",
        phoneNumber: "9111111112",
        interestedIn: "Course",
        branchId: branchAId,
      },
    });

    const lead1 = await prisma.lead.findUnique({ where: { id: r1.leadId } });
    const lead2 = await prisma.lead.findUnique({ where: { id: r2.leadId } });
    assert.strictEqual(lead1!.instituteId, instituteAId);
    assert.strictEqual(lead2!.instituteId, instituteAId);
    assert.strictEqual(lead1!.importJobId, job1.id);
    assert.strictEqual(lead2!.importJobId, job2.id);

    // Config is institute-scoped — file name does not change dialer resolve
    const cfgAfter = await resolveAiCallingConfig(instituteAId);
    assert.strictEqual(cfgAfter.fromNumber, cfg1.fromNumber);
  });

  test("5) Worker retry / idempotencyKey does not create a second call", async () => {
    const lead = await prisma.lead.create({
      data: {
        instituteId: instituteAId,
        branchId: branchAId,
        name: "Idempotent Lead",
        phoneNumber: "9222222222",
        normalizedPhone: "9222222222",
        interestedIn: "Course",
        source: "AI_CALLING",
        createdById: userAId,
      },
    });

    const key = buildIdempotencyKey(instituteAId, lead.id, 1);
    const existing = await prisma.callLog.create({
      data: {
        instituteId: instituteAId,
        branchId: branchAId,
        leadId: lead.id,
        externalCallId: `queued_idem_${Date.now()}`,
        status: "INITIATED",
        duration: 0,
        attemptNumber: 1,
        idempotencyKey: key,
        startedAt: new Date(),
      },
    });

    // Retry enqueue for the same attempt — must reuse existing key, not create another row
    const retry = await AiCallingService.enqueueLeadCall(
      {
        id: lead.id,
        phoneNumber: lead.phoneNumber,
        createdById: userAId,
        instituteId: instituteAId,
        branchId: branchAId,
      },
      { attemptNumber: 1 }
    );

    assert.strictEqual(retry.queued, false);
    assert.ok(
      retry.skipped === "already_in_flight" || retry.skipped === "idempotent_race"
    );
    assert.strictEqual(retry.callLogId, existing.id);

    const count = await prisma.callLog.count({
      where: { leadId: lead.id, instituteId: instituteAId },
    });
    assert.strictEqual(count, 1);

    // Worker seeing a terminal CallLog must skip without creating another attempt
    await prisma.callLog.update({
      where: { id: existing.id },
      data: { status: "COMPLETED", endedAt: new Date() },
    });
    await AiCallingService.processCallJob({
      callLogId: existing.id,
      leadId: lead.id,
      instituteId: instituteAId,
    });
    assert.strictEqual(
      await prisma.callLog.count({
        where: { leadId: lead.id, instituteId: instituteAId },
      }),
      1
    );
  });

  test("6) Webhook phone collision across institutes does not rematch wrong lead", async () => {
    const leadA = await prisma.lead.create({
      data: {
        instituteId: instituteAId,
        branchId: branchAId,
        name: "Collision A",
        phoneNumber: phoneShared,
        normalizedPhone: phoneShared,
        interestedIn: "Course",
        source: "WALK_IN",
        createdById: userAId,
      },
    });
    const leadB = await prisma.lead.create({
      data: {
        instituteId: instituteBId,
        branchId: branchBId,
        name: "Collision B",
        phoneNumber: phoneShared,
        normalizedPhone: phoneShared,
        interestedIn: "Course",
        source: "WALK_IN",
        createdById: userBId,
      },
    });

    const extB = `ext_collision_b_${Date.now()}`;
    const callB = await prisma.callLog.create({
      data: {
        instituteId: instituteBId,
        branchId: branchBId,
        leadId: leadB.id,
        externalCallId: extB,
        status: "INITIATED",
        duration: 0,
        attemptNumber: 1,
        idempotencyKey: buildIdempotencyKey(instituteBId, leadB.id, 1),
        startedAt: new Date(),
      },
    });

    // Phone-only webhook without instituteId must not attach to anyone
    await AiCallingService.handleSarvamWebhook({
      attempt_id: `unknown_${Date.now()}`,
      customer_number: `+91${phoneShared}`,
      status: "connected",
      duration: 40,
    });

    const untouchedB = await prisma.callLog.findUnique({ where: { id: callB.id } });
    assert.strictEqual(untouchedB!.status, "INITIATED");

    const spuriousA = await prisma.callLog.findFirst({
      where: { leadId: leadA.id, status: "COMPLETED" },
    });
    assert.strictEqual(spuriousA, null);

    // Matching by externalCallId updates B only — even if metadata claims institute A
    await AiCallingService.handleSarvamWebhook({
      attempt_id: extB,
      customer_number: `+91${phoneShared}`,
      status: "connected",
      duration: 55,
      interaction_transcript: [{ role: "agent", text: "Hello from B" }],
      metadata: {
        instituteId: instituteAId, // malicious / wrong tenant claim
        leadId: leadA.id,
      },
    });

    const updatedB = await prisma.callLog.findUnique({ where: { id: callB.id } });
    assert.strictEqual(updatedB!.status, "COMPLETED");
    assert.strictEqual(updatedB!.instituteId, instituteBId);
    assert.strictEqual(updatedB!.leadId, leadB.id);

    const wrongAttach = await prisma.callLog.findFirst({
      where: { leadId: leadA.id, status: "COMPLETED" },
    });
    assert.strictEqual(wrongAttach, null);
  });

  test("7) Outside calling hours → job delayed, not dialed", async () => {
    // Force a window that excludes "now" by using only a weekday far from today in UTC
    const tomorrowOnly = [(new Date().getUTCDay() + 1) % 7];
    await prisma.instituteAiCallingConfig.update({
      where: { instituteId: instituteAId },
      data: {
        isEnabled: true,
        callingHoursStart: "09:00",
        callingHoursEnd: "17:00",
        callingDays: tomorrowOnly,
      },
    });

    const prevBase = process.env.TELEPHONY_BASE_URL;
    const prevKey = process.env.TELEPHONY_API_KEY;
    process.env.TELEPHONY_BASE_URL = "https://telephony.test.local";
    process.env.TELEPHONY_API_KEY = "test-key-outside-hours";

    try {
      const lead = await prisma.lead.create({
        data: {
          instituteId: instituteAId,
          branchId: branchAId,
          name: "Hours Lead",
          phoneNumber: "9333333333",
          normalizedPhone: "9333333333",
          interestedIn: "Course",
          source: "AI_CALLING",
          createdById: userAId,
        },
      });

      const callLog = await prisma.callLog.create({
        data: {
          instituteId: instituteAId,
          branchId: branchAId,
          leadId: lead.id,
          externalCallId: `queued_hours_${Date.now()}`,
          status: "INITIATED",
          duration: 0,
          attemptNumber: 1,
          idempotencyKey: buildIdempotencyKey(instituteAId, lead.id, 1),
          startedAt: new Date(),
        },
      });

      queueAdds = [];
      await AiCallingService.processCallJob({
        callLogId: callLog.id,
        leadId: lead.id,
        instituteId: instituteAId,
      });

      const after = await prisma.callLog.findUnique({ where: { id: callLog.id } });
      assert.strictEqual(after!.status, "INITIATED");
      assert.strictEqual(after!.externalCallId, callLog.externalCallId);

      assert.ok(queueAdds.length >= 1, "expected requeue with delay");
      const delayed = queueAdds.find((a) => (a.opts?.delay ?? 0) >= 60_000);
      assert.ok(delayed, "expected delay >= 60s when outside hours");

      const usage = await prisma.aiCallingUsageDaily.findFirst({
        where: { instituteId: instituteAId },
      });
      assert.ok(!usage || usage.initiatedCount === 0);
    } finally {
      if (prevBase === undefined) delete process.env.TELEPHONY_BASE_URL;
      else process.env.TELEPHONY_BASE_URL = prevBase;
      if (prevKey === undefined) delete process.env.TELEPHONY_API_KEY;
      else process.env.TELEPHONY_API_KEY = prevKey;

      await prisma.instituteAiCallingConfig.update({
        where: { instituteId: instituteAId },
        data: {
          callingHoursStart: null,
          callingHoursEnd: null,
          callingDays: [],
        },
      });
    }
  });

  test("8) Daily limit reached → no further initiate", async () => {
    await prisma.instituteAiCallingConfig.update({
      where: { instituteId: instituteAId },
      data: {
        isEnabled: true,
        dailyCallLimit: 2,
        callingHoursStart: null,
        callingHoursEnd: null,
        callingDays: [],
      },
    });

    const prevBase = process.env.TELEPHONY_BASE_URL;
    const prevKey = process.env.TELEPHONY_API_KEY;
    process.env.TELEPHONY_BASE_URL = "https://telephony.test.local";
    process.env.TELEPHONY_API_KEY = "test-key-daily-limit";

    try {
      const dateKey = usageDateKey(new Date(), "Asia/Kolkata");
      await prisma.aiCallingUsageDaily.create({
        data: {
          instituteId: instituteAId,
          date: dateKey,
          initiatedCount: 2,
          completedCount: 0,
          durationSeconds: 0,
        },
      });

      const lead = await prisma.lead.create({
        data: {
          instituteId: instituteAId,
          branchId: branchAId,
          name: "Limit Lead",
          phoneNumber: "9444444444",
          normalizedPhone: "9444444444",
          interestedIn: "Course",
          source: "AI_CALLING",
          createdById: userAId,
        },
      });

      const callLog = await prisma.callLog.create({
        data: {
          instituteId: instituteAId,
          branchId: branchAId,
          leadId: lead.id,
          externalCallId: `queued_limit_${Date.now()}`,
          status: "INITIATED",
          duration: 0,
          attemptNumber: 1,
          idempotencyKey: buildIdempotencyKey(instituteAId, lead.id, 1),
          startedAt: new Date(),
        },
      });

      queueAdds = [];
      await AiCallingService.processCallJob({
        callLogId: callLog.id,
        leadId: lead.id,
        instituteId: instituteAId,
      });

      const after = await prisma.callLog.findUnique({ where: { id: callLog.id } });
      assert.strictEqual(after!.status, "INITIATED");

      const usage = await prisma.aiCallingUsageDaily.findUnique({
        where: {
          instituteId_date: { instituteId: instituteAId, date: dateKey },
        },
      });
      assert.strictEqual(usage!.initiatedCount, 2);

      assert.ok(queueAdds.length >= 1, "expected requeue when daily limit hit");
      const delayed = queueAdds.find((a) => (a.opts?.delay ?? 0) >= 60_000);
      assert.ok(delayed, "expected delay when daily limit reached");
    } finally {
      if (prevBase === undefined) delete process.env.TELEPHONY_BASE_URL;
      else process.env.TELEPHONY_BASE_URL = prevBase;
      if (prevKey === undefined) delete process.env.TELEPHONY_API_KEY;
      else process.env.TELEPHONY_API_KEY = prevKey;

      await prisma.instituteAiCallingConfig.update({
        where: { instituteId: instituteAId },
        data: { dailyCallLimit: 100 },
      });
    }
  });

  test("9) Manual POST /leads still auto-queues (regression)", async () => {
    const lead = await LeadService.createLead(adminA, {
      name: "Manual Lead",
      phoneNumber: "9555555555",
      interestedIn: "Full Stack",
      branchId: branchAId,
      source: "WALK_IN",
    });

    assert.strictEqual(lead.instituteId, instituteAId);

    const callLogs = await prisma.callLog.findMany({
      where: { leadId: lead.id, instituteId: instituteAId },
    });
    assert.strictEqual(callLogs.length, 1);
    // Live dial or local FAILED fallback depending on telephony env
    assert.ok(
      callLogs[0].status === "INITIATED" || callLogs[0].status === "FAILED",
      `unexpected status ${callLogs[0].status}`
    );
  });

  test("Verification: ingest → CallLog.instituteId → config resolve → history isolated", async () => {
    const job = await prisma.dataImportJob.create({
      data: {
        instituteId: instituteAId,
        createdById: userAId,
        entityType: "leads",
        status: "COMPLETED",
        fileName: "verify.csv",
      },
    });

    const ingested = await ingestLeadRow({
      instituteId: instituteAId,
      createdById: userAId,
      importJobId: job.id,
      defaultSource: "AI_CALLING",
      row: {
        name: "Verify Flow Lead",
        phoneNumber: "9666666666",
        interestedIn: "Verify Course",
        branchId: branchAId,
      },
    });
    assert.strictEqual(ingested.created, true);

    const lead = await prisma.lead.findUnique({ where: { id: ingested.leadId } });
    assert.strictEqual(lead!.instituteId, instituteAId);
    assert.strictEqual(lead!.importJobId, job.id);

    const cfg = await resolveAiCallingConfig(instituteAId);
    assert.strictEqual(cfg.instituteId, instituteAId);
    assert.strictEqual(cfg.fromNumber, "+910000000001");

    const callLog = await prisma.callLog.findFirst({
      where: { leadId: lead!.id, instituteId: instituteAId },
    });
    assert.ok(callLog);
    assert.strictEqual(callLog!.instituteId, instituteAId);
    assert.strictEqual(callLog!.importJobId, job.id);

    // Simulate provider result when we have an in-flight or failed local log
    if (callLog!.status === "FAILED") {
      // Local fallback path — update via webhook still requires matching external id
      await prisma.callLog.update({
        where: { id: callLog!.id },
        data: { status: "INITIATED", failureReason: null },
      });
    }

    const extId = callLog!.externalCallId || `verify_${callLog!.id}`;
    await prisma.callLog.update({
      where: { id: callLog!.id },
      data: { externalCallId: extId, status: "INITIATED" },
    });

    await AiCallingService.handleSarvamWebhook({
      attempt_id: extId,
      status: "connected",
      duration: 42,
      recording_url: "https://recordings.test/verify.mp3",
      interaction_transcript: [{ role: "agent", text: "Verified" }],
      final_agent_variables: { summary: "Interested", interestStatus: "HIGH" },
      metadata: { instituteId: instituteAId, leadId: lead!.id },
    });

    const completed = await prisma.callLog.findUnique({ where: { id: callLog!.id } });
    assert.strictEqual(completed!.status, "COMPLETED");
    assert.strictEqual(completed!.recordingUrl, "https://recordings.test/verify.mp3");
    assert.strictEqual(completed!.aiSummary, "Interested");

    const historyA = await LeadService.getCallHistory(adminA, { page: 1, limit: 50 });
    assert.ok(historyA.callLogs.some((c) => c.id === callLog!.id));

    const historyB = await LeadService.getCallHistory(adminB, { page: 1, limit: 50 });
    assert.ok(!historyB.callLogs.some((c) => c.id === callLog!.id));
  });

  test("Data Management lead import enqueues the same dial path", async () => {
    // data-management.service processLeadRow → ingestLeadRow (same dial path)
    const job = await prisma.dataImportJob.create({
      data: {
        instituteId: instituteAId,
        createdById: userAId,
        entityType: "leads",
        status: "COMPLETED",
        fileName: "dm-leads.csv",
      },
    });

    const result = await ingestLeadRow({
      instituteId: instituteAId,
      createdById: userAId,
      importJobId: job.id,
      row: {
        name: "DM Import Lead",
        phoneNumber: "9777777777",
        interestedIn: "DM Course",
        branchId: branchAId,
        source: "REFERRAL",
      },
    });

    assert.strictEqual(result.created, true);
    assert.strictEqual(result.dialQueued, true);

    const lead = await prisma.lead.findUnique({ where: { id: result.leadId } });
    assert.strictEqual(lead!.source, "REFERRAL");
    assert.strictEqual(lead!.importJobId, job.id);

    const callLog = await prisma.callLog.findFirst({
      where: { leadId: result.leadId, instituteId: instituteAId },
    });
    assert.ok(callLog, "DM import must create CallLog via startInitialAiCall");
    assert.strictEqual(callLog!.instituteId, instituteAId);
  });
});

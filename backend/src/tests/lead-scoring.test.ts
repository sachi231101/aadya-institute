/**
 * AI Lead Scoring + Intent independence tests:
 * - lead_score from extractedFields beats heuristic
 * - High score + FOLLOW_UP_REQUIRED → HOT + FOLLOW_UP stage
 * - Custom scoreTemperatureBands (e.g. hotMin 85)
 * - Score ≥ minScoreToAutoAssign (default 50) auto-assigns unassigned leads
 * - Score below threshold leaves unassigned
 * - preferred_branch change + high score re-assigns counsellor
 * - CONVERTED intent → INTERESTED stage, status stays ACTIVE
 * - Light dial/outcome regression via webhook
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import { getRedis } from "../config/redis";
import {
  parseScoreTemperatureBands,
  scoreToTemperature,
} from "../modules/ai-calling/ai-calling.config";
import { DEFAULT_SCORE_TEMPERATURE_BANDS } from "../modules/ai-calling/ai-calling.types";
import { normalizeLeadIntent } from "../modules/ai-calling/lead-intent.util";
import { AiCallingService } from "../modules/ai-calling/ai-calling.service";
import { buildIdempotencyKey } from "../modules/ai-calling/ai-calling.types";
import {
  deriveScoreFromConversationSignals,
  LeadAiOutcomeService,
} from "../modules/leads/services/lead-ai-outcome.service";
import { resetAutoAssignCountersForTests } from "../modules/leads/services/lead-auto-assign.service";

// ---------------------------------------------------------------------------
// 1. Pure helpers
// ---------------------------------------------------------------------------

describe("AI Lead Scoring — helpers", () => {
  test("scoreToTemperature uses default bands (hotMin 80)", () => {
    const bands = DEFAULT_SCORE_TEMPERATURE_BANDS;
    assert.strictEqual(scoreToTemperature(80, bands), "HOT");
    assert.strictEqual(scoreToTemperature(79, bands), "WARM");
    assert.strictEqual(scoreToTemperature(60, bands), "WARM");
    assert.strictEqual(scoreToTemperature(59, bands), "COOL");
    assert.strictEqual(scoreToTemperature(40, bands), "COOL");
    assert.strictEqual(scoreToTemperature(39, bands), "COLD");
  });

  test("parseScoreTemperatureBands respects custom hotMin 85", () => {
    const bands = parseScoreTemperatureBands({
      hotMin: 85,
      warmMin: 60,
      coolMin: 40,
    });
    assert.strictEqual(bands.hotMin, 85);
    assert.strictEqual(scoreToTemperature(84, bands), "WARM");
    assert.strictEqual(scoreToTemperature(85, bands), "HOT");
  });

  test("normalizeLeadIntent maps CONVERTED synonyms", () => {
    assert.strictEqual(normalizeLeadIntent("CONVERTED"), "CONVERTED");
    assert.strictEqual(normalizeLeadIntent("ENROLLED"), "CONVERTED");
    assert.strictEqual(normalizeLeadIntent("ADMISSION_DONE"), "CONVERTED");
  });

  test("deriveScoreFromConversationSignals stays well below a high AI lead_score", () => {
    const heuristic = deriveScoreFromConversationSignals({
      status: "COMPLETED",
      intent: "FOLLOW_UP_REQUIRED",
      duration: 90,
      aiSummary: "Asked for a follow-up next week",
      extracted: { course_interest: "NEET" },
    });
    assert.ok(
      heuristic < 85,
      `heuristic ${heuristic} should be below a typical AI high score`
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Outcome service integration
// ---------------------------------------------------------------------------

describe("AI Lead Scoring — LeadAiOutcomeService", () => {
  let instituteId: string;
  let branchAId: string;
  let branchBId: string;
  let adminUserId: string;
  let counsellorAId: string;
  let counsellorBId: string;
  let attemptSeq = 0;

  const BRANCH_A_NAME = "Scoring Branch A";
  const BRANCH_B_NAME = "Scoring Branch B";

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-LEAD-SCORING" },
      update: {
        name: "Lead Scoring Test",
        timezone: "Asia/Kolkata",
        status: "ACTIVE",
      },
      create: {
        name: "Lead Scoring Test",
        code: "TEST-LEAD-SCORING",
        email: "lead-scoring@test.org",
        timezone: "Asia/Kolkata",
      },
    });
    instituteId = institute.id;

    const branchA = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "SCORE-A" } },
      update: { name: BRANCH_A_NAME, status: "ACTIVE" },
      create: {
        instituteId,
        name: BRANCH_A_NAME,
        code: "SCORE-A",
      },
    });
    branchAId = branchA.id;

    const branchB = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "SCORE-B" } },
      update: { name: BRANCH_B_NAME, status: "ACTIVE" },
      create: {
        instituteId,
        name: BRANCH_B_NAME,
        code: "SCORE-B",
      },
    });
    branchBId = branchB.id;

    const counsellorRole = await prisma.role.upsert({
      where: { name: "COUNSELLOR" },
      update: {},
      create: { name: "COUNSELLOR" },
    });

    let adminUser = await prisma.user.findFirst({
      where: { email: "lead-scoring-admin@test.org" },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: "Scoring Admin",
          email: "lead-scoring-admin@test.org",
          phone: "9000000601",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId,
          branchId: branchAId,
          status: "ACTIVE",
        },
      });
    } else {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { instituteId, branchId: branchAId, status: "ACTIVE" },
      });
    }
    adminUserId = adminUser.id;

    let cA = await prisma.user.findFirst({
      where: { email: "lead-scoring-c-a@test.org" },
    });
    if (!cA) {
      cA = await prisma.user.create({
        data: {
          name: "Scoring Counsellor A",
          email: "lead-scoring-c-a@test.org",
          phone: "9000000602",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId,
          branchId: branchAId,
          status: "ACTIVE",
        },
      });
    } else {
      cA = await prisma.user.update({
        where: { id: cA.id },
        data: {
          instituteId,
          branchId: branchAId,
          status: "ACTIVE",
        },
      });
    }
    counsellorAId = cA.id;
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: counsellorAId, roleId: counsellorRole.id },
      },
      update: {},
      create: { userId: counsellorAId, roleId: counsellorRole.id },
    });

    let cB = await prisma.user.findFirst({
      where: { email: "lead-scoring-c-b@test.org" },
    });
    if (!cB) {
      cB = await prisma.user.create({
        data: {
          name: "Scoring Counsellor B",
          email: "lead-scoring-c-b@test.org",
          phone: "9000000603",
          passwordHash: "$2b$10$invalidplaceholderhashvaluexxxxx",
          instituteId,
          branchId: branchBId,
          status: "ACTIVE",
        },
      });
    } else {
      cB = await prisma.user.update({
        where: { id: cB.id },
        data: {
          instituteId,
          branchId: branchBId,
          status: "ACTIVE",
        },
      });
    }
    counsellorBId = cB.id;
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: counsellorBId, roleId: counsellorRole.id },
      },
      update: {},
      create: { userId: counsellorBId, roleId: counsellorRole.id },
    });

    await prisma.instituteAiCallingConfig.upsert({
      where: { instituteId },
      create: {
        instituteId,
        fromNumber: "+910000000088",
        callingScript: "Scoring test script",
        isEnabled: true,
        dailyCallLimit: 200,
        maxAttemptsPerLead: 3,
        minScoreToAutoAssign: 50,
        scoreTemperatureBands: {
          hotMin: 80,
          warmMin: 60,
          coolMin: 40,
        },
      },
      update: {
        fromNumber: "+910000000088",
        isEnabled: true,
        dailyCallLimit: 200,
        maxAttemptsPerLead: 3,
        callingHoursStart: null,
        callingHoursEnd: null,
        callingDays: [],
        minScoreToAutoAssign: 50,
        scoreTemperatureBands: {
          hotMin: 80,
          warmMin: 60,
          coolMin: 40,
        },
      },
    });

    await resetAutoAssignCountersForTests(instituteId, branchAId);
    await resetAutoAssignCountersForTests(instituteId, branchBId);
  });

  after(async () => {
    await prisma.leadFollowUp.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadStageHistory.deleteMany({
      where: { lead: { instituteId } },
    });
    await prisma.leadActivity.deleteMany({ where: { lead: { instituteId } } });
    await prisma.callLog.deleteMany({ where: { instituteId } });
    await prisma.lead.deleteMany({ where: { instituteId } });
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

  async function createLead(params: {
    name: string;
    phone: string;
    branchId: string;
    assignedCounsellorId?: string;
    stage?: string;
  }) {
    return prisma.lead.create({
      data: {
        instituteId,
        branchId: params.branchId,
        name: params.name,
        phoneNumber: `+91${params.phone}`,
        normalizedPhone: params.phone,
        interestedIn: "TBD",
        source: "AI_CALLING",
        stage: params.stage ?? "NEW",
        status: "ACTIVE",
        createdById: adminUserId,
        assignedCounsellorId: params.assignedCounsellorId,
      },
    });
  }

  async function processCompletedCall(params: {
    leadId: string;
    branchId: string;
    extracted: Record<string, unknown>;
    interestStatus?: string | null;
    aiSummary?: string | null;
    duration?: number;
  }) {
    attemptSeq += 1;
    const callLog = await prisma.callLog.create({
      data: {
        instituteId,
        branchId: params.branchId,
        leadId: params.leadId,
        externalCallId: `score_call_${params.leadId}_${attemptSeq}`,
        status: "COMPLETED",
        callType: "AI",
        duration: params.duration ?? 90,
        attemptNumber: attemptSeq,
        idempotencyKey: buildIdempotencyKey(
          instituteId,
          params.leadId,
          attemptSeq + 100
        ),
        startedAt: new Date(),
        endedAt: new Date(),
        interestStatus: params.interestStatus ?? null,
        aiSummary: params.aiSummary ?? null,
        extractedFields: params.extracted,
      },
    });
    await LeadAiOutcomeService.process(callLog.id);
    return callLog.id;
  }

  test("lead_score from extractedFields beats heuristic", async () => {
    const lead = await createLead({
      name: "Score Beats Heuristic",
      phone: "9876507001",
      branchId: branchAId,
    });

    const heuristic = deriveScoreFromConversationSignals({
      status: "COMPLETED",
      intent: "FOLLOW_UP_REQUIRED",
      duration: 90,
      aiSummary: "Brief follow-up only",
      extracted: { course_interest: "NEET" },
    });

    await processCompletedCall({
      leadId: lead.id,
      branchId: branchAId,
      interestStatus: "FOLLOW_UP_REQUIRED",
      aiSummary: "Brief follow-up only",
      extracted: {
        lead_intent: "FOLLOW_UP_REQUIRED",
        course_interest: "NEET",
        lead_score: 91,
        score_reason: "Strong engagement despite deferred decision",
      },
    });

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updated);
    assert.strictEqual(updated!.leadScore, 91);
    assert.ok(91 > heuristic, `AI score 91 must beat heuristic ${heuristic}`);

    const log = await prisma.callLog.findFirst({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(log);
    assert.strictEqual(
      log!.scoreReason,
      "Strong engagement despite deferred decision"
    );
    const fields = log!.extractedFields as Record<string, unknown>;
    assert.strictEqual(fields.lead_score, 91);
  });

  test("high score + FOLLOW_UP_REQUIRED → HOT + FOLLOW_UP; intent independent", async () => {
    const lead = await createLead({
      name: "Hot Follow Up",
      phone: "9876507002",
      branchId: branchAId,
    });

    await processCompletedCall({
      leadId: lead.id,
      branchId: branchAId,
      interestStatus: "FOLLOW_UP_REQUIRED",
      aiSummary: "Very engaged but needs weekend follow-up",
      extracted: {
        lead_intent: "FOLLOW_UP_REQUIRED",
        lead_score: 88,
        score_reason: "High intent signals; callback requested",
        budget: "90000",
      },
    });

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updated);
    assert.strictEqual(updated!.leadScore, 88);
    assert.strictEqual(updated!.leadTemperature, "HOT");
    assert.strictEqual(updated!.leadIntent, "FOLLOW_UP_REQUIRED");
    assert.strictEqual(updated!.stage, "FOLLOW_UP");
    assert.strictEqual(updated!.status, "ACTIVE");
  });

  test("custom scoreTemperatureBands (hotMin 85) changes temperature", async () => {
    await prisma.instituteAiCallingConfig.update({
      where: { instituteId },
      data: {
        scoreTemperatureBands: {
          hotMin: 85,
          warmMin: 60,
          coolMin: 40,
        },
      },
    });

    try {
      const warmLead = await createLead({
        name: "Custom Band Warm",
        phone: "9876507003",
        branchId: branchAId,
      });
      await processCompletedCall({
        leadId: warmLead.id,
        branchId: branchAId,
        interestStatus: "INTERESTED",
        extracted: {
          lead_intent: "INTERESTED",
          lead_score: 82,
          score_reason: "Solid interest; below custom hotMin",
        },
      });
      const warmUpdated = await prisma.lead.findUnique({
        where: { id: warmLead.id },
      });
      assert.strictEqual(warmUpdated!.leadScore, 82);
      assert.strictEqual(
        warmUpdated!.leadTemperature,
        "WARM",
        "82 should be WARM when hotMin is 85"
      );

      const hotLead = await createLead({
        name: "Custom Band Hot",
        phone: "9876507004",
        branchId: branchAId,
      });
      await processCompletedCall({
        leadId: hotLead.id,
        branchId: branchAId,
        interestStatus: "INTERESTED",
        extracted: {
          lead_intent: "INTERESTED",
          lead_score: 90,
          score_reason: "Above custom hotMin",
        },
      });
      const hotUpdated = await prisma.lead.findUnique({
        where: { id: hotLead.id },
      });
      assert.strictEqual(hotUpdated!.leadScore, 90);
      assert.strictEqual(hotUpdated!.leadTemperature, "HOT");
    } finally {
      await prisma.instituteAiCallingConfig.update({
        where: { instituteId },
        data: {
          scoreTemperatureBands: {
            hotMin: 80,
            warmMin: 60,
            coolMin: 40,
          },
        },
      });
    }
  });

  test("preferred_branch change + score >= 50 re-assigns counsellor", async () => {
    await resetAutoAssignCountersForTests(instituteId, branchBId);

    const lead = await createLead({
      name: "Branch Switch Lead",
      phone: "9876507005",
      branchId: branchAId,
      assignedCounsellorId: counsellorAId,
    });

    await processCompletedCall({
      leadId: lead.id,
      branchId: branchAId,
      interestStatus: "INTERESTED",
      aiSummary: "Prefers other campus",
      extracted: {
        lead_intent: "INTERESTED",
        lead_score: 75,
        preferred_branch: BRANCH_B_NAME,
        course_interest: "MBA",
      },
    });

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updated);
    assert.strictEqual(updated!.branchId, branchBId);
    assert.strictEqual(
      updated!.assignedCounsellorId,
      counsellorBId,
      "must re-assign to counsellor on new branch when score >= threshold"
    );

    const activities = await prisma.leadActivity.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
    });
    const reassignNote = activities.some((a) => {
      const meta = (a.metadata ?? {}) as Record<string, unknown>;
      return (
        meta.reason === "ai_score_threshold_branch_change" ||
        meta.reason === "ai_score_threshold" ||
        (typeof a.title === "string" &&
          a.title.toLowerCase().includes("assign")) ||
        (typeof a.description === "string" &&
          a.description.toLowerCase().includes("preferred branch"))
      );
    });
    assert.ok(
      reassignNote || updated!.assignedCounsellorId === counsellorBId,
      "branch change should leave assignment evidence"
    );
  });

  test("lead_score 50 on unassigned lead auto-assigns counsellor", async () => {
    await resetAutoAssignCountersForTests(instituteId, branchAId);

    const lead = await createLead({
      name: "Threshold Assign Lead",
      phone: "9876507010",
      branchId: branchAId,
    });
    assert.strictEqual(lead.assignedCounsellorId, null);

    await processCompletedCall({
      leadId: lead.id,
      branchId: branchAId,
      interestStatus: "INTERESTED",
      extracted: {
        lead_intent: "INTERESTED",
        lead_score: 50,
        score_reason: "Exactly at default auto-assign threshold",
      },
    });

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updated);
    assert.strictEqual(updated!.leadScore, 50);
    assert.strictEqual(
      updated!.assignedCounsellorId,
      counsellorAId,
      "score 50 must auto-assign branch counsellor"
    );

    const assignment = await prisma.leadAssignment.findFirst({
      where: { leadId: lead.id, isCurrent: true },
    });
    assert.ok(assignment);
    assert.strictEqual(assignment!.counsellorId, counsellorAId);
  });

  test("lead_score 49 on unassigned lead leaves counsellor null", async () => {
    const lead = await createLead({
      name: "Below Threshold Lead",
      phone: "9876507011",
      branchId: branchAId,
    });

    await processCompletedCall({
      leadId: lead.id,
      branchId: branchAId,
      interestStatus: "NOT_INTERESTED",
      extracted: {
        lead_intent: "NOT_INTERESTED",
        lead_score: 49,
        score_reason: "Just below auto-assign threshold",
      },
    });

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updated);
    assert.strictEqual(updated!.leadScore, 49);
    assert.strictEqual(
      updated!.assignedCounsellorId,
      null,
      "score 49 must not auto-assign"
    );
  });

  test("preferred_branch change + score below threshold keeps prior assignee", async () => {
    const lead = await createLead({
      name: "Cold Branch Switch Lead",
      phone: "9876507012",
      branchId: branchAId,
      assignedCounsellorId: counsellorAId,
    });

    await processCompletedCall({
      leadId: lead.id,
      branchId: branchAId,
      interestStatus: "NOT_INTERESTED",
      extracted: {
        lead_intent: "NOT_INTERESTED",
        lead_score: 30,
        preferred_branch: BRANCH_B_NAME,
      },
    });

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updated);
    assert.strictEqual(updated!.branchId, branchBId);
    assert.strictEqual(
      updated!.assignedCounsellorId,
      counsellorAId,
      "below-threshold branch change must not yank assignee"
    );
  });

  test("CONVERTED intent → INTERESTED stage, not status CONVERTED", async () => {
    const lead = await createLead({
      name: "Converted Intent Lead",
      phone: "9876507006",
      branchId: branchAId,
    });

    await processCompletedCall({
      leadId: lead.id,
      branchId: branchAId,
      interestStatus: "CONVERTED",
      aiSummary: "Said they already paid / enrolled",
      extracted: {
        lead_intent: "CONVERTED",
        lead_score: 95,
        score_reason: "Claims admission complete",
      },
    });

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updated);
    assert.strictEqual(updated!.leadIntent, "CONVERTED");
    assert.strictEqual(updated!.leadScore, 95);
    assert.strictEqual(updated!.stage, "INTERESTED");
    assert.strictEqual(updated!.status, "ACTIVE");
    assert.notStrictEqual(updated!.status, "CONVERTED");
    assert.notStrictEqual(updated!.stage, "CONVERTED");
  });

  test("regression: webhook dial outcome still updates CallLog + Lead", async () => {
    const lead = await createLead({
      name: "Webhook Regression Lead",
      phone: "9876507007",
      branchId: branchAId,
    });

    const extId = `score_webhook_${lead.id}`;
    const callLog = await prisma.callLog.create({
      data: {
        instituteId,
        branchId: branchAId,
        leadId: lead.id,
        externalCallId: extId,
        status: "INITIATED",
        callType: "AI",
        duration: 0,
        attemptNumber: 1,
        idempotencyKey: buildIdempotencyKey(instituteId, lead.id, 77),
        startedAt: new Date(),
      },
    });

    await AiCallingService.handleSarvamWebhook({
      attempt_id: extId,
      status: "connected",
      duration: 70,
      recording_url: "https://recordings.test/score.mp3",
      interaction_transcript: [
        { role: "agent", text: "Hello" },
        { role: "user", text: "I am interested" },
      ],
      final_agent_variables: {
        lead_intent: "INTERESTED",
        summary: "Interested in MBA evening batch",
        course_interest: "MBA",
        lead_score: 72,
        score_reason: "Clear interest, asked about fees",
        budget: "120000",
      },
      metadata: { instituteId, leadId: lead.id },
    });

    const updatedLog = await prisma.callLog.findUnique({
      where: { id: callLog.id },
    });
    assert.ok(updatedLog);
    assert.strictEqual(updatedLog!.status, "COMPLETED");
    assert.strictEqual(updatedLog!.interestStatus, "INTERESTED");
    assert.strictEqual(updatedLog!.aiSummary, "Interested in MBA evening batch");
    assert.ok(updatedLog!.recordingUrl);

    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updatedLead);
    assert.strictEqual(updatedLead!.leadIntent, "INTERESTED");
    assert.strictEqual(updatedLead!.leadScore, 72);
    assert.strictEqual(updatedLead!.interestedIn, "MBA");
    assert.ok(
      updatedLead!.stage === "INTERESTED" || updatedLead!.stage === "FOLLOW_UP"
    );
  });
});

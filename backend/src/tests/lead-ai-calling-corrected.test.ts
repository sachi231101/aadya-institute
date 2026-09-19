/**
 * Tests for Lead AI Calling corrected plan:
 * - Intent normalizer (taxonomy + synonyms)
 * - agent_variables dial payload helpers
 * - Webhook → CallLog + Lead + follow-up merge
 * - Create / CSV ingest still auto-enqueues dial
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import type { AuthUser } from "../modules/auth/auth.types";
import {
  LEAD_INTENTS,
  normalizeLeadIntent,
  extractIntentFromAgentVariables,
  extractSummaryFromAgentVariables,
  extractCallbackAtFromAgentVariables,
} from "../modules/ai-calling/lead-intent.util";
import {
  DEFAULT_AGENT_VARIABLE_MAP,
  buildAgentVariables,
  computeMissingMappedFields,
  invalidAgentVariableMapTargets,
  resolveAgentVariableMap,
  type LeadAgentVariableSource,
} from "../modules/ai-calling/agent-variables.util";
import { AiCallingService } from "../modules/ai-calling/ai-calling.service";
import { LeadService } from "../modules/leads/lead.service";
import { ingestLeadRow } from "../modules/leads/services/lead-ingest.service";
import { buildIdempotencyKey } from "../modules/ai-calling/ai-calling.types";
import type { CallRequest } from "../integrations/telephony/telephony.types";

// ---------------------------------------------------------------------------
// 1. Intent normalizer
// ---------------------------------------------------------------------------

describe("LeadIntent normalizer", () => {
  test("maps every canonical taxonomy value to itself", () => {
    for (const intent of LEAD_INTENTS) {
      assert.strictEqual(
        normalizeLeadIntent(intent),
        intent,
        `expected ${intent} to normalize to itself`
      );
    }
  });

  test("normalizes spaced / dashed / lowercase variants of taxonomy", () => {
    assert.strictEqual(normalizeLeadIntent("highly interested"), "HIGHLY_INTERESTED");
    assert.strictEqual(normalizeLeadIntent("call-back-later"), "CALL_BACK_LATER");
    assert.strictEqual(normalizeLeadIntent("Need More Information"), "NEED_MORE_INFORMATION");
    assert.strictEqual(normalizeLeadIntent("  not_interested  "), "NOT_INTERESTED");
  });

  test("maps known synonyms to canonical intents", () => {
    const cases: Array<[string, (typeof LEAD_INTENTS)[number]]> = [
      ["YES", "INTERESTED"],
      ["WARM", "INTERESTED"],
      ["INTEREST", "INTERESTED"],
      ["HOT", "HIGHLY_INTERESTED"],
      ["HIGH", "HIGHLY_INTERESTED"],
      ["VERY_INTERESTED", "HIGHLY_INTERESTED"],
      ["HIGH_INTEREST", "HIGHLY_INTERESTED"],
      ["NO", "NOT_INTERESTED"],
      ["COLD", "NOT_INTERESTED"],
      ["LOW", "NOT_INTERESTED"],
      ["UNINTERESTED", "NOT_INTERESTED"],
      ["FOLLOWUP", "FOLLOW_UP_REQUIRED"],
      ["FOLLOW_UP", "FOLLOW_UP_REQUIRED"],
      ["CALLBACK", "CALL_BACK_LATER"],
      ["CALLBACK_REQUESTED", "CALL_BACK_LATER"],
      ["CALL_BACK", "CALL_BACK_LATER"],
      ["NO_ANSWER", "NOT_REACHABLE"],
      ["UNREACHABLE", "NOT_REACHABLE"],
      ["DID_NOT_PICK", "NOT_REACHABLE"],
      ["INVALID_NUMBER", "WRONG_NUMBER"],
      ["ALREADY_JOINED", "ALREADY_JOINED_ANOTHER"],
      ["COMPETITOR", "ALREADY_JOINED_ANOTHER"],
      ["MAYBE", "NEED_MORE_INFORMATION"],
      ["NEED_INFO", "NEED_MORE_INFORMATION"],
      ["MORE_INFO", "NEED_MORE_INFORMATION"],
      ["ENROLL", "ADMISSION_INTERESTED"],
      ["WANT_ADMISSION", "ADMISSION_INTERESTED"],
      ["READY_FOR_ADMISSION", "ADMISSION_INTERESTED"],
    ];
    for (const [raw, expected] of cases) {
      assert.strictEqual(
        normalizeLeadIntent(raw),
        expected,
        `${raw} → ${expected}`
      );
    }
  });

  test("phrase heuristics catch free-form Sarvam strings", () => {
    assert.strictEqual(
      normalizeLeadIntent("They are highly interested in the course"),
      "HIGHLY_INTERESTED"
    );
    assert.strictEqual(
      normalizeLeadIntent("Ready for admission next week"),
      "ADMISSION_INTERESTED"
    );
    assert.strictEqual(
      normalizeLeadIntent("Please call back tomorrow morning"),
      "CALL_BACK_LATER"
    );
    assert.strictEqual(
      normalizeLeadIntent("Wrong number — not the student"),
      "WRONG_NUMBER"
    );
    assert.strictEqual(
      normalizeLeadIntent("Already joined another institute"),
      "ALREADY_JOINED_ANOTHER"
    );
    assert.strictEqual(
      normalizeLeadIntent("Need more information about fees"),
      "NEED_MORE_INFORMATION"
    );
    assert.strictEqual(
      normalizeLeadIntent("Did not pick / no answer"),
      "NOT_REACHABLE"
    );
    assert.strictEqual(
      normalizeLeadIntent("Follow-up required after weekend"),
      "FOLLOW_UP_REQUIRED"
    );
    assert.strictEqual(
      normalizeLeadIntent("Seems interested overall"),
      "INTERESTED"
    );
  });

  test("returns null for empty or unknown values", () => {
    assert.strictEqual(normalizeLeadIntent(null), null);
    assert.strictEqual(normalizeLeadIntent(undefined), null);
    assert.strictEqual(normalizeLeadIntent(""), null);
    assert.strictEqual(normalizeLeadIntent("   "), null);
    assert.strictEqual(normalizeLeadIntent("GIBBERISH_XYZ"), null);
  });

  test("extractIntentFromAgentVariables reads common keys", () => {
    assert.strictEqual(
      extractIntentFromAgentVariables({ lead_intent: "CALLBACK" }),
      "CALL_BACK_LATER"
    );
    assert.strictEqual(
      extractIntentFromAgentVariables({ interestStatus: "HIGH" }),
      "HIGHLY_INTERESTED"
    );
    assert.strictEqual(
      extractIntentFromAgentVariables({ disposition: "WRONG_NUMBER" }),
      "WRONG_NUMBER"
    );
    assert.strictEqual(extractIntentFromAgentVariables({}), null);
    assert.strictEqual(extractIntentFromAgentVariables(null), null);
  });

  test("extractSummary and callback_at helpers", () => {
    assert.strictEqual(
      extractSummaryFromAgentVariables({ summary: "  Good call  " }),
      "Good call"
    );
    assert.strictEqual(
      extractSummaryFromAgentVariables({ ai_summary: "Alt" }),
      "Alt"
    );
    const at = extractCallbackAtFromAgentVariables({
      callback_at: "2030-06-15T10:00:00.000Z",
    });
    assert.ok(at);
    assert.strictEqual(at!.toISOString(), "2030-06-15T10:00:00.000Z");
    assert.strictEqual(extractCallbackAtFromAgentVariables({}), null);
  });
});

// ---------------------------------------------------------------------------
// 2. agent_variables dial payload helpers
// ---------------------------------------------------------------------------

describe("buildAgentVariables dial payload", () => {
  const fullLead = {
    name: "Priya Sharma",
    phoneNumber: "9876543210",
    email: "priya@example.com",
    interestedIn: "NEET",
    source: "ONLINE",
    notes: "Prefers weekends",
    stage: "NEW",
    priority: "HIGH",
    tags: ["hot", "neet"],
    course: { name: "NEET Crash" },
    branch: { name: "Bengaluru HQ" },
  };

  test("seeds known non-empty mapped fields and sets empty missing_fields", () => {
    const { agentVariables, missingFields } = buildAgentVariables(fullLead);
    assert.strictEqual(agentVariables.lead_name, "Priya Sharma");
    assert.strictEqual(agentVariables.phone_number, "9876543210");
    assert.strictEqual(agentVariables.email, "priya@example.com");
    assert.strictEqual(agentVariables.course_interest, "NEET");
    assert.strictEqual(agentVariables.known_course_interest, "NEET");
    assert.strictEqual(agentVariables.course_name, "NEET Crash");
    assert.strictEqual(agentVariables.branch_name, "Bengaluru HQ");
    assert.strictEqual(agentVariables.source, "ONLINE");
    assert.strictEqual(agentVariables.notes, "Prefers weekends");
    assert.strictEqual(agentVariables.lead_stage, "NEW");
    assert.deepStrictEqual(missingFields, []);
    assert.strictEqual(agentVariables.missing_fields, "");
  });

  test("omits empty mapped values and lists them in missing_fields", () => {
    const { agentVariables, missingFields } = buildAgentVariables({
      name: "Sparse Lead",
      phoneNumber: "9123456789",
      email: null,
      interestedIn: null,
      source: "WALK_IN",
      notes: "  ",
      stage: "NEW",
      course: null,
      branch: { name: null },
    });

    assert.strictEqual(agentVariables.lead_name, "Sparse Lead");
    assert.strictEqual(agentVariables.phone_number, "9123456789");
    assert.strictEqual(agentVariables.source, "WALK_IN");
    assert.strictEqual(agentVariables.lead_stage, "NEW");
    assert.ok(!("email" in agentVariables));
    assert.ok(!("course_interest" in agentVariables));
    assert.ok(!("known_course_interest" in agentVariables));
    assert.ok(!("course_name" in agentVariables));
    assert.ok(!("branch_name" in agentVariables));
    assert.ok(!("notes" in agentVariables));

    assert.ok(missingFields.includes("email"));
    assert.ok(missingFields.includes("course_interest"));
    assert.ok(missingFields.includes("known_course_interest"));
    assert.ok(missingFields.includes("course_name"));
    assert.ok(missingFields.includes("branch_name"));
    assert.ok(missingFields.includes("notes"));
    assert.strictEqual(agentVariables.missing_fields, missingFields.join(","));
  });

  test("respects custom agentVariableMap and default resolve", () => {
    const map = { student_name: "name", course: "interestedIn" };
    const { agentVariables, missingFields } = buildAgentVariables(
      {
        name: "Ravi",
        phoneNumber: "9000000001",
        interestedIn: "",
      },
      map
    );
    assert.strictEqual(agentVariables.student_name, "Ravi");
    assert.ok(!("course" in agentVariables));
    assert.deepStrictEqual(missingFields, ["course"]);
    assert.strictEqual(agentVariables.missing_fields, "course");

    const resolved = resolveAgentVariableMap(null);
    assert.deepStrictEqual(resolved, DEFAULT_AGENT_VARIABLE_MAP);
  });

  test("invalidAgentVariableMapTargets and computeMissingMappedFields", () => {
    const bad = invalidAgentVariableMapTargets({
      a: "name",
      b: "notARealField",
    });
    assert.deepStrictEqual(bad, ["b→notARealField"]);

    const missing = computeMissingMappedFields({
      name: "X",
      phoneNumber: "1",
      email: null,
      interestedIn: "MBA",
    });
    assert.ok(missing.includes("email"));
    assert.ok(!missing.includes("course_interest"));
    assert.ok(!missing.includes("known_course_interest"));
  });

  test("dial CallRequest shape seeds agentVariables the same way processCallJob does", () => {
    // Mirrors ai-calling.service processCallJob → initiateCall({ agentVariables })
    const lead: LeadAgentVariableSource = {
      name: "Dial Vars Lead",
      phoneNumber: "+919876509901",
      email: "dialvars@test.org",
      interestedIn: "Full Stack",
      source: "ONLINE",
      notes: null,
      stage: "NEW",
      course: null,
      branch: { name: "LAIC HQ" },
    };
    const { agentVariables } = buildAgentVariables(lead, null);
    const callRequest: CallRequest = {
      to: lead.phoneNumber,
      from: "+910000000099",
      callbackUrl: "https://app.test/api/v1/webhooks/sarvam/callback",
      metadata: { leadId: "lead_1", instituteId: "inst_1" },
      agentVariables,
    };

    assert.ok(callRequest.agentVariables);
    assert.strictEqual(callRequest.agentVariables!.lead_name, "Dial Vars Lead");
    assert.strictEqual(callRequest.agentVariables!.course_interest, "Full Stack");
    assert.strictEqual(
      callRequest.agentVariables!.known_course_interest,
      "Full Stack"
    );
    assert.strictEqual(callRequest.agentVariables!.email, "dialvars@test.org");
    assert.strictEqual(callRequest.agentVariables!.branch_name, "LAIC HQ");
    assert.ok(!("notes" in callRequest.agentVariables!));
    assert.ok(!("course_name" in callRequest.agentVariables!));
    assert.ok(
      String(callRequest.agentVariables!.missing_fields).includes("notes")
    );
    assert.ok(
      String(callRequest.agentVariables!.missing_fields).includes("course_name")
    );
  });
});

// ---------------------------------------------------------------------------
// 3–4. Webhook merge + create/import auto-enqueue regression
// ---------------------------------------------------------------------------

describe("Lead AI Calling corrected — webhook & auto-dial", () => {
  let instituteId: string;
  let branchId: string;
  let userId: string;
  let admin: AuthUser;

  before(async () => {
    const institute = await prisma.institute.upsert({
      where: { code: "TEST-LEAD-AI-CORR" },
      update: {
        name: "Lead AI Corrected Test",
        timezone: "Asia/Kolkata",
        status: "ACTIVE",
      },
      create: {
        name: "Lead AI Corrected Test",
        code: "TEST-LEAD-AI-CORR",
        email: "lead-ai-corr@test.org",
        timezone: "Asia/Kolkata",
      },
    });
    instituteId = institute.id;

    const branch = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "LAIC-HQ" } },
      update: {},
      create: {
        instituteId,
        name: "LAIC HQ",
        code: "LAIC-HQ",
      },
    });
    branchId = branch.id;

    let user = await prisma.user.findFirst({
      where: { email: "lead-ai-corr-admin@test.org" },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "LAIC Admin",
          email: "lead-ai-corr-admin@test.org",
          phone: "9000000301",
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

    await prisma.instituteAiCallingConfig.upsert({
      where: { instituteId },
      create: {
        instituteId,
        fromNumber: "+910000000099",
        callingScript: "Corrected plan script",
        isEnabled: true,
        dailyCallLimit: 200,
        maxAttemptsPerLead: 3,
      },
      update: {
        fromNumber: "+910000000099",
        isEnabled: true,
        dailyCallLimit: 200,
        maxAttemptsPerLead: 3,
        callingHoursStart: null,
        callingHoursEnd: null,
        callingDays: [],
        agentVariableMap: undefined,
      },
    });
  });

  after(async () => {
    await prisma.leadFollowUp.deleteMany({ where: { lead: { instituteId } } });
    await prisma.leadActivity.deleteMany({ where: { lead: { instituteId } } });
    await prisma.callLog.deleteMany({ where: { instituteId } });
    await prisma.lead.deleteMany({ where: { instituteId } });
    await prisma.dataImportJob.deleteMany({ where: { instituteId } });
    await prisma.aiCallingUsageDaily.deleteMany({ where: { instituteId } });
  });

  test("webhook with rich final_agent_variables updates CallLog, Lead, and callback follow-up", async () => {
    const lead = await prisma.lead.create({
      data: {
        instituteId,
        branchId,
        name: "Webhook Rich Lead",
        phoneNumber: "+919876509902",
        normalizedPhone: "9876509902",
        interestedIn: "TBD",
        source: "AI_CALLING",
        stage: "NEW",
        status: "ACTIVE",
        createdById: userId,
      },
    });

    const extId = `laic_webhook_${lead.id}`;
    const callLog = await prisma.callLog.create({
      data: {
        instituteId,
        branchId,
        leadId: lead.id,
        externalCallId: extId,
        status: "INITIATED",
        callType: "AI",
        duration: 0,
        attemptNumber: 1,
        idempotencyKey: buildIdempotencyKey(instituteId, lead.id, 9),
        startedAt: new Date(),
      },
    });

    const callbackAt = "2030-09-20T09:30:00.000Z";
    await AiCallingService.handleSarvamWebhook({
      attempt_id: extId,
      status: "connected",
      duration: 95,
      recording_url: "https://recordings.test/laic.mp3",
      interaction_transcript: [
        { role: "agent", text: "Hello" },
        { role: "user", text: "Call me later" },
      ],
      final_agent_variables: {
        lead_intent: "CALL_BACK_LATER",
        summary: "Asked to call back Saturday morning",
        course_interest: "Data Science",
        email: "rich.lead@example.com",
        budget: "80000",
        preferred_timing: "weekend mornings",
        objections: "fee concern",
        callback_at: callbackAt,
        remarks: "Very polite; fee sensitive",
      },
      metadata: { instituteId, leadId: lead.id },
    });

    const updatedLog = await prisma.callLog.findUnique({ where: { id: callLog.id } });
    assert.ok(updatedLog);
    assert.strictEqual(updatedLog!.status, "COMPLETED");
    assert.strictEqual(updatedLog!.interestStatus, "CALL_BACK_LATER");
    assert.strictEqual(updatedLog!.aiSummary, "Asked to call back Saturday morning");
    assert.strictEqual(updatedLog!.recordingUrl, "https://recordings.test/laic.mp3");
    assert.ok(updatedLog!.extractedFields);
    const extracted = updatedLog!.extractedFields as Record<string, unknown>;
    assert.strictEqual(extracted.lead_intent, "CALL_BACK_LATER");
    assert.strictEqual(extracted.course_interest, "Data Science");
    assert.strictEqual(extracted.budget, "80000");
    assert.ok(Array.isArray(extracted._missingFieldsAfterMerge));

    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert.ok(updatedLead);
    assert.strictEqual(updatedLead!.leadIntent, "CALL_BACK_LATER");
    assert.strictEqual(updatedLead!.interestedIn, "Data Science");
    assert.strictEqual(updatedLead!.email, "rich.lead@example.com");
    assert.strictEqual(updatedLead!.stage, "FOLLOW_UP");
    // Fallback heuristic (no Sarvam lead_score): intent + extraction signals, not a fixed intent→score map
    assert.ok(
      (updatedLead!.leadScore ?? 0) >= 40 && (updatedLead!.leadScore ?? 0) < 80,
      `expected heuristic mid-band score, got ${updatedLead!.leadScore}`
    );
    assert.ok(
      updatedLead!.leadTemperature === "WARM" ||
        updatedLead!.leadTemperature === "COOL",
      `expected WARM/COOL temperature, got ${updatedLead!.leadTemperature}`
    );
    assert.ok(updatedLead!.notes?.includes("[AI Call]"));
    assert.ok(updatedLead!.aiCollectedFields);
    const aiFields = updatedLead!.aiCollectedFields as Record<string, unknown>;
    assert.strictEqual(aiFields.budget, "80000");
    assert.strictEqual(aiFields.preferred_timing, "weekend mornings");

    const followUps = await prisma.leadFollowUp.findMany({
      where: { leadId: lead.id, status: "PENDING" },
    });
    assert.ok(followUps.length >= 1, "callback intent must create follow-up");
    assert.ok(followUps.some((f) => f.priority === "HIGH"));
  });

  test("regression: LeadService.createLead auto-creates CallLog / dial path", async () => {
    const lead = await LeadService.createLead(admin, {
      name: "Create Auto Dial",
      phoneNumber: "9876509903",
      interestedIn: "MBA",
      branchId,
      source: "WALK_IN",
    });

    const callLogs = await prisma.callLog.findMany({
      where: { leadId: lead.id, instituteId },
    });
    assert.strictEqual(callLogs.length, 1);
    assert.ok(
      callLogs[0].status === "INITIATED" || callLogs[0].status === "FAILED",
      `unexpected status ${callLogs[0].status}`
    );
  });

  test("regression: CSV ingest sets dialQueued and creates CallLog", async () => {
    const job = await prisma.dataImportJob.create({
      data: {
        instituteId,
        createdById: userId,
        entityType: "leads",
        status: "COMPLETED",
        fileName: "laic-import.csv",
      },
    });

    const result = await ingestLeadRow({
      instituteId,
      createdById: userId,
      importJobId: job.id,
      defaultSource: "AI_CALLING",
      row: {
        name: "Import Auto Dial",
        phoneNumber: "9876509904",
        interestedIn: "NEET",
        branchId,
      },
    });

    assert.strictEqual(result.created, true);
    assert.strictEqual(result.dialQueued, true);

    const callLog = await prisma.callLog.findFirst({
      where: { leadId: result.leadId, instituteId },
    });
    assert.ok(callLog, "import must create CallLog via startInitialAiCall");
  });
});

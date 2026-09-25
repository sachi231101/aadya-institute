import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import { mockEmbedText } from "../integrations/embeddings/embeddings.client";
import {
  buildCallSummaryIndexContent,
  maskPhoneLast4,
  searchCallSummaryEmbeddings,
  upsertCallSummaryEmbeddingRaw,
} from "../modules/ai-agent/call-summary-embedding.service";
import { executeAITool } from "../modules/ai-agent/tools";
import type { AIToolAuthContext } from "../modules/ai-agent/security/ai-scope.service";
import { AISecurityScopeService } from "../modules/ai-agent/security/ai-scope.service";

describe("Call summary vector search", () => {
  let instituteId: string;
  let branchAId: string;
  let branchBId: string;
  let leadAId: string;
  let leadBId: string;
  let callAId: string;
  let callBId: string;
  let adminUserId: string;

  before(async () => {
    process.env.USE_MOCK_EMBEDDINGS = "1";

    const institute = await prisma.institute.upsert({
      where: { code: "TEST-VEC-SUM" },
      update: {},
      create: {
        name: "Vector Summary Test Institute",
        code: "TEST-VEC-SUM",
        status: "ACTIVE",
      },
    });
    instituteId = institute.id;

    const branchA = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "VEC-A" } },
      update: {},
      create: {
        instituteId,
        name: "Vector Branch A",
        code: "VEC-A",
        status: "ACTIVE",
      },
    });
    const branchB = await prisma.branch.upsert({
      where: { instituteId_code: { instituteId, code: "VEC-B" } },
      update: {},
      create: {
        instituteId,
        name: "Vector Branch B",
        code: "VEC-B",
        status: "ACTIVE",
      },
    });
    branchAId = branchA.id;
    branchBId = branchB.id;

    let admin = await prisma.user.findFirst({
      where: { email: "vec-summary-admin@test.local" },
    });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: "vec-summary-admin@test.local",
          name: "Vec Admin",
          passwordHash: "test",
          instituteId,
          branchId: branchAId,
          status: "ACTIVE",
        },
      });
    } else {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { instituteId, branchId: branchAId },
      });
    }
    adminUserId = admin.id;

    const leadA = await prisma.lead.create({
      data: {
        instituteId,
        branchId: branchAId,
        name: "EMI Lead A",
        phoneNumber: "919876543210",
        interestedIn: "Full Stack",
        createdById: adminUserId,
        stage: "INTERESTED",
      },
    });
    const leadB = await prisma.lead.create({
      data: {
        instituteId,
        branchId: branchBId,
        name: "Callback Lead B",
        phoneNumber: "919811122233",
        interestedIn: "Data Science",
        createdById: adminUserId,
        stage: "FOLLOW_UP",
      },
    });
    leadAId = leadA.id;
    leadBId = leadB.id;

    const callA = await prisma.callLog.create({
      data: {
        instituteId,
        branchId: branchAId,
        leadId: leadAId,
        status: "COMPLETED",
        callType: "AI",
        aiSummary:
          "Lead asked about EMI and installment fee options for the Full Stack course. Interested in weekend batches.",
        interestStatus: "HIGH",
        idempotencyKey: `vec-test-a-${Date.now()}`,
        endedAt: new Date(),
      },
    });
    const callB = await prisma.callLog.create({
      data: {
        instituteId,
        branchId: branchBId,
        leadId: leadBId,
        status: "COMPLETED",
        callType: "AI",
        aiSummary:
          "Lead requested a callback next week about Data Science admission. No mention of fees.",
        interestStatus: "MEDIUM",
        idempotencyKey: `vec-test-b-${Date.now()}`,
        endedAt: new Date(),
      },
    });
    callAId = callA.id;
    callBId = callB.id;

    const contentA = buildCallSummaryIndexContent({
      aiSummary: callA.aiSummary!,
      leadName: leadA.name,
      phoneNumber: leadA.phoneNumber,
      interestStatus: callA.interestStatus,
    });
    const contentB = buildCallSummaryIndexContent({
      aiSummary: callB.aiSummary!,
      leadName: leadB.name,
      phoneNumber: leadB.phoneNumber,
      interestStatus: callB.interestStatus,
    });

    await upsertCallSummaryEmbeddingRaw({
      callLogId: callAId,
      instituteId,
      branchId: branchAId,
      leadId: leadAId,
      content: contentA,
      embedding: mockEmbedText(contentA),
      model: "mock-embedding",
    });
    await upsertCallSummaryEmbeddingRaw({
      callLogId: callBId,
      instituteId,
      branchId: branchBId,
      leadId: leadBId,
      content: contentB,
      embedding: mockEmbedText(contentB),
      model: "mock-embedding",
    });
  });

  after(async () => {
    await prisma.callSummaryEmbedding.deleteMany({
      where: { callLogId: { in: [callAId, callBId].filter(Boolean) } },
    });
    await prisma.callLog.deleteMany({
      where: { id: { in: [callAId, callBId].filter(Boolean) } },
    });
    await prisma.lead.deleteMany({
      where: { id: { in: [leadAId, leadBId].filter(Boolean) } },
    });
  });

  test("maskPhoneLast4 hides full number", () => {
    assert.strictEqual(maskPhoneLast4("919876543210"), "****3210");
  });

  test("sanitizeToolArgs strips spoofed branchId", () => {
    const ctx: AIToolAuthContext = {
      userId: adminUserId,
      instituteId,
      branchId: branchAId,
      roles: ["CENTER_MANAGER"],
      permissions: [],
      isAdmin: false,
      isCenterManager: true,
    };
    const clean = AISecurityScopeService.sanitizeToolArgs(
      { query: "EMI", branchId: branchBId, instituteId: "evil" },
      ctx
    );
    assert.strictEqual((clean as { query: string }).query, "EMI");
    assert.ok(!("branchId" in clean));
    assert.ok(!("instituteId" in clean));
  });

  test("Center Manager A search does not return Branch B call summaries", async () => {
    const queryEmbedding = mockEmbedText("EMI installment fee options");
    const hits = await searchCallSummaryEmbeddings({
      instituteId,
      branchId: branchAId,
      queryEmbedding,
      limit: 10,
    });

    assert.ok(hits.length >= 1);
    assert.ok(hits.every((h) => h.callLogId === callAId));
    assert.ok(!hits.some((h) => h.callLogId === callBId));
    assert.ok(hits[0].phoneLast4.startsWith("****"));
    assert.ok(!hits[0].summary.includes("919876543210"));
  });

  test("Admin institute-wide search can see both branches", async () => {
    const queryEmbedding = mockEmbedText("callback next week admission");
    const hits = await searchCallSummaryEmbeddings({
      instituteId,
      branchId: null,
      queryEmbedding,
      limit: 10,
    });

    const ids = new Set(hits.map((h) => h.callLogId));
    assert.ok(ids.has(callAId) || ids.has(callBId));
    assert.ok(hits.length >= 1);
  });

  test("search_call_summaries tool respects CM branch scope", async () => {
    const mgrACtx: AIToolAuthContext = {
      userId: adminUserId,
      instituteId,
      branchId: branchAId,
      roles: ["CENTER_MANAGER"],
      permissions: [],
      isAdmin: false,
      isCenterManager: true,
    };

    const result = await executeAITool(
      "search_call_summaries",
      { query: "EMI installment fees", limit: 5, branchId: branchBId },
      mgrACtx
    );

    assert.strictEqual(result.success, true);
    const data = result.data as { results: Array<{ callLogId: string }> };
    assert.ok(Array.isArray(data.results));
    assert.ok(data.results.every((r) => r.callLogId === callAId));
  });
});

import { randomUUID } from "crypto";
import { prisma } from "../../config/database";
import {
  GEMINI_EMBEDDING_DIMS,
  GEMINI_EMBEDDING_MODEL,
  embedDocument,
  hashEmbedContent,
} from "../../integrations/embeddings/embeddings.client";
import { logger } from "../../config/logger";

const MAX_CANDIDATES = 500;

export function maskPhoneLast4(phone: string | null | undefined): string {
  if (!phone) return "****";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}

export function buildCallSummaryIndexContent(input: {
  aiSummary: string;
  leadName?: string | null;
  phoneNumber?: string | null;
  interestStatus?: string | null;
}): string {
  const parts = [
    input.leadName ? `Lead: ${input.leadName}` : null,
    `Phone: ${maskPhoneLast4(input.phoneNumber)}`,
    input.interestStatus ? `Interest: ${input.interestStatus}` : null,
    `Summary: ${input.aiSummary.trim()}`,
  ].filter(Boolean);
  return parts.join("\n");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!denom) return 0;
  return dot / denom;
}

export type CallSummarySearchHit = {
  callLogId: string;
  leadId: string | null;
  leadName: string | null;
  phoneLast4: string;
  summary: string;
  callDate: string;
  similarity: number;
};

/**
 * Index or refresh embedding for a CallLog that has aiSummary.
 * Returns false when skipped (no summary).
 */
export async function indexCallSummaryEmbedding(callLogId: string): Promise<boolean> {
  const callLog = await prisma.callLog.findUnique({
    where: { id: callLogId },
    select: {
      id: true,
      instituteId: true,
      branchId: true,
      leadId: true,
      aiSummary: true,
      interestStatus: true,
      lead: { select: { name: true, phoneNumber: true } },
    },
  });

  if (!callLog?.aiSummary?.trim()) {
    logger.info({ callLogId }, "[call-summary-embedding] Skip — empty aiSummary");
    return false;
  }

  const content = buildCallSummaryIndexContent({
    aiSummary: callLog.aiSummary,
    leadName: callLog.lead?.name,
    phoneNumber: callLog.lead?.phoneNumber,
    interestStatus: callLog.interestStatus,
  });
  const contentHash = hashEmbedContent(content);

  const existing = await prisma.callSummaryEmbedding.findUnique({
    where: { callLogId },
    select: { id: true, contentHash: true },
  });
  if (existing?.contentHash === contentHash) {
    return true;
  }

  const { embedding, model } = await embedDocument(callLog.instituteId, content);
  if (embedding.length !== GEMINI_EMBEDDING_DIMS) {
    throw new Error(`Unexpected embedding length ${embedding.length}`);
  }

  await prisma.callSummaryEmbedding.upsert({
    where: { callLogId: callLog.id },
    create: {
      id: existing?.id ?? randomUUID(),
      callLogId: callLog.id,
      instituteId: callLog.instituteId,
      branchId: callLog.branchId,
      leadId: callLog.leadId,
      content,
      embedding,
      model: model || GEMINI_EMBEDDING_MODEL,
      contentHash,
    },
    update: {
      instituteId: callLog.instituteId,
      branchId: callLog.branchId,
      leadId: callLog.leadId,
      content,
      embedding,
      model: model || GEMINI_EMBEDDING_MODEL,
      contentHash,
    },
  });

  return true;
}

/** Upsert a precomputed embedding (tests / helpers). */
export async function upsertCallSummaryEmbeddingRaw(input: {
  callLogId: string;
  instituteId: string;
  branchId: string | null;
  leadId: string | null;
  content: string;
  embedding: number[];
  model?: string;
}): Promise<void> {
  const contentHash = hashEmbedContent(input.content);
  await prisma.callSummaryEmbedding.upsert({
    where: { callLogId: input.callLogId },
    create: {
      callLogId: input.callLogId,
      instituteId: input.instituteId,
      branchId: input.branchId,
      leadId: input.leadId,
      content: input.content,
      embedding: input.embedding,
      model: input.model || GEMINI_EMBEDDING_MODEL,
      contentHash,
    },
    update: {
      instituteId: input.instituteId,
      branchId: input.branchId,
      leadId: input.leadId,
      content: input.content,
      embedding: input.embedding,
      model: input.model || GEMINI_EMBEDDING_MODEL,
      contentHash,
    },
  });
}

export async function searchCallSummaryEmbeddings(params: {
  instituteId: string;
  branchId?: string | null;
  queryEmbedding: number[];
  limit: number;
}): Promise<CallSummarySearchHit[]> {
  const limit = Math.min(Math.max(params.limit, 1), 10);
  const branchId = params.branchId ?? null;

  const rows = await prisma.callSummaryEmbedding.findMany({
    where: {
      instituteId: params.instituteId,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: MAX_CANDIDATES,
    select: {
      callLogId: true,
      leadId: true,
      embedding: true,
      callLog: {
        select: {
          aiSummary: true,
          endedAt: true,
          createdAt: true,
        },
      },
      lead: {
        select: {
          name: true,
          phoneNumber: true,
        },
      },
    },
  });

  const scored = rows
    .map((row) => {
      const similarity = cosineSimilarity(params.queryEmbedding, row.embedding);
      const callDate = row.callLog.endedAt || row.callLog.createdAt;
      return {
        callLogId: row.callLogId,
        leadId: row.leadId,
        leadName: row.lead?.name ?? null,
        phoneLast4: maskPhoneLast4(row.lead?.phoneNumber),
        summary: (row.callLog.aiSummary || "").slice(0, 500),
        callDate: callDate.toISOString(),
        similarity: Math.round(similarity * 1000) / 1000,
      } satisfies CallSummarySearchHit;
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

/**
 * Backfill CallSummaryEmbedding rows for CallLogs that already have aiSummary.
 *
 * Usage: npx tsx src/scripts/backfill-call-summary-embeddings.ts
 * Set USE_MOCK_EMBEDDINGS=1 to skip live Gemini (local/dev without key).
 */
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { indexCallSummaryEmbedding } from "../modules/ai-agent/call-summary-embedding.service";

async function main() {
  const rows = await prisma.callLog.findMany({
    where: {
      aiSummary: { not: null },
      NOT: { aiSummary: "" },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  logger.info({ count: rows.length }, "[backfill-call-summary-embeddings] Starting");

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const indexed = await indexCallSummaryEmbedding(row.id);
      if (indexed) ok += 1;
      else skipped += 1;
    } catch (err) {
      failed += 1;
      logger.warn({ err, callLogId: row.id }, "[backfill-call-summary-embeddings] Failed row");
    }
  }

  logger.info(
    { ok, skipped, failed, total: rows.length },
    "[backfill-call-summary-embeddings] Done"
  );
}

main()
  .catch((err) => {
    logger.error({ err }, "[backfill-call-summary-embeddings] Fatal");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

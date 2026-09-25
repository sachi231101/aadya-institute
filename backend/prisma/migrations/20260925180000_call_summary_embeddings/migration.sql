-- Call-summary semantic index.
-- Uses float8[] so it works without the pgvector extension (Windows/local Postgres).
-- Cosine similarity is computed in SQL via unnest; scale is fine for institute call volumes.

CREATE TABLE "CallSummaryEmbedding" (
    "id" TEXT NOT NULL,
    "callLogId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "leadId" TEXT,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[] NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSummaryEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CallSummaryEmbedding_callLogId_key" ON "CallSummaryEmbedding"("callLogId");
CREATE INDEX "CallSummaryEmbedding_instituteId_branchId_idx" ON "CallSummaryEmbedding"("instituteId", "branchId");
CREATE INDEX "CallSummaryEmbedding_leadId_idx" ON "CallSummaryEmbedding"("leadId");
CREATE INDEX "CallSummaryEmbedding_instituteId_idx" ON "CallSummaryEmbedding"("instituteId");

ALTER TABLE "CallSummaryEmbedding"
  ADD CONSTRAINT "CallSummaryEmbedding_callLogId_fkey"
  FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallSummaryEmbedding"
  ADD CONSTRAINT "CallSummaryEmbedding_instituteId_fkey"
  FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallSummaryEmbedding"
  ADD CONSTRAINT "CallSummaryEmbedding_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CallSummaryEmbedding"
  ADD CONSTRAINT "CallSummaryEmbedding_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

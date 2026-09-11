-- Full Fee Model: Decimal money, VOID status, PaymentAllocation, required fee heads

-- 1. Add VOID to PaymentStatus
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'VOID';

-- 2. Convert Course.fee to Decimal
ALTER TABLE "Course"
  ALTER COLUMN "fee" TYPE DECIMAL(12,2) USING CASE WHEN "fee" IS NULL THEN NULL ELSE ROUND("fee"::numeric, 2) END;

-- 3. Convert FeePlanTemplate.totalAmount
ALTER TABLE "FeePlanTemplate"
  ALTER COLUMN "totalAmount" TYPE DECIMAL(12,2) USING ROUND("totalAmount"::numeric, 2);

-- 4. Convert Payment.amount
ALTER TABLE "Payment"
  ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric, 2);

-- 5. Convert PendingFee money columns
ALTER TABLE "PendingFee"
  ALTER COLUMN "totalFee" TYPE DECIMAL(12,2) USING ROUND("totalFee"::numeric, 2),
  ALTER COLUMN "amountPaid" TYPE DECIMAL(12,2) USING ROUND(COALESCE("amountPaid", 0)::numeric, 2),
  ALTER COLUMN "dueAmount" TYPE DECIMAL(12,2) USING ROUND("dueAmount"::numeric, 2);

ALTER TABLE "PendingFee"
  ALTER COLUMN "amountPaid" SET DEFAULT 0;

-- 6. Ensure Tuition fee head exists per institute that has fees
INSERT INTO "MasterRecord" ("id", "instituteId", "entityType", "code", "name", "status", "sortOrder", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || i.id),
  i.id,
  'feeheads',
  'TUITION',
  'Tuition Fee',
  'ACTIVE',
  1,
  NOW(),
  NOW()
FROM "Institute" i
WHERE NOT EXISTS (
  SELECT 1 FROM "MasterRecord" m
  WHERE m."instituteId" = i.id
    AND m."entityType" = 'feeheads'
    AND (m."code" = 'TUITION' OR lower(m."name") LIKE '%tuition%')
);

-- Prefer existing Tuition by code, else by name, else any feehead, create was above
-- Backfill PendingFee.feeHeadMasterId
UPDATE "PendingFee" pf
SET
  "feeHeadMasterId" = COALESCE(
    pf."feeHeadMasterId",
    (
      SELECT m.id FROM "MasterRecord" m
      WHERE m."instituteId" = pf."instituteId"
        AND m."entityType" = 'feeheads'
        AND m."code" = 'TUITION'
      ORDER BY m."createdAt" ASC
      LIMIT 1
    ),
    (
      SELECT m.id FROM "MasterRecord" m
      WHERE m."instituteId" = pf."instituteId"
        AND m."entityType" = 'feeheads'
        AND lower(m."name") LIKE '%tuition%'
      ORDER BY m."createdAt" ASC
      LIMIT 1
    ),
    (
      SELECT m.id FROM "MasterRecord" m
      WHERE m."instituteId" = pf."instituteId"
        AND m."entityType" = 'feeheads'
      ORDER BY m."sortOrder" ASC, m."createdAt" ASC
      LIMIT 1
    )
  ),
  "feeHead" = COALESCE(
    pf."feeHead",
    (
      SELECT m.name FROM "MasterRecord" m
      WHERE m."instituteId" = pf."instituteId"
        AND m."entityType" = 'feeheads'
        AND m."code" = 'TUITION'
      ORDER BY m."createdAt" ASC
      LIMIT 1
    ),
    'Tuition Fee'
  )
WHERE pf."feeHeadMasterId" IS NULL;

-- Backfill Payment.feeHeadMasterId (optional label)
UPDATE "Payment" p
SET
  "feeHeadMasterId" = COALESCE(
    p."feeHeadMasterId",
    (
      SELECT m.id FROM "MasterRecord" m
      WHERE m."instituteId" = p."instituteId"
        AND m."entityType" = 'feeheads'
        AND m."code" = 'TUITION'
      ORDER BY m."createdAt" ASC
      LIMIT 1
    )
  ),
  "feeHead" = COALESCE(p."feeHead", 'Tuition Fee')
WHERE p."feeHeadMasterId" IS NULL;

-- 7. Make PendingFee.feeHeadMasterId NOT NULL
-- Drop old FK if present, alter column, re-add as Restrict
ALTER TABLE "PendingFee" DROP CONSTRAINT IF EXISTS "PendingFee_feeHeadMasterId_fkey";

ALTER TABLE "PendingFee"
  ALTER COLUMN "feeHeadMasterId" SET NOT NULL;

ALTER TABLE "PendingFee"
  ADD CONSTRAINT "PendingFee_feeHeadMasterId_fkey"
  FOREIGN KEY ("feeHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. PaymentAllocation table
CREATE TABLE IF NOT EXISTS "PaymentAllocation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "pendingFeeId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAllocation_paymentId_pendingFeeId_key"
  ON "PaymentAllocation"("paymentId", "pendingFeeId");

CREATE INDEX IF NOT EXISTS "PaymentAllocation_pendingFeeId_idx" ON "PaymentAllocation"("pendingFeeId");
CREATE INDEX IF NOT EXISTS "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

DO $$ BEGIN
  ALTER TABLE "PaymentAllocation"
    ADD CONSTRAINT "PaymentAllocation_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentAllocation"
    ADD CONSTRAINT "PaymentAllocation_pendingFeeId_fkey"
    FOREIGN KEY ("pendingFeeId") REFERENCES "PendingFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Backfill allocations from legacy pendingFeeId links
INSERT INTO "PaymentAllocation" ("id", "paymentId", "pendingFeeId", "amount", "createdAt")
SELECT
  md5(p.id || COALESCE(p."pendingFeeId", '')),
  p.id,
  p."pendingFeeId",
  p.amount,
  COALESCE(p."createdAt", NOW())
FROM "Payment" p
WHERE p."pendingFeeId" IS NOT NULL
  AND p.status = 'SUCCESS'
  AND NOT EXISTS (
    SELECT 1 FROM "PaymentAllocation" a
    WHERE a."paymentId" = p.id AND a."pendingFeeId" = p."pendingFeeId"
  );

-- 10. Helpful indexes
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "PendingFee_feeHeadMasterId_idx" ON "PendingFee"("feeHeadMasterId");
CREATE INDEX IF NOT EXISTS "PendingFee_instituteId_dueDate_idx" ON "PendingFee"("instituteId", "dueDate");
CREATE INDEX IF NOT EXISTS "PendingFee_status_dueAmount_idx" ON "PendingFee"("status", "dueAmount");

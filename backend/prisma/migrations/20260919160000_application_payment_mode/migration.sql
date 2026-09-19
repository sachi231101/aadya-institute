-- AlterTable
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "paymentModeMasterId" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "paymentRef" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "feePaidAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Application_paymentModeMasterId_idx" ON "Application"("paymentModeMasterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Application_paymentModeMasterId_fkey'
  ) THEN
    ALTER TABLE "Application"
      ADD CONSTRAINT "Application_paymentModeMasterId_fkey"
      FOREIGN KEY ("paymentModeMasterId") REFERENCES "MasterRecord"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

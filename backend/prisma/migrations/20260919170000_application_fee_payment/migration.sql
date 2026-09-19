-- AlterTable
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Application_paymentId_key" ON "Application"("paymentId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Application_paymentId_fkey'
  ) THEN
    ALTER TABLE "Application"
      ADD CONSTRAINT "Application_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

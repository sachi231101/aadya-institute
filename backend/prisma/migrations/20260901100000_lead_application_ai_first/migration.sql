-- Link applications back to the originating lead
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

CREATE INDEX IF NOT EXISTS "Application_leadId_idx" ON "Application"("leadId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Application_leadId_fkey'
  ) THEN
    ALTER TABLE "Application"
      ADD CONSTRAINT "Application_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- New leads start unassigned until AI call + counsellor allocation
ALTER TABLE "Lead" ALTER COLUMN "stage" SET DEFAULT 'NEW';

-- Display order: NEW → CONTACTED → ASSIGNED → …
UPDATE "MasterRecord"
SET "sortOrder" = 2
WHERE "entityType" = 'leadstage' AND "code" = 'CONTACTED';

UPDATE "MasterRecord"
SET "sortOrder" = 3
WHERE "entityType" = 'leadstage' AND "code" = 'ASSIGNED';

-- Lead Management Phase 0: score/tags, CallLog callType/caller, FollowUp priority

ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'SCORE_UPDATED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'MERGED';

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "leadScore" INTEGER;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "admissionProbability" INTEGER;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextBestAction" TEXT;

CREATE INDEX IF NOT EXISTS "Lead_instituteId_leadScore_idx" ON "Lead"("instituteId", "leadScore");
CREATE INDEX IF NOT EXISTS "Lead_instituteId_createdAt_idx" ON "Lead"("instituteId", "createdAt");

ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "callType" TEXT NOT NULL DEFAULT 'AI';
ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "callerUserId" TEXT;
ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "qualification" TEXT;
ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "sentiment" TEXT;
ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;

CREATE INDEX IF NOT EXISTS "CallLog_callerUserId_idx" ON "CallLog"("callerUserId");
CREATE INDEX IF NOT EXISTS "CallLog_instituteId_callType_idx" ON "CallLog"("instituteId", "callType");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CallLog_callerUserId_fkey'
  ) THEN
    ALTER TABLE "CallLog"
      ADD CONSTRAINT "CallLog_callerUserId_fkey"
      FOREIGN KEY ("callerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "LeadFollowUp" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "LeadFollowUp" ADD COLUMN IF NOT EXISTS "recommendedRank" INTEGER;

CREATE INDEX IF NOT EXISTS "LeadFollowUp_priority_idx" ON "LeadFollowUp"("priority");
-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LATE', 'GRADED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Assignment
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "maxMarks" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "allowLate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable AssignmentSubmission
ALTER TABLE "AssignmentSubmission" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "AssignmentSubmission" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "AssignmentSubmission" ADD COLUMN IF NOT EXISTS "submissionStatus" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill submissionStatus from existing null markers
UPDATE "AssignmentSubmission"
SET "submissionStatus" = CASE
  WHEN "evaluatedAt" IS NOT NULL THEN 'GRADED'::"AssignmentSubmissionStatus"
  WHEN "submittedAt" IS NOT NULL THEN 'SUBMITTED'::"AssignmentSubmissionStatus"
  ELSE 'PENDING'::"AssignmentSubmissionStatus"
END;

-- Add Assignment.batch FK if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Assignment_batchId_fkey'
  ) THEN
    ALTER TABLE "Assignment"
      ADD CONSTRAINT "Assignment_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Assignment_status_idx" ON "Assignment"("status");
CREATE INDEX IF NOT EXISTS "AssignmentSubmission_submissionStatus_idx" ON "AssignmentSubmission"("submissionStatus");
CREATE INDEX IF NOT EXISTS "AssignmentSubmission_assignmentId_idx" ON "AssignmentSubmission"("assignmentId");

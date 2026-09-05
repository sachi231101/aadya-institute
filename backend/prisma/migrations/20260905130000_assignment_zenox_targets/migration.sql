-- AlterTable Assignment: new fields + nullable classSession
ALTER TABLE "Assignment" ALTER COLUMN "classSessionId" DROP NOT NULL;

ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "validTill" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "academicYearMasterId" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "youtubeVideoId" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "attachmentFileKey" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "attachmentFileName" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "restrictStudentUpload" BOOLEAN NOT NULL DEFAULT false;

-- Drop old cascade FK on classSession if present and recreate as SET NULL
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Assignment_classSessionId_fkey'
  ) THEN
    ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_classSessionId_fkey";
  END IF;
END $$;

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_classSessionId_fkey"
  FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Assignment_academicYearMasterId_fkey'
  ) THEN
    ALTER TABLE "Assignment"
      ADD CONSTRAINT "Assignment_academicYearMasterId_fkey"
      FOREIGN KEY ("academicYearMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Assignment_assignedAt_idx" ON "Assignment"("assignedAt");
CREATE INDEX IF NOT EXISTS "Assignment_academicYearMasterId_idx" ON "Assignment"("academicYearMasterId");
CREATE INDEX IF NOT EXISTS "Assignment_assignmentTypeMasterId_idx" ON "Assignment"("assignmentTypeMasterId");

-- CreateTable AssignmentTarget
CREATE TABLE IF NOT EXISTS "AssignmentTarget" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseModuleId" TEXT,
  "topic" TEXT,
  "batchId" TEXT NOT NULL,
  CONSTRAINT "AssignmentTarget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssignmentTarget_assignmentId_idx" ON "AssignmentTarget"("assignmentId");
CREATE INDEX IF NOT EXISTS "AssignmentTarget_batchId_idx" ON "AssignmentTarget"("batchId");
CREATE INDEX IF NOT EXISTS "AssignmentTarget_courseId_idx" ON "AssignmentTarget"("courseId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssignmentTarget_assignmentId_fkey') THEN
    ALTER TABLE "AssignmentTarget"
      ADD CONSTRAINT "AssignmentTarget_assignmentId_fkey"
      FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssignmentTarget_courseId_fkey') THEN
    ALTER TABLE "AssignmentTarget"
      ADD CONSTRAINT "AssignmentTarget_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssignmentTarget_courseModuleId_fkey') THEN
    ALTER TABLE "AssignmentTarget"
      ADD CONSTRAINT "AssignmentTarget_courseModuleId_fkey"
      FOREIGN KEY ("courseModuleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssignmentTarget_batchId_fkey') THEN
    ALTER TABLE "AssignmentTarget"
      ADD CONSTRAINT "AssignmentTarget_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable AssignmentRecipient
CREATE TABLE IF NOT EXISTS "AssignmentRecipient" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  CONSTRAINT "AssignmentRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentRecipient_assignmentId_studentId_key"
  ON "AssignmentRecipient"("assignmentId", "studentId");
CREATE INDEX IF NOT EXISTS "AssignmentRecipient_assignmentId_idx" ON "AssignmentRecipient"("assignmentId");
CREATE INDEX IF NOT EXISTS "AssignmentRecipient_studentId_idx" ON "AssignmentRecipient"("studentId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssignmentRecipient_assignmentId_fkey') THEN
    ALTER TABLE "AssignmentRecipient"
      ADD CONSTRAINT "AssignmentRecipient_assignmentId_fkey"
      FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssignmentRecipient_studentId_fkey') THEN
    ALTER TABLE "AssignmentRecipient"
      ADD CONSTRAINT "AssignmentRecipient_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill AssignmentTarget from existing assignments
INSERT INTO "AssignmentTarget" ("id", "assignmentId", "courseId", "courseModuleId", "topic", "batchId")
SELECT
  md5(random()::text || clock_timestamp()::text || a."id"),
  a."id",
  b."courseId",
  NULL,
  NULL,
  a."batchId"
FROM "Assignment" a
INNER JOIN "Batch" b ON b."id" = a."batchId"
WHERE NOT EXISTS (
  SELECT 1 FROM "AssignmentTarget" t WHERE t."assignmentId" = a."id"
);

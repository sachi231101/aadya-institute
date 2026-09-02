-- AlterTable BatchCourse: per-course schedule fields
ALTER TABLE "BatchCourse" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "BatchCourse" ADD COLUMN IF NOT EXISTS "expectedEndDate" TIMESTAMP(3);
ALTER TABLE "BatchCourse" ADD COLUMN IF NOT EXISTS "schedulePattern" TEXT;
ALTER TABLE "BatchCourse" ADD COLUMN IF NOT EXISTS "timeSlot" TEXT;
ALTER TABLE "BatchCourse" ADD COLUMN IF NOT EXISTS "timeslotMasterId" TEXT;
ALTER TABLE "BatchCourse" ADD COLUMN IF NOT EXISTS "classroomMasterId" TEXT;

-- AlterTable BatchSchedule: link to BatchCourse
ALTER TABLE "BatchSchedule" ADD COLUMN IF NOT EXISTS "batchCourseId" TEXT;

-- AlterTable ClassSession: link to BatchCourse
ALTER TABLE "ClassSession" ADD COLUMN IF NOT EXISTS "batchCourseId" TEXT;

-- Backfill BatchCourse schedule fields from parent Batch
UPDATE "BatchCourse" AS bc
SET
  "startDate" = b."startDate",
  "expectedEndDate" = b."expectedEndDate",
  "schedulePattern" = b."schedulePattern",
  "timeSlot" = b."timeSlot",
  "timeslotMasterId" = b."timeslotMasterId",
  "classroomMasterId" = b."classroomMasterId"
FROM "Batch" AS b
WHERE bc."batchId" = b.id
  AND bc."startDate" IS NULL;

-- Attach existing BatchSchedule rows to primary (sequence=1) BatchCourse when possible
UPDATE "BatchSchedule" AS bs
SET "batchCourseId" = primary_bc.id
FROM (
  SELECT DISTINCT ON ("batchId") id, "batchId"
  FROM "BatchCourse"
  ORDER BY "batchId", sequence ASC, "createdAt" ASC
) AS primary_bc
WHERE bs."batchId" = primary_bc."batchId"
  AND bs."batchCourseId" IS NULL;

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BatchCourse_timeslotMasterId_fkey'
  ) THEN
    ALTER TABLE "BatchCourse"
      ADD CONSTRAINT "BatchCourse_timeslotMasterId_fkey"
      FOREIGN KEY ("timeslotMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BatchCourse_classroomMasterId_fkey'
  ) THEN
    ALTER TABLE "BatchCourse"
      ADD CONSTRAINT "BatchCourse_classroomMasterId_fkey"
      FOREIGN KEY ("classroomMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BatchSchedule_batchCourseId_fkey'
  ) THEN
    ALTER TABLE "BatchSchedule"
      ADD CONSTRAINT "BatchSchedule_batchCourseId_fkey"
      FOREIGN KEY ("batchCourseId") REFERENCES "BatchCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClassSession_batchCourseId_fkey'
  ) THEN
    ALTER TABLE "ClassSession"
      ADD CONSTRAINT "ClassSession_batchCourseId_fkey"
      FOREIGN KEY ("batchCourseId") REFERENCES "BatchCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "BatchSchedule_batchCourseId_idx" ON "BatchSchedule"("batchCourseId");
CREATE INDEX IF NOT EXISTS "ClassSession_batchCourseId_idx" ON "ClassSession"("batchCourseId");

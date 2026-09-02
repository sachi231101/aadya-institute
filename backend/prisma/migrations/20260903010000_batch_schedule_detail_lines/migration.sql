-- AlterTable Batch: optional remark
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "remark" TEXT;

-- AlterTable BatchSchedule: Zenox detail-line fields
ALTER TABLE "BatchSchedule" ADD COLUMN IF NOT EXISTS "facultyId" TEXT;
ALTER TABLE "BatchSchedule" ADD COLUMN IF NOT EXISTS "timeslotMasterId" TEXT;
ALTER TABLE "BatchSchedule" ADD COLUMN IF NOT EXISTS "classroomMasterId" TEXT;
ALTER TABLE "BatchSchedule" ADD COLUMN IF NOT EXISTS "status" "Status" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "BatchSchedule" ADD COLUMN IF NOT EXISTS "attendanceEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Backfill from BatchCourse when linked
UPDATE "BatchSchedule" AS bs
SET
  "facultyId" = COALESCE(bs."facultyId", bc."facultyId"),
  "timeslotMasterId" = COALESCE(bs."timeslotMasterId", bc."timeslotMasterId"),
  "classroomMasterId" = COALESCE(bs."classroomMasterId", bc."classroomMasterId")
FROM "BatchCourse" AS bc
WHERE bs."batchCourseId" = bc.id;

-- Backfill remaining from Batch
UPDATE "BatchSchedule" AS bs
SET
  "facultyId" = COALESCE(bs."facultyId", b."facultyId"),
  "timeslotMasterId" = COALESCE(bs."timeslotMasterId", b."timeslotMasterId"),
  "classroomMasterId" = COALESCE(bs."classroomMasterId", b."classroomMasterId")
FROM "Batch" AS b
WHERE bs."batchId" = b.id
  AND (bs."facultyId" IS NULL OR bs."timeslotMasterId" IS NULL OR bs."classroomMasterId" IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BatchSchedule_facultyId_fkey') THEN
    ALTER TABLE "BatchSchedule"
      ADD CONSTRAINT "BatchSchedule_facultyId_fkey"
      FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BatchSchedule_timeslotMasterId_fkey') THEN
    ALTER TABLE "BatchSchedule"
      ADD CONSTRAINT "BatchSchedule_timeslotMasterId_fkey"
      FOREIGN KEY ("timeslotMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BatchSchedule_classroomMasterId_fkey') THEN
    ALTER TABLE "BatchSchedule"
      ADD CONSTRAINT "BatchSchedule_classroomMasterId_fkey"
      FOREIGN KEY ("classroomMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "BatchSchedule_facultyId_idx" ON "BatchSchedule"("facultyId");
CREATE INDEX IF NOT EXISTS "BatchSchedule_dayOfWeek_idx" ON "BatchSchedule"("dayOfWeek");

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "timeslotMasterId" TEXT;
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "classroomMasterId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Batch" ADD CONSTRAINT "Batch_timeslotMasterId_fkey" FOREIGN KEY ("timeslotMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Batch" ADD CONSTRAINT "Batch_classroomMasterId_fkey" FOREIGN KEY ("classroomMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Batch_timeslotMasterId_idx" ON "Batch"("timeslotMasterId");
CREATE INDEX IF NOT EXISTS "Batch_classroomMasterId_idx" ON "Batch"("classroomMasterId");

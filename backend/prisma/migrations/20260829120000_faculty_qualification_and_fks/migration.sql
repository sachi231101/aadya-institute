-- AlterTable
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "qualification" TEXT;
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "qualificationMasterId" TEXT;

-- AddForeignKey Faculty.qualificationMasterId
DO $$ BEGIN
  ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_qualificationMasterId_fkey"
    FOREIGN KEY ("qualificationMasterId") REFERENCES "MasterRecord"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey Assignment.facultyId
DO $$ BEGIN
  ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_facultyId_fkey"
    FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey Feedback.facultyId
DO $$ BEGIN
  ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_facultyId_fkey"
    FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

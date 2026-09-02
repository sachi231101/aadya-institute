-- CreateTable
CREATE TABLE IF NOT EXISTS "BatchCourse" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "facultyId" TEXT,
  "sequence" INTEGER NOT NULL DEFAULT 1,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BatchCourse_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BatchCourse" ADD CONSTRAINT "BatchCourse_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BatchCourse" ADD CONSTRAINT "BatchCourse_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BatchCourse" ADD CONSTRAINT "BatchCourse_facultyId_fkey"
  FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "BatchCourse_batchId_courseId_key" ON "BatchCourse"("batchId", "courseId");
CREATE INDEX IF NOT EXISTS "BatchCourse_batchId_idx" ON "BatchCourse"("batchId");
CREATE INDEX IF NOT EXISTS "BatchCourse_courseId_idx" ON "BatchCourse"("courseId");
CREATE INDEX IF NOT EXISTS "BatchCourse_facultyId_idx" ON "BatchCourse"("facultyId");

-- Backfill existing batches
INSERT INTO "BatchCourse" ("id", "batchId", "courseId", "facultyId", "sequence", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  b."id",
  b."courseId",
  b."facultyId",
  1,
  'ACTIVE',
  NOW(),
  NOW()
FROM "Batch" b
WHERE NOT EXISTS (
  SELECT 1 FROM "BatchCourse" bc WHERE bc."batchId" = b."id" AND bc."courseId" = b."courseId"
);

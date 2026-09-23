-- CreateTable
CREATE TABLE "CourseBranch" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseBranch_branchId_idx" ON "CourseBranch"("branchId");

-- CreateIndex
CREATE INDEX "CourseBranch_courseId_idx" ON "CourseBranch"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseBranch_courseId_branchId_key" ON "CourseBranch"("courseId", "branchId");

-- AddForeignKey
ALTER TABLE "CourseBranch" ADD CONSTRAINT "CourseBranch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBranch" ADD CONSTRAINT "CourseBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: link every existing course to all ACTIVE branches in its institute
INSERT INTO "CourseBranch" ("id", "courseId", "branchId", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || c.id || b.id)::text,
  c.id,
  b.id,
  CURRENT_TIMESTAMP
FROM "Course" c
INNER JOIN "Branch" b ON b."instituteId" = c."instituteId" AND b."status" = 'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM "CourseBranch" cb
  WHERE cb."courseId" = c.id AND cb."branchId" = b.id
);

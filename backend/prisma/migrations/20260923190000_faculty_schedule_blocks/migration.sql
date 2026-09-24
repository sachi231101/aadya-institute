-- CreateEnum
CREATE TYPE "FacultyScheduleBlockType" AS ENUM ('BREAK', 'LUNCH');

-- CreateTable
CREATE TABLE "FacultyScheduleBlock" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timeslotMasterId" TEXT,
    "blockType" "FacultyScheduleBlockType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacultyScheduleBlock_instituteId_idx" ON "FacultyScheduleBlock"("instituteId");

-- CreateIndex
CREATE INDEX "FacultyScheduleBlock_branchId_idx" ON "FacultyScheduleBlock"("branchId");

-- CreateIndex
CREATE INDEX "FacultyScheduleBlock_instituteId_branchId_idx" ON "FacultyScheduleBlock"("instituteId", "branchId");

-- CreateIndex
CREATE INDEX "FacultyScheduleBlock_facultyId_scheduledDate_idx" ON "FacultyScheduleBlock"("facultyId", "scheduledDate");

-- CreateIndex
CREATE INDEX "FacultyScheduleBlock_scheduledDate_idx" ON "FacultyScheduleBlock"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyScheduleBlock_facultyId_scheduledDate_startTime_key" ON "FacultyScheduleBlock"("facultyId", "scheduledDate", "startTime");

-- AddForeignKey
ALTER TABLE "FacultyScheduleBlock" ADD CONSTRAINT "FacultyScheduleBlock_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyScheduleBlock" ADD CONSTRAINT "FacultyScheduleBlock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyScheduleBlock" ADD CONSTRAINT "FacultyScheduleBlock_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyScheduleBlock" ADD CONSTRAINT "FacultyScheduleBlock_timeslotMasterId_fkey" FOREIGN KEY ("timeslotMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "FacultyDailyAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'WEEKLY_OFF');

-- CreateTable
CREATE TABLE "FacultyDailyAttendance" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "FacultyDailyAttendanceStatus" NOT NULL,
    "inTime" TEXT,
    "outTime" TEXT,
    "comments" TEXT,
    "markedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyDailyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacultyDailyAttendance_date_idx" ON "FacultyDailyAttendance"("date");

-- CreateIndex
CREATE INDEX "FacultyDailyAttendance_facultyId_date_idx" ON "FacultyDailyAttendance"("facultyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyDailyAttendance_facultyId_date_key" ON "FacultyDailyAttendance"("facultyId", "date");

-- AddForeignKey
ALTER TABLE "FacultyDailyAttendance" ADD CONSTRAINT "FacultyDailyAttendance_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
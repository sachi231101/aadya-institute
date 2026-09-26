-- CreateEnum
CREATE TYPE "FacultyAttendancePunchType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "FacultyAttendancePunchSource" AS ENUM ('MANUAL', 'AUTO_GEOFENCE');

-- CreateTable
CREATE TABLE "FacultyAttendancePunch" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "FacultyAttendancePunchType" NOT NULL,
    "punchedAt" TIMESTAMP(3) NOT NULL,
    "timeHmm" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" "FacultyAttendancePunchSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultyAttendancePunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacultyAttendancePunch_facultyId_date_idx" ON "FacultyAttendancePunch"("facultyId", "date");

-- CreateIndex
CREATE INDEX "FacultyAttendancePunch_facultyId_punchedAt_idx" ON "FacultyAttendancePunch"("facultyId", "punchedAt");

-- AddForeignKey
ALTER TABLE "FacultyAttendancePunch" ADD CONSTRAINT "FacultyAttendancePunch_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

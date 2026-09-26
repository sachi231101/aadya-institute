-- Allow faculty hard-delete to nullify ClassSession.facultyId (preserve sessions + student attendance).
ALTER TABLE "ClassSession" DROP CONSTRAINT IF EXISTS "ClassSession_facultyId_fkey";

ALTER TABLE "ClassSession" ALTER COLUMN "facultyId" DROP NOT NULL;

ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_facultyId_fkey"
  FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop Enquiry module and Application.enquiryId; add ApplicationActivity

-- 1. Drop Application.enquiryId FK and column
ALTER TABLE "Application" DROP CONSTRAINT IF EXISTS "Application_enquiryId_fkey";
DROP INDEX IF EXISTS "Application_enquiryId_idx";
ALTER TABLE "Application" DROP COLUMN IF EXISTS "enquiryId";

-- 2. Drop Enquiry table
DROP TABLE IF EXISTS "Enquiry";

-- 3. Drop Enquiry enums (if no longer referenced)
DROP TYPE IF EXISTS "EnquiryStatus";
DROP TYPE IF EXISTS "EnquirySource";

-- 4. ApplicationActivity enum + table
CREATE TYPE "ApplicationActivityType" AS ENUM ('NOTE_ADDED', 'STATUS_CHANGED', 'FEE_STATUS_CHANGED', 'CREATED');

CREATE TABLE "ApplicationActivity" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "ApplicationActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationActivity_applicationId_idx" ON "ApplicationActivity"("applicationId");
CREATE INDEX "ApplicationActivity_type_idx" ON "ApplicationActivity"("type");
CREATE INDEX "ApplicationActivity_createdAt_idx" ON "ApplicationActivity"("createdAt");

ALTER TABLE "ApplicationActivity" ADD CONSTRAINT "ApplicationActivity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationActivity" ADD CONSTRAINT "ApplicationActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

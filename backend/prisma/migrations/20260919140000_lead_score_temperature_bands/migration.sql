-- AI Lead Scoring: temperature, score reason, configurable bands

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "leadTemperature" TEXT;

-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN "scoreReason" TEXT;

-- AlterTable
ALTER TABLE "InstituteAiCallingConfig" ADD COLUMN "scoreTemperatureBands" JSONB;

-- CreateIndex
CREATE INDEX "Lead_instituteId_leadTemperature_idx" ON "Lead"("instituteId", "leadTemperature");

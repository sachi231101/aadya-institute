-- Lead AI Calling: agent_variables dial context + structured extraction

-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN "extractedFields" JSONB;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "leadIntent" TEXT;
ALTER TABLE "Lead" ADD COLUMN "aiCollectedFields" JSONB;

-- AlterTable
ALTER TABLE "InstituteAiCallingConfig" ADD COLUMN "agentVariableMap" JSONB;

-- CreateIndex
CREATE INDEX "Lead_instituteId_leadIntent_idx" ON "Lead"("instituteId", "leadIntent");

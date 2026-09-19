-- Auto-assign counsellor only when AI leadScore >= threshold (default 50)

-- AlterTable
ALTER TABLE "InstituteAiCallingConfig" ADD COLUMN "minScoreToAutoAssign" INTEGER;

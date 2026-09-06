-- CreateEnum
CREATE TYPE "AnswerGradingStatus" AS ENUM ('AUTO', 'PENDING_MANUAL', 'MANUALLY_GRADED');

-- AlterTable Question
ALTER TABLE "Question" ADD COLUMN "correctAnswer" TEXT;

-- AlterTable ExamAnswer
ALTER TABLE "ExamAnswer" ADD COLUMN "gradingStatus" "AnswerGradingStatus",
ADD COLUMN "gradedById" TEXT,
ADD COLUMN "gradedAt" TIMESTAMP(3),
ADD COLUMN "graderComment" TEXT;

-- CreateIndex
CREATE INDEX "ExamAnswer_gradingStatus_idx" ON "ExamAnswer"("gradingStatus");

-- CreateIndex
CREATE INDEX "ExamAnswer_gradedById_idx" ON "ExamAnswer"("gradedById");

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

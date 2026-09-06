-- AlterTable
ALTER TABLE "ExamAttempt" ADD COLUMN "countsTowardLimit" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ExamAttempt" ADD COLUMN "retryGrantedAt" TIMESTAMP(3);
ALTER TABLE "ExamAttempt" ADD COLUMN "retryGrantedById" TEXT;
ALTER TABLE "ExamAttempt" ADD COLUMN "retryGrantReason" TEXT;

-- CreateIndex
CREATE INDEX "ExamAttempt_examId_studentId_countsTowardLimit_idx" ON "ExamAttempt"("examId", "studentId", "countsTowardLimit");

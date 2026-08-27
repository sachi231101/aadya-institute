-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATING', 'COMPLETED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProctoringEventType" AS ENUM ('TAB_SWITCH', 'WINDOW_BLUR', 'VISIBILITY_HIDDEN', 'FULLSCREEN_EXIT', 'KEYBOARD_SHORTCUT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'RIGHT_CLICK', 'DEVTOOLS_ATTEMPT', 'NETWORK_DISCONNECT', 'SESSION_CONFLICT', 'SUSPICIOUS_BROWSER_EVENT');

-- AlterTable Exam
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "tabSwitchDetection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "windowBlurDetection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "fullscreenExitDetection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "keyboardShortcutDetection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "copyPasteDetection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "rightClickDetection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "networkGracePeriodSeconds" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "autoTerminateOnMaxViolations" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable ExamAttempt
CREATE TABLE IF NOT EXISTS "ExamAttempt" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "proctoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "maxViolations" INTEGER NOT NULL DEFAULT 3,
    "lastProctoringEventAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "totalMarks" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExamAnswer
CREATE TABLE IF NOT EXISTS "ExamAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionIds" JSONB,
    "textAnswer" TEXT,
    "numericalAnswer" DOUBLE PRECISION,
    "isCorrect" BOOLEAN,
    "marksAwarded" DOUBLE PRECISION DEFAULT 0,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExamProctoringEvent
CREATE TABLE IF NOT EXISTS "ExamProctoringEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "eventType" "ProctoringEventType" NOT NULL,
    "clientEventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "isCountedViolation" BOOLEAN NOT NULL DEFAULT true,
    "warningNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "ExamAttempt_examId_studentId_attemptNumber_key" ON "ExamAttempt"("examId", "studentId", "attemptNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamAnswer_attemptId_questionId_key" ON "ExamAnswer"("attemptId", "questionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamProctoringEvent_attemptId_clientEventId_key" ON "ExamProctoringEvent"("attemptId", "clientEventId");

-- Indexes
CREATE INDEX IF NOT EXISTS "ExamAttempt_instituteId_idx" ON "ExamAttempt"("instituteId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_branchId_idx" ON "ExamAttempt"("branchId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_examId_idx" ON "ExamAttempt"("examId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_studentId_idx" ON "ExamAttempt"("studentId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_userId_idx" ON "ExamAttempt"("userId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_status_idx" ON "ExamAttempt"("status");
CREATE INDEX IF NOT EXISTS "ExamAttempt_startedAt_idx" ON "ExamAttempt"("startedAt");

CREATE INDEX IF NOT EXISTS "ExamAnswer_attemptId_idx" ON "ExamAnswer"("attemptId");
CREATE INDEX IF NOT EXISTS "ExamAnswer_questionId_idx" ON "ExamAnswer"("questionId");

CREATE INDEX IF NOT EXISTS "ExamProctoringEvent_attemptId_idx" ON "ExamProctoringEvent"("attemptId");
CREATE INDEX IF NOT EXISTS "ExamProctoringEvent_instituteId_idx" ON "ExamProctoringEvent"("instituteId");
CREATE INDEX IF NOT EXISTS "ExamProctoringEvent_eventType_idx" ON "ExamProctoringEvent"("eventType");
CREATE INDEX IF NOT EXISTS "ExamProctoringEvent_occurredAt_idx" ON "ExamProctoringEvent"("occurredAt");

-- Foreign Keys
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamProctoringEvent" ADD CONSTRAINT "ExamProctoringEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamProctoringEvent" ADD CONSTRAINT "ExamProctoringEvent_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

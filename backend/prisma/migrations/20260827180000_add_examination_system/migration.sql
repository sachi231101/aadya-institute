-- Examination Management System Migration
-- Created: 2026-08-27
-- This migration adds the examination management tables ONLY (additive, no data loss)

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'LIVE', 'ENDED', 'COMPLETED', 'ARCHIVED', 'CANCELLED');
CREATE TYPE "ExamType" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "QuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER', 'NUMERICAL', 'FILL_BLANK');
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "QuestionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- ─── QuestionBank ────────────────────────────────────────────────────────────

CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "courseId" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionBank_instituteId_name_key" ON "QuestionBank"("instituteId", "name");
CREATE INDEX "QuestionBank_instituteId_idx" ON "QuestionBank"("instituteId");
CREATE INDEX "QuestionBank_branchId_idx" ON "QuestionBank"("branchId");
CREATE INDEX "QuestionBank_courseId_idx" ON "QuestionBank"("courseId");
CREATE INDEX "QuestionBank_status_idx" ON "QuestionBank"("status");

ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Question ─────────────────────────────────────────────────────────────────

CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "questionBankId" TEXT,
    "courseId" TEXT,
    "moduleId" TEXT,
    "questionType" "QuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "negativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "explanation" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Question_instituteId_idx" ON "Question"("instituteId");
CREATE INDEX "Question_branchId_idx" ON "Question"("branchId");
CREATE INDEX "Question_questionBankId_idx" ON "Question"("questionBankId");
CREATE INDEX "Question_courseId_idx" ON "Question"("courseId");
CREATE INDEX "Question_moduleId_idx" ON "Question"("moduleId");
CREATE INDEX "Question_questionType_idx" ON "Question"("questionType");
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");
CREATE INDEX "Question_status_idx" ON "Question"("status");

ALTER TABLE "Question" ADD CONSTRAINT "Question_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── QuestionOption ──────────────────────────────────────────────────────────

CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Exam ─────────────────────────────────────────────────────────────────────

CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "courseId" TEXT,
    "moduleId" TEXT,
    "createdById" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passingMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 1,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "examType" "ExamType" NOT NULL DEFAULT 'ONLINE',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "negativeMarkingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "showResults" BOOLEAN NOT NULL DEFAULT true,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "randomizeOptions" BOOLEAN NOT NULL DEFAULT false,
    "proctoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fullscreenRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxWarnings" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Exam_instituteId_idx" ON "Exam"("instituteId");
CREATE INDEX "Exam_branchId_idx" ON "Exam"("branchId");
CREATE INDEX "Exam_courseId_idx" ON "Exam"("courseId");
CREATE INDEX "Exam_moduleId_idx" ON "Exam"("moduleId");
CREATE INDEX "Exam_status_idx" ON "Exam"("status");
CREATE INDEX "Exam_examType_idx" ON "Exam"("examType");
CREATE INDEX "Exam_createdById_idx" ON "Exam"("createdById");
CREATE INDEX "Exam_startAt_idx" ON "Exam"("startAt");
CREATE INDEX "Exam_instituteId_status_idx" ON "Exam"("instituteId", "status");

ALTER TABLE "Exam" ADD CONSTRAINT "Exam_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ExamQuestion ─────────────────────────────────────────────────────────────

CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "marksOverride" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamQuestion_examId_questionId_key" ON "ExamQuestion"("examId", "questionId");
CREATE INDEX "ExamQuestion_examId_idx" ON "ExamQuestion"("examId");
CREATE INDEX "ExamQuestion_questionId_idx" ON "ExamQuestion"("questionId");

ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ExamBatch ────────────────────────────────────────────────────────────────

CREATE TABLE "ExamBatch" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamBatch_examId_batchId_key" ON "ExamBatch"("examId", "batchId");
CREATE INDEX "ExamBatch_examId_idx" ON "ExamBatch"("examId");
CREATE INDEX "ExamBatch_batchId_idx" ON "ExamBatch"("batchId");

ALTER TABLE "ExamBatch" ADD CONSTRAINT "ExamBatch_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamBatch" ADD CONSTRAINT "ExamBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

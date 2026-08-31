-- CreateTable
CREATE TABLE "ExamStudent" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamStudent_examId_idx" ON "ExamStudent"("examId");

-- CreateIndex
CREATE INDEX "ExamStudent_studentId_idx" ON "ExamStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamStudent_examId_studentId_key" ON "ExamStudent"("examId", "studentId");

-- AddForeignKey
ALTER TABLE "ExamStudent" ADD CONSTRAINT "ExamStudent_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStudent" ADD CONSTRAINT "ExamStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

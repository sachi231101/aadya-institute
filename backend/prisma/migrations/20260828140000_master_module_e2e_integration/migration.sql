-- Master module end-to-end integration: add master FK columns and migrate enums to strings

-- Lead: enum -> string + master FKs
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "sourceMasterId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "stageMasterId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "leadTypeMasterId" TEXT;

ALTER TABLE "Lead" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "source" TYPE TEXT USING "source"::TEXT;
ALTER TABLE "Lead" ALTER COLUMN "source" SET DEFAULT 'WALK_IN';

ALTER TABLE "Lead" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "stage" TYPE TEXT USING "stage"::TEXT;
ALTER TABLE "Lead" ALTER COLUMN "stage" SET DEFAULT 'ASSIGNED';

-- LeadStageHistory
ALTER TABLE "LeadStageHistory" ALTER COLUMN "fromStage" TYPE TEXT USING "fromStage"::TEXT;
ALTER TABLE "LeadStageHistory" ALTER COLUMN "toStage" TYPE TEXT USING "toStage"::TEXT;

-- Enquiry source
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "sourceMasterId" TEXT;
ALTER TABLE "Enquiry" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Enquiry" ALTER COLUMN "source" TYPE TEXT USING "source"::TEXT;
ALTER TABLE "Enquiry" ALTER COLUMN "source" SET DEFAULT 'WEBSITE';

-- Admission status + concession
ALTER TABLE "Admission" ADD COLUMN IF NOT EXISTS "statusMasterId" TEXT;
ALTER TABLE "Admission" ADD COLUMN IF NOT EXISTS "concessionHeadMasterId" TEXT;
ALTER TABLE "Admission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Admission" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "Admission" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- Student masters
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "qualificationMasterId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "areaMasterId" TEXT;

-- Faculty designation
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "designationMasterId" TEXT;

-- ClassSession masters
ALTER TABLE "ClassSession" ADD COLUMN IF NOT EXISTS "classroomMasterId" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN IF NOT EXISTS "timeslotMasterId" TEXT;

-- Assignment type
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "assignmentTypeMasterId" TEXT;

-- Payment masters
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentModeMasterId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "bankAccountMasterId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feeHeadMasterId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feeHead" TEXT;
ALTER TABLE "Payment" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "method" TYPE TEXT USING "method"::TEXT;
ALTER TABLE "Payment" ALTER COLUMN "method" SET DEFAULT 'UPI';

-- PendingFee fee head
ALTER TABLE "PendingFee" ADD COLUMN IF NOT EXISTS "feeHeadMasterId" TEXT;
ALTER TABLE "PendingFee" ADD COLUMN IF NOT EXISTS "feeHead" TEXT;

-- Exam term
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "examTermMasterId" TEXT;

-- UserSettings designation master
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "designationMasterId" TEXT;

-- Foreign keys to MasterRecord
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourceMasterId_fkey" FOREIGN KEY ("sourceMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageMasterId_fkey" FOREIGN KEY ("stageMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_leadTypeMasterId_fkey" FOREIGN KEY ("leadTypeMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_sourceMasterId_fkey" FOREIGN KEY ("sourceMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Admission" ADD CONSTRAINT "Admission_statusMasterId_fkey" FOREIGN KEY ("statusMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_concessionHeadMasterId_fkey" FOREIGN KEY ("concessionHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Student" ADD CONSTRAINT "Student_qualificationMasterId_fkey" FOREIGN KEY ("qualificationMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_areaMasterId_fkey" FOREIGN KEY ("areaMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_designationMasterId_fkey" FOREIGN KEY ("designationMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_classroomMasterId_fkey" FOREIGN KEY ("classroomMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_timeslotMasterId_fkey" FOREIGN KEY ("timeslotMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignmentTypeMasterId_fkey" FOREIGN KEY ("assignmentTypeMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentModeMasterId_fkey" FOREIGN KEY ("paymentModeMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bankAccountMasterId_fkey" FOREIGN KEY ("bankAccountMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_feeHeadMasterId_fkey" FOREIGN KEY ("feeHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PendingFee" ADD CONSTRAINT "PendingFee_feeHeadMasterId_fkey" FOREIGN KEY ("feeHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examTermMasterId_fkey" FOREIGN KEY ("examTermMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_designationMasterId_fkey" FOREIGN KEY ("designationMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for master FK lookups
CREATE INDEX IF NOT EXISTS "Lead_sourceMasterId_idx" ON "Lead"("sourceMasterId");
CREATE INDEX IF NOT EXISTS "Lead_stageMasterId_idx" ON "Lead"("stageMasterId");
CREATE INDEX IF NOT EXISTS "ClassSession_classroomMasterId_idx" ON "ClassSession"("classroomMasterId");
CREATE INDEX IF NOT EXISTS "Payment_paymentModeMasterId_idx" ON "Payment"("paymentModeMasterId");

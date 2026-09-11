-- Master module end-to-end integration: add master FK columns and migrate enums to strings
--
-- NOTE: Lead / MasterRecord / Payment / PendingFee / UserSettings / LeadStageHistory were
-- historically created via db push and never had CREATE TABLE migrations. Shadow-database
-- replay requires these stubs so later ALTER migrations can apply cleanly.

-- ─── Bootstrap missing enums (idempotent) ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'LOST', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeadLostReason" AS ENUM (
    'PRICE_HIGH', 'NOT_INTERESTED', 'JOINED_COMPETITOR', 'NO_RESPONSE',
    'COURSE_NOT_AVAILABLE', 'LOCATION_ISSUE', 'TIMING_ISSUE', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeadActivityType" AS ENUM (
    'LEAD_CREATED', 'LEAD_ASSIGNED', 'STAGE_CHANGED', 'NOTE_ADDED',
    'FOLLOW_UP_CREATED', 'FOLLOW_UP_COMPLETED', 'FOLLOW_UP_MISSED',
    'CALL_COMPLETED', 'WHATSAPP_SENT', 'CONVERTED', 'MARKED_LOST'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'WHATSAPP', 'MEETING', 'REMINDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'NET_BANKING', 'CARD', 'CASH', 'CHEQUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OverdueStatus" AS ENUM ('OVERDUE', 'DUE_SOON', 'PARTIAL', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Bootstrap missing tables (idempotent) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "MasterRecord" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "branchId" TEXT,
  "entityType" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "email" TEXT,
  "interestedIn" TEXT NOT NULL DEFAULT '',
  "courseId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'WALK_IN',
  "stage" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "status" "LeadStatus" NOT NULL DEFAULT 'ACTIVE',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "assignedCounsellorId" TEXT,
  "lastContactedAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "convertedStudentId" TEXT,
  "convertedAdmissionId" TEXT,
  "lostAt" TIMESTAMP(3),
  "lostReason" "LeadLostReason",
  "lostNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadStageHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "fromStage" TEXT,
  "toStage" TEXT NOT NULL,
  "changedById" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadStageHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadAssignment" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "counsellorId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unassignedAt" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "LeadActivityType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadFollowUp" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "counsellorId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "type" "FollowUpType" NOT NULL DEFAULT 'CALL',
  "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "outcome" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "receiptNo" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "branchId" TEXT,
  "studentId" TEXT,
  "admissionId" TEXT,
  "pendingFeeId" TEXT,
  "studentName" TEXT NOT NULL,
  "admissionNo" TEXT NOT NULL,
  "courseName" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" "PaymentMethod" NOT NULL DEFAULT 'UPI',
  "transactionRef" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
  "notes" TEXT,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PendingFee" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "branchId" TEXT,
  "studentId" TEXT,
  "admissionId" TEXT,
  "studentName" TEXT NOT NULL,
  "admissionNo" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "courseName" TEXT NOT NULL,
  "totalFee" DOUBLE PRECISION NOT NULL,
  "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dueAmount" DOUBLE PRECISION NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "installmentNo" INTEGER NOT NULL DEFAULT 1,
  "overdueDays" INTEGER NOT NULL DEFAULT 0,
  "status" "OverdueStatus" NOT NULL DEFAULT 'DUE_SOON',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingFee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "designation" TEXT DEFAULT '',
  "department" TEXT DEFAULT '',
  "language" TEXT DEFAULT 'English (US)',
  "timezone" TEXT DEFAULT '(GMT+05:30) India Standard Time',
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailAdmissions" BOOLEAN NOT NULL DEFAULT true,
  "emailFeeAlerts" BOOLEAN NOT NULL DEFAULT true,
  "emailAttendance" BOOLEAN NOT NULL DEFAULT false,
  "whatsappReminders" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CallLog.leadId was historically added outside migrations
ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

-- Unique constraints that later migrations / app expect (ignore if present)
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receiptNo_key" UNIQUE ("receiptNo");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_key" UNIQUE ("userId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "MasterRecord" ADD CONSTRAINT "MasterRecord_instituteId_entityType_name_key" UNIQUE ("instituteId", "entityType", "name");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- Foreign keys to MasterRecord (idempotent — partial applies may already have some FKs)
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourceMasterId_fkey" FOREIGN KEY ("sourceMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageMasterId_fkey" FOREIGN KEY ("stageMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_leadTypeMasterId_fkey" FOREIGN KEY ("leadTypeMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_sourceMasterId_fkey" FOREIGN KEY ("sourceMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Admission" ADD CONSTRAINT "Admission_statusMasterId_fkey" FOREIGN KEY ("statusMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Admission" ADD CONSTRAINT "Admission_concessionHeadMasterId_fkey" FOREIGN KEY ("concessionHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Student" ADD CONSTRAINT "Student_qualificationMasterId_fkey" FOREIGN KEY ("qualificationMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Student" ADD CONSTRAINT "Student_areaMasterId_fkey" FOREIGN KEY ("areaMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_designationMasterId_fkey" FOREIGN KEY ("designationMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_classroomMasterId_fkey" FOREIGN KEY ("classroomMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_timeslotMasterId_fkey" FOREIGN KEY ("timeslotMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assignmentTypeMasterId_fkey" FOREIGN KEY ("assignmentTypeMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentModeMasterId_fkey" FOREIGN KEY ("paymentModeMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bankAccountMasterId_fkey" FOREIGN KEY ("bankAccountMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_feeHeadMasterId_fkey" FOREIGN KEY ("feeHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PendingFee" ADD CONSTRAINT "PendingFee_feeHeadMasterId_fkey" FOREIGN KEY ("feeHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examTermMasterId_fkey" FOREIGN KEY ("examTermMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_designationMasterId_fkey" FOREIGN KEY ("designationMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for master FK lookups
CREATE INDEX IF NOT EXISTS "Lead_sourceMasterId_idx" ON "Lead"("sourceMasterId");
CREATE INDEX IF NOT EXISTS "Lead_stageMasterId_idx" ON "Lead"("stageMasterId");
CREATE INDEX IF NOT EXISTS "ClassSession_classroomMasterId_idx" ON "ClassSession"("classroomMasterId");
CREATE INDEX IF NOT EXISTS "Payment_paymentModeMasterId_idx" ON "Payment"("paymentModeMasterId");

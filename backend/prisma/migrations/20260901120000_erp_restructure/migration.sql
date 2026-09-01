-- ERP Restructure: Documents, Fee Plans, Placement, Email, Billing

-- CreateEnum
CREATE TYPE "DocumentEntity" AS ENUM ('STUDENT', 'ADMISSION', 'LEAD');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED');
CREATE TYPE "PlacementApplicationStatus" AS ENUM ('APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "PlacementInterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "PlacementRecordStatus" AS ENUM ('OFFERED', 'JOINED', 'DECLINED');
CREATE TYPE "EmailTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "EmailLogStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "entityType" "DocumentEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeePlanTemplate" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "courseId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "planType" "FeePlan" NOT NULL DEFAULT 'FULL_PAYMENT',
    "installments" JSONB,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePlanTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementCompany" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementJob" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "salaryRange" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "eligibility" JSONB,
    "deadline" TIMESTAMP(3),
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementApplication" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "jobId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "PlacementApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementInterview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "mode" TEXT,
    "location" TEXT,
    "interviewer" TEXT,
    "status" "PlacementInterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "feedback" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementInterview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlacementRecord" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "studentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT,
    "applicationId" TEXT,
    "package" TEXT,
    "joiningDate" TIMESTAMP(3),
    "status" "PlacementRecordStatus" NOT NULL DEFAULT 'OFFERED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "status" "EmailTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "templateId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "billingPlanId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_instituteId_idx" ON "Document"("instituteId");
CREATE INDEX "Document_branchId_idx" ON "Document"("branchId");
CREATE INDEX "Document_entityType_entityId_idx" ON "Document"("entityType", "entityId");
CREATE INDEX "Document_status_idx" ON "Document"("status");

CREATE INDEX "FeePlanTemplate_instituteId_idx" ON "FeePlanTemplate"("instituteId");
CREATE INDEX "FeePlanTemplate_branchId_idx" ON "FeePlanTemplate"("branchId");
CREATE INDEX "FeePlanTemplate_courseId_idx" ON "FeePlanTemplate"("courseId");
CREATE INDEX "FeePlanTemplate_status_idx" ON "FeePlanTemplate"("status");

CREATE INDEX "PlacementCompany_instituteId_idx" ON "PlacementCompany"("instituteId");
CREATE INDEX "PlacementCompany_status_idx" ON "PlacementCompany"("status");

CREATE INDEX "PlacementJob_instituteId_idx" ON "PlacementJob"("instituteId");
CREATE INDEX "PlacementJob_companyId_idx" ON "PlacementJob"("companyId");
CREATE INDEX "PlacementJob_status_idx" ON "PlacementJob"("status");

CREATE UNIQUE INDEX "PlacementApplication_jobId_studentId_key" ON "PlacementApplication"("jobId", "studentId");
CREATE INDEX "PlacementApplication_instituteId_idx" ON "PlacementApplication"("instituteId");
CREATE INDEX "PlacementApplication_branchId_idx" ON "PlacementApplication"("branchId");
CREATE INDEX "PlacementApplication_jobId_idx" ON "PlacementApplication"("jobId");
CREATE INDEX "PlacementApplication_studentId_idx" ON "PlacementApplication"("studentId");
CREATE INDEX "PlacementApplication_status_idx" ON "PlacementApplication"("status");

CREATE INDEX "PlacementInterview_applicationId_idx" ON "PlacementInterview"("applicationId");
CREATE INDEX "PlacementInterview_scheduledAt_idx" ON "PlacementInterview"("scheduledAt");
CREATE INDEX "PlacementInterview_status_idx" ON "PlacementInterview"("status");

CREATE INDEX "PlacementRecord_instituteId_idx" ON "PlacementRecord"("instituteId");
CREATE INDEX "PlacementRecord_branchId_idx" ON "PlacementRecord"("branchId");
CREATE INDEX "PlacementRecord_studentId_idx" ON "PlacementRecord"("studentId");
CREATE INDEX "PlacementRecord_companyId_idx" ON "PlacementRecord"("companyId");
CREATE INDEX "PlacementRecord_status_idx" ON "PlacementRecord"("status");

CREATE UNIQUE INDEX "EmailTemplate_instituteId_name_key" ON "EmailTemplate"("instituteId", "name");
CREATE INDEX "EmailTemplate_instituteId_idx" ON "EmailTemplate"("instituteId");
CREATE INDEX "EmailTemplate_status_idx" ON "EmailTemplate"("status");

CREATE INDEX "EmailLog_instituteId_idx" ON "EmailLog"("instituteId");
CREATE INDEX "EmailLog_templateId_idx" ON "EmailLog"("templateId");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

CREATE UNIQUE INDEX "BillingPlan_code_key" ON "BillingPlan"("code");
CREATE INDEX "BillingPlan_status_idx" ON "BillingPlan"("status");

CREATE INDEX "Subscription_instituteId_idx" ON "Subscription"("instituteId");
CREATE INDEX "Subscription_billingPlanId_idx" ON "Subscription"("billingPlanId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX "Invoice_instituteId_idx" ON "Invoice"("instituteId");
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FeePlanTemplate" ADD CONSTRAINT "FeePlanTemplate_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeePlanTemplate" ADD CONSTRAINT "FeePlanTemplate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeePlanTemplate" ADD CONSTRAINT "FeePlanTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlacementCompany" ADD CONSTRAINT "PlacementCompany_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlacementJob" ADD CONSTRAINT "PlacementJob_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementJob" ADD CONSTRAINT "PlacementJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PlacementCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlacementApplication" ADD CONSTRAINT "PlacementApplication_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementApplication" ADD CONSTRAINT "PlacementApplication_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlacementApplication" ADD CONSTRAINT "PlacementApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PlacementJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementApplication" ADD CONSTRAINT "PlacementApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlacementInterview" ADD CONSTRAINT "PlacementInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PlacementApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PlacementCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlacementRecord" ADD CONSTRAINT "PlacementRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PlacementJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_billingPlanId_fkey" FOREIGN KEY ("billingPlanId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('WEBSITE', 'WHATSAPP', 'WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ADMITTED');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PAID', 'PENDING');

-- CreateEnum
CREATE TYPE "FeePlan" AS ENUM ('FULL_PAYMENT', 'INSTALLMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdmissionStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "AdmissionStatus" ADD VALUE 'PROVISIONAL';

-- DropForeignKey
ALTER TABLE "Admission" DROP CONSTRAINT "Admission_studentId_fkey";

-- DropIndex
DROP INDEX "Admission_instituteId_branchId_idx";

-- AlterTable
ALTER TABLE "Admission" ADD COLUMN     "admissionNo" TEXT,
ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "feePlan" "FeePlan" NOT NULL DEFAULT 'INSTALLMENT',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "studentName" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 35,
ADD COLUMN     "schedulePattern" TEXT DEFAULT 'MWF',
ADD COLUMN     "timeSlot" TEXT DEFAULT '10:00 AM - 12:00 PM';

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "mode" TEXT DEFAULT 'OFFLINE',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "roomNo" TEXT,
ADD COLUMN     "sessionStatus" TEXT DEFAULT 'UPCOMING',
ADD COLUMN     "title" TEXT DEFAULT 'Class Session';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "category" TEXT DEFAULT 'Web Development',
ADD COLUMN     "level" TEXT DEFAULT 'BEGINNER',
ADD COLUMN     "mode" TEXT DEFAULT 'HYBRID',
ADD COLUMN     "totalHours" INTEGER DEFAULT 100;

-- AlterTable
ALTER TABLE "CourseModule" ADD COLUMN     "code" TEXT,
ADD COLUMN     "topics" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "enquiryNo" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "source" "EnquirySource" NOT NULL DEFAULT 'WEBSITE',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "counselorNotes" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "applicationNo" TEXT NOT NULL,
    "enquiryId" TEXT,
    "applicantName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "feeStatus" "FeeStatus" NOT NULL DEFAULT 'PENDING',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "providerTemplateName" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "variables" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "userId" TEXT,
    "studentId" TEXT,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationIdempotency" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Enquiry_instituteId_idx" ON "Enquiry"("instituteId");

-- CreateIndex
CREATE INDEX "Enquiry_branchId_idx" ON "Enquiry"("branchId");

-- CreateIndex
CREATE INDEX "Enquiry_courseId_idx" ON "Enquiry"("courseId");

-- CreateIndex
CREATE INDEX "Enquiry_assignedToId_idx" ON "Enquiry"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicationNo_key" ON "Application"("applicationNo");

-- CreateIndex
CREATE INDEX "Application_instituteId_idx" ON "Application"("instituteId");

-- CreateIndex
CREATE INDEX "Application_branchId_idx" ON "Application"("branchId");

-- CreateIndex
CREATE INDEX "Application_courseId_idx" ON "Application"("courseId");

-- CreateIndex
CREATE INDEX "Application_enquiryId_idx" ON "Application"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE INDEX "NotificationTemplate_event_idx" ON "NotificationTemplate"("event");

-- CreateIndex
CREATE INDEX "NotificationTemplate_status_idx" ON "NotificationTemplate"("status");

-- CreateIndex
CREATE INDEX "NotificationRule_event_idx" ON "NotificationRule"("event");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRule_event_channel_key" ON "NotificationRule"("event", "channel");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_studentId_idx" ON "Notification"("studentId");

-- CreateIndex
CREATE INDEX "Notification_event_idx" ON "Notification"("event");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_instituteId_idx" ON "Notification"("instituteId");

-- CreateIndex
CREATE INDEX "Notification_scheduledAt_idx" ON "Notification"("scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_providerMessageId_idx" ON "Notification"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationIdempotency_key_key" ON "NotificationIdempotency"("key");

-- CreateIndex
CREATE INDEX "NotificationIdempotency_key_idx" ON "NotificationIdempotency"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_admissionNo_key" ON "Admission"("admissionNo");

-- CreateIndex
CREATE INDEX "Admission_applicationId_idx" ON "Admission"("applicationId");

-- CreateIndex
CREATE INDEX "Admission_batchId_idx" ON "Admission"("batchId");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

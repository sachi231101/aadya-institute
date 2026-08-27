-- CreateEnum
CREATE TYPE "TargetPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TargetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'LOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TargetMetric" AS ENUM ('LEADS_CREATED', 'LEADS_CONTACTED', 'FOLLOW_UPS', 'QUALIFIED_LEADS', 'COUNSELLING_SESSIONS', 'DEMO_SESSIONS', 'ADMISSIONS', 'CONVERTED_LEADS', 'ADMISSION_REVENUE', 'FEE_COLLECTION');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('INDIVIDUAL', 'BRANCH');

-- CreateEnum
CREATE TYPE "IncentiveType" AS ENUM ('FIXED', 'SLAB', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "IncentiveStatus" AS ENUM ('CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAYROLL_PROCESSED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "TargetPlan" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "periodType" "TargetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "TargetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "targetPlanId" TEXT,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "targetType" "TargetType" NOT NULL DEFAULT 'INDIVIDUAL',
    "metric" "TargetMetric" NOT NULL,
    "targetValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'COUNT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "TargetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveRule" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "incentiveType" "IncentiveType" NOT NULL DEFAULT 'SLAB',
    "fixedAmount" DECIMAL(12,2),
    "slabs" JSONB,
    "percentages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetProgress" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "userId" TEXT,
    "targetValue" DECIMAL(14,2) NOT NULL,
    "achievedValue" DECIMAL(14,2) NOT NULL,
    "achievementPercentage" DECIMAL(8,2) NOT NULL,
    "remainingValue" DECIMAL(14,2) NOT NULL,
    "potentialIncentive" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incentive" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "branchId" TEXT,
    "targetId" TEXT NOT NULL,
    "targetPlanId" TEXT,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "targetValue" DECIMAL(14,2) NOT NULL,
    "achievedValue" DECIMAL(14,2) NOT NULL,
    "achievementPercentage" DECIMAL(8,2) NOT NULL,
    "calculatedAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "status" "IncentiveStatus" NOT NULL DEFAULT 'CALCULATED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "adjustmentNotes" TEXT,
    "paidAt" TIMESTAMP(3),
    "payrollRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incentive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TargetPlan_instituteId_idx" ON "TargetPlan"("instituteId");
CREATE INDEX "TargetPlan_branchId_idx" ON "TargetPlan"("branchId");
CREATE INDEX "TargetPlan_status_idx" ON "TargetPlan"("status");
CREATE INDEX "TargetPlan_startDate_endDate_idx" ON "TargetPlan"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Target_instituteId_idx" ON "Target"("instituteId");
CREATE INDEX "Target_branchId_idx" ON "Target"("branchId");
CREATE INDEX "Target_targetPlanId_idx" ON "Target"("targetPlanId");
CREATE INDEX "Target_userId_idx" ON "Target"("userId");
CREATE INDEX "Target_metric_idx" ON "Target"("metric");
CREATE INDEX "Target_status_idx" ON "Target"("status");
CREATE INDEX "Target_startDate_endDate_idx" ON "Target"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "IncentiveRule_targetId_key" ON "IncentiveRule"("targetId");
CREATE INDEX "IncentiveRule_targetId_idx" ON "IncentiveRule"("targetId");

-- CreateIndex
CREATE INDEX "TargetProgress_targetId_idx" ON "TargetProgress"("targetId");
CREATE INDEX "TargetProgress_userId_idx" ON "TargetProgress"("userId");
CREATE INDEX "TargetProgress_calculatedAt_idx" ON "TargetProgress"("calculatedAt");

-- CreateIndex
CREATE INDEX "Incentive_instituteId_idx" ON "Incentive"("instituteId");
CREATE INDEX "Incentive_branchId_idx" ON "Incentive"("branchId");
CREATE INDEX "Incentive_targetId_idx" ON "Incentive"("targetId");
CREATE INDEX "Incentive_targetPlanId_idx" ON "Incentive"("targetPlanId");
CREATE INDEX "Incentive_userId_idx" ON "Incentive"("userId");
CREATE INDEX "Incentive_status_idx" ON "Incentive"("status");
CREATE INDEX "Incentive_periodStart_periodEnd_idx" ON "Incentive"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "TargetPlan" ADD CONSTRAINT "TargetPlan_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetPlan" ADD CONSTRAINT "TargetPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TargetPlan" ADD CONSTRAINT "TargetPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Target" ADD CONSTRAINT "Target_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Target" ADD CONSTRAINT "Target_targetPlanId_fkey" FOREIGN KEY ("targetPlanId") REFERENCES "TargetPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Target" ADD CONSTRAINT "Target_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Target" ADD CONSTRAINT "Target_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveRule" ADD CONSTRAINT "IncentiveRule_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetProgress" ADD CONSTRAINT "TargetProgress_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetProgress" ADD CONSTRAINT "TargetProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_targetPlanId_fkey" FOREIGN KEY ("targetPlanId") REFERENCES "TargetPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

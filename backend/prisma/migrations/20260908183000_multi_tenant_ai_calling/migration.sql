-- Multi-tenant AI Calling: CallLog/Lead extensions + agent/config/usage tables

-- ─── Platform agent catalog ───────────────────────────────────────────────────
CREATE TABLE "AiCallingAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SARVAM',
    "providerAppId" TEXT,
    "defaultScript" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCallingAgent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiCallingAgent_isActive_idx" ON "AiCallingAgent"("isActive");
CREATE INDEX "AiCallingAgent_provider_idx" ON "AiCallingAgent"("provider");

-- ─── Platform settings singleton (id = "default") ─────────────────────────────
CREATE TABLE "AiCallingPlatformSettings" (
    "id" TEXT NOT NULL,
    "encryptedCredentials" TEXT,
    "credentialFingerprint" TEXT,
    "telephonyBaseUrl" TEXT,
    "defaultConcurrency" INTEGER NOT NULL DEFAULT 3,
    "encryptedWebhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCallingPlatformSettings_pkey" PRIMARY KEY ("id")
);

-- ─── Per-institute dialer config ──────────────────────────────────────────────
CREATE TABLE "InstituteAiCallingConfig" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "agentId" TEXT,
    "fromNumber" TEXT,
    "callingScript" TEXT,
    "callingHoursStart" TEXT,
    "callingHoursEnd" TEXT,
    "callingDays" JSONB,
    "dailyCallLimit" INTEGER,
    "maxAttemptsPerLead" INTEGER NOT NULL DEFAULT 3,
    "retryDelayMinutes" INTEGER NOT NULL DEFAULT 60,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteAiCallingConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstituteAiCallingConfig_instituteId_key" ON "InstituteAiCallingConfig"("instituteId");
CREATE INDEX "InstituteAiCallingConfig_agentId_idx" ON "InstituteAiCallingConfig"("agentId");
CREATE INDEX "InstituteAiCallingConfig_isEnabled_idx" ON "InstituteAiCallingConfig"("isEnabled");

ALTER TABLE "InstituteAiCallingConfig" ADD CONSTRAINT "InstituteAiCallingConfig_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstituteAiCallingConfig" ADD CONSTRAINT "InstituteAiCallingConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiCallingAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Daily usage counters ─────────────────────────────────────────────────────
CREATE TABLE "AiCallingUsageDaily" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "initiatedCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCallingUsageDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiCallingUsageDaily_instituteId_date_key" ON "AiCallingUsageDaily"("instituteId", "date");
CREATE INDEX "AiCallingUsageDaily_instituteId_idx" ON "AiCallingUsageDaily"("instituteId");
CREATE INDEX "AiCallingUsageDaily_date_idx" ON "AiCallingUsageDaily"("date");

ALTER TABLE "AiCallingUsageDaily" ADD CONSTRAINT "AiCallingUsageDaily_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Lead: importJobId + normalizedPhone ──────────────────────────────────────
ALTER TABLE "Lead" ADD COLUMN "importJobId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "normalizedPhone" TEXT;

UPDATE "Lead"
SET "normalizedPhone" = RIGHT(regexp_replace(COALESCE("phoneNumber", ''), '[^0-9]', '', 'g'), 10)
WHERE "normalizedPhone" IS NULL
  AND regexp_replace(COALESCE("phoneNumber", ''), '[^0-9]', '', 'g') <> '';

CREATE INDEX "Lead_instituteId_normalizedPhone_idx" ON "Lead"("instituteId", "normalizedPhone");
CREATE INDEX "Lead_importJobId_idx" ON "Lead"("importJobId");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "DataImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── CallLog: add columns (nullable instituteId first for backfill) ───────────
ALTER TABLE "CallLog" ADD COLUMN "instituteId" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "branchId" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "importJobId" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "agentId" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "fromNumber" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "recordingUrl" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "recordingStorageKey" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "interestStatus" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "outcome" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CallLog" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "providerPayload" JSONB;
ALTER TABLE "CallLog" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "CallLog" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "CallLog" ADD COLUMN "endedAt" TIMESTAMP(3);
ALTER TABLE "CallLog" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill instituteId / branchId from Lead
UPDATE "CallLog" AS cl
SET
  "instituteId" = l."instituteId",
  "branchId" = COALESCE(cl."branchId", l."branchId")
FROM "Lead" AS l
WHERE cl."leadId" = l."id"
  AND cl."instituteId" IS NULL;

-- Backfill instituteId / branchId from Student (when still missing)
UPDATE "CallLog" AS cl
SET
  "instituteId" = s."instituteId",
  "branchId" = COALESCE(cl."branchId", s."branchId")
FROM "Student" AS s
WHERE cl."studentId" = s."id"
  AND cl."instituteId" IS NULL;

-- Orphan CallLogs with no Lead/Student institute cannot be tenant-scoped safely — remove them
DELETE FROM "CallLog" WHERE "instituteId" IS NULL;

ALTER TABLE "CallLog" ALTER COLUMN "instituteId" SET NOT NULL;

-- Backfill unique idempotencyKey for existing rows
UPDATE "CallLog"
SET "idempotencyKey" =
  'ai_call:' || "instituteId" || ':' || COALESCE("leadId", "id") || ':' || CAST("attemptNumber" AS TEXT) || ':' || "id"
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "CallLog" ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "CallLog_idempotencyKey_key" ON "CallLog"("idempotencyKey");
CREATE INDEX "CallLog_instituteId_idx" ON "CallLog"("instituteId");
CREATE INDEX "CallLog_branchId_idx" ON "CallLog"("branchId");
CREATE INDEX "CallLog_importJobId_idx" ON "CallLog"("importJobId");
CREATE INDEX "CallLog_agentId_idx" ON "CallLog"("agentId");
CREATE INDEX "CallLog_instituteId_createdAt_idx" ON "CallLog"("instituteId", "createdAt");
CREATE INDEX "CallLog_instituteId_status_idx" ON "CallLog"("instituteId", "status");
CREATE INDEX "CallLog_leadId_attemptNumber_idx" ON "CallLog"("leadId", "attemptNumber");

ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "DataImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiCallingAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

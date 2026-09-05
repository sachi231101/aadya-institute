-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('AI', 'WHATSAPP', 'AI_CALLING', 'GOOGLE_WORKSPACE', 'GOOGLE_SHEETS', 'PAYMENT', 'EMAIL');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrationTestStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "encryptedCredentials" TEXT,
    "credentialFingerprint" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" "IntegrationTestStatus",
    "lastError" TEXT,
    "connectedById" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Integration_instituteId_idx" ON "Integration"("instituteId");
CREATE INDEX "Integration_type_idx" ON "Integration"("type");
CREATE UNIQUE INDEX "Integration_instituteId_type_key" ON "Integration"("instituteId", "type");
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
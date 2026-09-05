-- Administration upgrade: org fields, branch enrichment, invitations, security, data mgmt

-- Institute profile fields
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR';
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "dateFormat" TEXT DEFAULT 'DD/MM/YYYY';
ALTER TABLE "Institute" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Branch enrichment
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "workingHours" JSONB;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "managerUserId" TEXT;

CREATE INDEX IF NOT EXISTS "Branch_managerUserId_idx" ON "Branch"("managerUserId");
CREATE INDEX IF NOT EXISTS "Branch_instituteId_status_idx" ON "Branch"("instituteId", "status");

DO $$ BEGIN
  ALTER TABLE "Branch" ADD CONSTRAINT "Branch_managerUserId_fkey"
    FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RefreshToken session metadata
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

-- ActivityLog enrichment
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

CREATE INDEX IF NOT EXISTS "ActivityLog_branchId_idx" ON "ActivityLog"("branchId");
CREATE INDEX IF NOT EXISTS "ActivityLog_instituteId_createdAt_idx" ON "ActivityLog"("instituteId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_instituteId_action_idx" ON "ActivityLog"("instituteId", "action");

DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UserBranchAccess
CREATE TABLE IF NOT EXISTS "UserBranchAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBranchAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserBranchAccess_userId_branchId_key" ON "UserBranchAccess"("userId", "branchId");
CREATE INDEX IF NOT EXISTS "UserBranchAccess_userId_idx" ON "UserBranchAccess"("userId");
CREATE INDEX IF NOT EXISTS "UserBranchAccess_branchId_idx" ON "UserBranchAccess"("branchId");

DO $$ BEGIN
  ALTER TABLE "UserBranchAccess" ADD CONSTRAINT "UserBranchAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserBranchAccess" ADD CONSTRAINT "UserBranchAccess_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- InvitationStatus enum + UserInvitation
DO $$ BEGIN
  CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserInvitation" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "branchId" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "name" TEXT NOT NULL,
  "roleName" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "UserInvitation_instituteId_idx" ON "UserInvitation"("instituteId");
CREATE INDEX IF NOT EXISTS "UserInvitation_instituteId_status_idx" ON "UserInvitation"("instituteId", "status");
CREATE INDEX IF NOT EXISTS "UserInvitation_email_idx" ON "UserInvitation"("email");
CREATE INDEX IF NOT EXISTS "UserInvitation_expiresAt_idx" ON "UserInvitation"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Security policy
CREATE TABLE IF NOT EXISTS "InstituteSecurityPolicy" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
  "lockDurationMinutes" INTEGER NOT NULL DEFAULT 30,
  "loginRateLimitPerMinute" INTEGER NOT NULL DEFAULT 10,
  "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
  "requireUppercase" BOOLEAN NOT NULL DEFAULT true,
  "requireLowercase" BOOLEAN NOT NULL DEFAULT true,
  "requireNumber" BOOLEAN NOT NULL DEFAULT true,
  "requireSpecialChar" BOOLEAN NOT NULL DEFAULT false,
  "passwordExpiryDays" INTEGER,
  "preventPasswordReuse" INTEGER,
  "ipRestrictionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstituteSecurityPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InstituteSecurityPolicy_instituteId_key" ON "InstituteSecurityPolicy"("instituteId");

DO $$ BEGIN
  ALTER TABLE "InstituteSecurityPolicy" ADD CONSTRAINT "InstituteSecurityPolicy_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Login history
DO $$ BEGIN
  CREATE TYPE "LoginEventStatus" AS ENUM ('SUCCESS', 'FAILED', 'LOGOUT', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LoginHistory" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "userId" TEXT,
  "emailOrPhone" TEXT,
  "status" "LoginEventStatus" NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginHistory_instituteId_createdAt_idx" ON "LoginHistory"("instituteId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginHistory_userId_idx" ON "LoginHistory"("userId");
CREATE INDEX IF NOT EXISTS "LoginHistory_status_idx" ON "LoginHistory"("status");

DO $$ BEGIN
  ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Security alerts
DO $$ BEGIN
  CREATE TYPE "SecurityAlertType" AS ENUM (
    'MULTIPLE_FAILED_LOGINS',
    'SUSPICIOUS_AUTH',
    'PERMISSION_CHANGED',
    'ROLE_CHANGED',
    'INTEGRATION_CREDENTIAL_CHANGED',
    'DATA_EXPORTED',
    'SECURITY_SETTING_CHANGED',
    'SESSION_REVOKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SecurityAlert" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "type" "SecurityAlertType" NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityAlert_instituteId_createdAt_idx" ON "SecurityAlert"("instituteId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAlert_type_idx" ON "SecurityAlert"("type");

DO $$ BEGIN
  ALTER TABLE "SecurityAlert" ADD CONSTRAINT "SecurityAlert_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allowed IPs
CREATE TABLE IF NOT EXISTS "AllowedIp" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "cidr" TEXT NOT NULL,
  "label" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AllowedIp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AllowedIp_instituteId_cidr_key" ON "AllowedIp"("instituteId", "cidr");
CREATE INDEX IF NOT EXISTS "AllowedIp_instituteId_idx" ON "AllowedIp"("instituteId");

DO $$ BEGIN
  ALTER TABLE "AllowedIp" ADD CONSTRAINT "AllowedIp_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2FA
CREATE TABLE IF NOT EXISTS "UserTotpSecret" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "encryptedSecret" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserTotpSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserTotpSecret_userId_key" ON "UserTotpSecret"("userId");

DO $$ BEGIN
  ALTER TABLE "UserTotpSecret" ADD CONSTRAINT "UserTotpSecret_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserRecoveryCode_userId_idx" ON "UserRecoveryCode"("userId");

DO $$ BEGIN
  ALTER TABLE "UserRecoveryCode" ADD CONSTRAINT "UserRecoveryCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- System settings
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_instituteId_category_key_key" ON "SystemSetting"("instituteId", "category", "key");
CREATE INDEX IF NOT EXISTS "SystemSetting_instituteId_category_idx" ON "SystemSetting"("instituteId", "category");

DO $$ BEGIN
  ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Data management
DO $$ BEGIN
  CREATE TYPE "DataJobStatus" AS ENUM ('PENDING', 'VALIDATING', 'PREVIEW', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataImportJob" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "status" "DataJobStatus" NOT NULL DEFAULT 'PENDING',
  "fileName" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "successRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "previewData" JSONB,
  "errorReport" JSONB,
  "resultSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DataImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DataImportJob_instituteId_createdAt_idx" ON "DataImportJob"("instituteId", "createdAt");
CREATE INDEX IF NOT EXISTS "DataImportJob_status_idx" ON "DataImportJob"("status");

DO $$ BEGIN
  ALTER TABLE "DataImportJob" ADD CONSTRAINT "DataImportJob_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DataImportJob" ADD CONSTRAINT "DataImportJob_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataExportJob" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "status" "DataJobStatus" NOT NULL DEFAULT 'PENDING',
  "filters" JSONB,
  "filePath" TEXT,
  "downloadToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DataExportJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DataExportJob_downloadToken_key" ON "DataExportJob"("downloadToken");
CREATE INDEX IF NOT EXISTS "DataExportJob_instituteId_createdAt_idx" ON "DataExportJob"("instituteId", "createdAt");
CREATE INDEX IF NOT EXISTS "DataExportJob_status_idx" ON "DataExportJob"("status");

DO $$ BEGIN
  ALTER TABLE "DataExportJob" ADD CONSTRAINT "DataExportJob_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DataExportJob" ADD CONSTRAINT "DataExportJob_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BackupStatus" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "lastSuccessfulAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "message" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BackupStatus_instituteId_key" ON "BackupStatus"("instituteId");

DO $$ BEGIN
  ALTER TABLE "BackupStatus" ADD CONSTRAINT "BackupStatus_instituteId_fkey"
    FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
CREATE TYPE "GoogleConnectionStatus" AS ENUM ('CONNECTED', 'REAUTH_REQUIRED', 'DISCONNECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MeetRecordingStatus" AS ENUM ('ENABLED', 'DISABLED', 'NOT_SUPPORTED', 'PERMISSION_DENIED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MeetSpaceStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Recording" ADD COLUMN "googleConferenceRecordId" TEXT,
ADD COLUMN "googleRecordingId" TEXT,
ADD COLUMN "googleDriveFileId" TEXT,
ADD COLUMN "playbackUrl" TEXT,
ADD COLUMN "recordingStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE',
ADD COLUMN "metadata" JSONB,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Recording" ALTER COLUMN "storageKey" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Recording_googleRecordingId_key" ON "Recording"("googleRecordingId");
CREATE INDEX "Recording_googleRecordingId_idx" ON "Recording"("googleRecordingId");
CREATE INDEX "Recording_googleDriveFileId_idx" ON "Recording"("googleDriveFileId");
CREATE INDEX "Recording_recordingStatus_idx" ON "Recording"("recordingStatus");

-- CreateTable
CREATE TABLE "GoogleWorkspaceConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "googleAccountId" TEXT,
    "email" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GoogleConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleWorkspaceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleMeetSpace" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "spaceName" TEXT NOT NULL,
    "meetingUri" TEXT NOT NULL,
    "meetingCode" TEXT,
    "organizerUserId" TEXT NOT NULL,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recordingConfigurationStatus" "MeetRecordingStatus" NOT NULL DEFAULT 'UNKNOWN',
    "status" "MeetSpaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleMeetSpace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceConnection_userId_key" ON "GoogleWorkspaceConnection"("userId");
CREATE INDEX "GoogleWorkspaceConnection_instituteId_idx" ON "GoogleWorkspaceConnection"("instituteId");
CREATE INDEX "GoogleWorkspaceConnection_email_idx" ON "GoogleWorkspaceConnection"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleMeetSpace_classSessionId_key" ON "GoogleMeetSpace"("classSessionId");
CREATE INDEX "GoogleMeetSpace_spaceName_idx" ON "GoogleMeetSpace"("spaceName");
CREATE INDEX "GoogleMeetSpace_organizerUserId_idx" ON "GoogleMeetSpace"("organizerUserId");

-- AddForeignKey
ALTER TABLE "GoogleWorkspaceConnection" ADD CONSTRAINT "GoogleWorkspaceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleWorkspaceConnection" ADD CONSTRAINT "GoogleWorkspaceConnection_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleMeetSpace" ADD CONSTRAINT "GoogleMeetSpace_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleMeetSpace" ADD CONSTRAINT "GoogleMeetSpace_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

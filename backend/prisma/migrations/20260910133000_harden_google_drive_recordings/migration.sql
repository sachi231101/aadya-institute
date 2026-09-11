-- Extend recording lifecycle and sync diagnostics.
ALTER TABLE "Recording"
ADD COLUMN "name" TEXT,
ADD COLUMN "lastSyncAt" TIMESTAMP(3),
ADD COLUMN "lastSyncError" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Preserve existing available recordings under the new canonical status.
UPDATE "Recording"
SET "recordingStatus" = 'AVAILABLE'
WHERE "recordingStatus" = 'READY';

UPDATE "Recording"
SET "googleDriveFileId" = REGEXP_REPLACE("googleDriveFileId", '^files/', '')
WHERE "googleDriveFileId" LIKE 'files/%';

-- Keep the newest association if legacy syncs attached one Drive file to
-- multiple rows, allowing the uniqueness constraint to be applied safely.
WITH ranked_drive_files AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "googleDriveFileId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS duplicate_rank
  FROM "Recording"
  WHERE "googleDriveFileId" IS NOT NULL
)
UPDATE "Recording" AS recording
SET "googleDriveFileId" = NULL
FROM ranked_drive_files
WHERE recording."id" = ranked_drive_files."id"
  AND ranked_drive_files.duplicate_rank > 1;

DROP INDEX IF EXISTS "Recording_googleDriveFileId_idx";
CREATE UNIQUE INDEX "Recording_googleDriveFileId_key"
ON "Recording"("googleDriveFileId");

CREATE INDEX "Recording_expiresAt_recordingStatus_status_idx"
ON "Recording"("expiresAt", "recordingStatus", "status");

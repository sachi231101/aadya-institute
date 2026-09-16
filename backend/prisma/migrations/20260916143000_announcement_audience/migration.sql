-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "facultyId" DROP NOT NULL;
ALTER TABLE "Announcement" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "authorRole" TEXT NOT NULL DEFAULT 'FACULTY';
ALTER TABLE "Announcement" ADD COLUMN "targetRole" TEXT NOT NULL DEFAULT 'STUDENT';
ALTER TABLE "Announcement" ADD COLUMN "branchId" TEXT;

-- Backfill author from the faculty profile that created the row
UPDATE "Announcement" AS a
SET "createdById" = f."userId"
FROM "Faculty" AS f
WHERE a."facultyId" = f."id"
  AND a."createdById" IS NULL;

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key" ON "AnnouncementRead"("announcementId", "userId");
CREATE INDEX "AnnouncementRead_userId_idx" ON "AnnouncementRead"("userId");
CREATE INDEX "Announcement_createdById_idx" ON "Announcement"("createdById");
CREATE INDEX "Announcement_branchId_idx" ON "Announcement"("branchId");
CREATE INDEX "Announcement_targetRole_idx" ON "Announcement"("targetRole");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permissions used by the Communication announcements item
INSERT INTO "Permission" ("id", "name", "description", "createdAt")
SELECT 'perm_announcement_read', 'announcement.read', 'View announcements', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "name" = 'announcement.read');

INSERT INTO "Permission" ("id", "name", "description", "createdAt")
SELECT 'perm_announcement_create', 'announcement.create', 'Create and delete announcements', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "name" = 'announcement.create');

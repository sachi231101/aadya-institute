-- WhatsApp System Automation V1: institute-scoped config, rules, templates + skip reasons

-- ─── WhatsAppAutomationConfig ────────────────────────────────────────────────
CREATE TABLE "WhatsAppAutomationConfig" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppAutomationConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppAutomationConfig_instituteId_key" ON "WhatsAppAutomationConfig"("instituteId");

ALTER TABLE "WhatsAppAutomationConfig"
  ADD CONSTRAINT "WhatsAppAutomationConfig_instituteId_fkey"
  FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed disabled config for every existing institute
INSERT INTO "WhatsAppAutomationConfig" ("id", "instituteId", "enabled", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || i."id"),
  i."id",
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Institute" i
WHERE NOT EXISTS (
  SELECT 1 FROM "WhatsAppAutomationConfig" c WHERE c."instituteId" = i."id"
);

-- ─── NotificationTemplate: add institute scope ───────────────────────────────
ALTER TABLE "NotificationTemplate" ADD COLUMN "instituteId" TEXT;
ALTER TABLE "NotificationTemplate" ADD COLUMN "category" TEXT;
ALTER TABLE "NotificationTemplate" ADD COLUMN "body" TEXT;

-- Attach orphan templates to first institute (or delete if no institutes)
UPDATE "NotificationTemplate" t
SET "instituteId" = (SELECT "id" FROM "Institute" ORDER BY "createdAt" ASC LIMIT 1)
WHERE t."instituteId" IS NULL
  AND EXISTS (SELECT 1 FROM "Institute");

DELETE FROM "NotificationTemplate" WHERE "instituteId" IS NULL;

ALTER TABLE "NotificationTemplate" ALTER COLUMN "instituteId" SET NOT NULL;

DROP INDEX IF EXISTS "NotificationTemplate_name_key";
CREATE UNIQUE INDEX "NotificationTemplate_instituteId_name_key" ON "NotificationTemplate"("instituteId", "name");
CREATE INDEX "NotificationTemplate_instituteId_idx" ON "NotificationTemplate"("instituteId");
CREATE INDEX "NotificationTemplate_instituteId_event_idx" ON "NotificationTemplate"("instituteId", "event");

ALTER TABLE "NotificationTemplate"
  ADD CONSTRAINT "NotificationTemplate_instituteId_fkey"
  FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── NotificationRule: institute scope + templateId + default OFF ────────────
ALTER TABLE "NotificationRule" ADD COLUMN "instituteId" TEXT;
ALTER TABLE "NotificationRule" ADD COLUMN "templateId" TEXT;

UPDATE "NotificationRule" r
SET "instituteId" = (SELECT "id" FROM "Institute" ORDER BY "createdAt" ASC LIMIT 1)
WHERE r."instituteId" IS NULL
  AND EXISTS (SELECT 1 FROM "Institute");

DELETE FROM "NotificationRule" WHERE "instituteId" IS NULL;

ALTER TABLE "NotificationRule" ALTER COLUMN "instituteId" SET NOT NULL;

-- Force all existing rules OFF for V1 safety
UPDATE "NotificationRule" SET "enabled" = false;

ALTER TABLE "NotificationRule" ALTER COLUMN "enabled" SET DEFAULT false;

DROP INDEX IF EXISTS "NotificationRule_event_channel_key";
CREATE UNIQUE INDEX "NotificationRule_instituteId_event_channel_key"
  ON "NotificationRule"("instituteId", "event", "channel");
CREATE INDEX "NotificationRule_instituteId_idx" ON "NotificationRule"("instituteId");
CREATE INDEX "NotificationRule_templateId_idx" ON "NotificationRule"("templateId");

ALTER TABLE "NotificationRule"
  ADD CONSTRAINT "NotificationRule_instituteId_fkey"
  FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationRule"
  ADD CONSTRAINT "NotificationRule_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Notification: skipReason + isTest ───────────────────────────────────────
ALTER TABLE "Notification" ADD COLUMN "skipReason" TEXT;
ALTER TABLE "Notification" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Notification_instituteId_channel_createdAt_idx"
  ON "Notification"("instituteId", "channel", "createdAt");
CREATE INDEX "Notification_isTest_idx" ON "Notification"("isTest");

-- ─── NotificationIdempotency: optional instituteId ───────────────────────────
ALTER TABLE "NotificationIdempotency" ADD COLUMN "instituteId" TEXT;
CREATE INDEX "NotificationIdempotency_instituteId_idx" ON "NotificationIdempotency"("instituteId");

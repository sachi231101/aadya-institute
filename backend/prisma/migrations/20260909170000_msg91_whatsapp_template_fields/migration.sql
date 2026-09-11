-- AlterTable
ALTER TABLE "NotificationTemplate" ADD COLUMN IF NOT EXISTS "providerTemplateId" TEXT;
ALTER TABLE "NotificationTemplate" ADD COLUMN IF NOT EXISTS "providerNamespace" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationTemplate_instituteId_providerTemplateName_idx" ON "NotificationTemplate"("instituteId", "providerTemplateName");

-- CreateEnum
CREATE TYPE "DocumentTemplateType" AS ENUM ('RECEIPT', 'INVOICE', 'CERTIFICATE');

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "documentType" "DocumentTemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "paperSize" TEXT NOT NULL DEFAULT 'A4',
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_instituteId_documentType_key" ON "DocumentTemplate"("instituteId", "documentType");

-- CreateIndex
CREATE INDEX "DocumentTemplate_instituteId_idx" ON "DocumentTemplate"("instituteId");

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

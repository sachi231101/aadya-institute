-- AlterTable
ALTER TABLE "StudentInvoice" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "StudentInvoice" ADD COLUMN IF NOT EXISTS "pdfGeneratedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OtherInvoice" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "OtherInvoice" ADD COLUMN IF NOT EXISTS "pdfGeneratedAt" TIMESTAMP(3);

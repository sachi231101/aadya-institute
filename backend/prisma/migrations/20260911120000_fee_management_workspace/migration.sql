-- Fee Management Workspace: StudentInvoice, OtherInvoice, receipt PDF metadata

CREATE TYPE "StudentInvoiceStatus" AS ENUM ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "OtherInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "receiptPdfUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptGeneratedAt" TIMESTAMP(3);

ALTER TABLE "PendingFee"
  ADD COLUMN IF NOT EXISTS "otherInvoiceId" TEXT;

ALTER TABLE "PaymentAllocation"
  ADD COLUMN IF NOT EXISTS "studentInvoiceId" TEXT;

CREATE TABLE "StudentInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "branchId" TEXT,
  "studentId" TEXT,
  "admissionId" TEXT,
  "pendingFeeId" TEXT,
  "otherInvoiceId" TEXT,
  "studentName" TEXT NOT NULL,
  "admissionNo" TEXT NOT NULL,
  "courseName" TEXT NOT NULL,
  "feeHead" TEXT,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "balance" DECIMAL(12,2) NOT NULL,
  "status" "StudentInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "lineItems" JSONB,
  "notes" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtherInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "branchId" TEXT,
  "studentId" TEXT,
  "admissionId" TEXT,
  "studentName" TEXT NOT NULL,
  "admissionNo" TEXT NOT NULL,
  "courseName" TEXT,
  "reference" TEXT,
  "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "takenById" TEXT,
  "takenByName" TEXT,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "grandTotal" DECIMAL(12,2) NOT NULL,
  "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "balance" DECIMAL(12,2) NOT NULL,
  "status" "OtherInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "notes" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OtherInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtherInvoiceItem" (
  "id" TEXT NOT NULL,
  "otherInvoiceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(12,2) NOT NULL,
  "feeHeadMasterId" TEXT,
  "feeHead" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OtherInvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentInvoice_invoiceNo_key" ON "StudentInvoice"("invoiceNo");
CREATE UNIQUE INDEX "StudentInvoice_pendingFeeId_key" ON "StudentInvoice"("pendingFeeId");
CREATE INDEX "StudentInvoice_instituteId_idx" ON "StudentInvoice"("instituteId");
CREATE INDEX "StudentInvoice_branchId_idx" ON "StudentInvoice"("branchId");
CREATE INDEX "StudentInvoice_studentId_idx" ON "StudentInvoice"("studentId");
CREATE INDEX "StudentInvoice_admissionId_idx" ON "StudentInvoice"("admissionId");
CREATE INDEX "StudentInvoice_otherInvoiceId_idx" ON "StudentInvoice"("otherInvoiceId");
CREATE INDEX "StudentInvoice_status_idx" ON "StudentInvoice"("status");
CREATE INDEX "StudentInvoice_instituteId_dueDate_idx" ON "StudentInvoice"("instituteId", "dueDate");
CREATE INDEX "StudentInvoice_invoiceNo_idx" ON "StudentInvoice"("invoiceNo");

CREATE UNIQUE INDEX "OtherInvoice_invoiceNo_key" ON "OtherInvoice"("invoiceNo");
CREATE INDEX "OtherInvoice_instituteId_idx" ON "OtherInvoice"("instituteId");
CREATE INDEX "OtherInvoice_branchId_idx" ON "OtherInvoice"("branchId");
CREATE INDEX "OtherInvoice_studentId_idx" ON "OtherInvoice"("studentId");
CREATE INDEX "OtherInvoice_status_idx" ON "OtherInvoice"("status");
CREATE INDEX "OtherInvoice_invoiceNo_idx" ON "OtherInvoice"("invoiceNo");

CREATE INDEX "OtherInvoiceItem_otherInvoiceId_idx" ON "OtherInvoiceItem"("otherInvoiceId");
CREATE INDEX "OtherInvoiceItem_feeHeadMasterId_idx" ON "OtherInvoiceItem"("feeHeadMasterId");
CREATE INDEX "PendingFee_otherInvoiceId_idx" ON "PendingFee"("otherInvoiceId");
CREATE INDEX "PaymentAllocation_studentInvoiceId_idx" ON "PaymentAllocation"("studentInvoiceId");

ALTER TABLE "StudentInvoice"
  ADD CONSTRAINT "StudentInvoice_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "StudentInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StudentInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StudentInvoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StudentInvoice_pendingFeeId_fkey" FOREIGN KEY ("pendingFeeId") REFERENCES "PendingFee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "StudentInvoice_otherInvoiceId_fkey" FOREIGN KEY ("otherInvoiceId") REFERENCES "OtherInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OtherInvoice"
  ADD CONSTRAINT "OtherInvoice_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OtherInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "OtherInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "OtherInvoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OtherInvoiceItem"
  ADD CONSTRAINT "OtherInvoiceItem_otherInvoiceId_fkey" FOREIGN KEY ("otherInvoiceId") REFERENCES "OtherInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OtherInvoiceItem_feeHeadMasterId_fkey" FOREIGN KEY ("feeHeadMasterId") REFERENCES "MasterRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PendingFee"
  ADD CONSTRAINT "PendingFee_otherInvoiceId_fkey" FOREIGN KEY ("otherInvoiceId") REFERENCES "OtherInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAllocation"
  ADD CONSTRAINT "PaymentAllocation_studentInvoiceId_fkey" FOREIGN KEY ("studentInvoiceId") REFERENCES "StudentInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill StudentInvoice for existing PendingFee charges (one invoice per charge)
INSERT INTO "StudentInvoice" (
  "id", "invoiceNo", "instituteId", "branchId", "studentId", "admissionId", "pendingFeeId",
  "studentName", "admissionNo", "courseName", "feeHead",
  "totalAmount", "amountPaid", "balance", "status", "invoiceDate", "dueDate",
  "lineItems", "createdAt", "updatedAt"
)
SELECT
  'bf_inv_' || pf."id",
  'INV-LEGACY-' || LEFT(pf."id", 8) || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY pf."instituteId" ORDER BY pf."createdAt"))::text, 5, '0'),
  pf."instituteId",
  pf."branchId",
  pf."studentId",
  pf."admissionId",
  pf."id",
  pf."studentName",
  pf."admissionNo",
  pf."courseName",
  pf."feeHead",
  (pf."amountPaid" + pf."dueAmount"),
  pf."amountPaid",
  pf."dueAmount",
  CASE
    WHEN pf."dueAmount" <= 0 THEN 'PAID'::"StudentInvoiceStatus"
    WHEN pf."amountPaid" > 0 THEN 'PARTIALLY_PAID'::"StudentInvoiceStatus"
    WHEN pf."status" = 'OVERDUE' THEN 'OVERDUE'::"StudentInvoiceStatus"
    ELSE 'ISSUED'::"StudentInvoiceStatus"
  END,
  pf."createdAt",
  pf."dueDate",
  jsonb_build_array(jsonb_build_object(
    'name', COALESCE(pf."feeHead", 'Fee'),
    'amount', (pf."amountPaid" + pf."dueAmount"),
    'installmentNo', pf."installmentNo"
  )),
  NOW(),
  NOW()
FROM "PendingFee" pf
WHERE NOT EXISTS (
  SELECT 1 FROM "StudentInvoice" si WHERE si."pendingFeeId" = pf."id"
);

UPDATE "PaymentAllocation" pa
SET "studentInvoiceId" = si."id"
FROM "StudentInvoice" si
WHERE si."pendingFeeId" = pa."pendingFeeId"
  AND pa."studentInvoiceId" IS NULL;

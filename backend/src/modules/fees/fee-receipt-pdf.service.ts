import PDFDocument from "pdfkit";
import { prisma } from "../../config/database";
import { saveFile, getFileUrl } from "../../integrations/storage/storage.client";
import { toOrganizationContext } from "../organization/organization.mapper";
import { resolveDisplayOrganizationInfo } from "../../utils/organization-display.util";
import { toMoneyNumber } from "./fee-money.util";

async function bufferFromPdf(
  build: (doc: PDFKit.PDFDocument) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

export async function generateAndStoreReceiptPdf(paymentId: string): Promise<{
  receiptPdfUrl: string;
  receiptGeneratedAt: Date;
} | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      allocations: {
        include: {
          pendingFee: { select: { feeHead: true, installmentNo: true } },
          studentInvoice: { select: { invoiceNo: true } },
        },
      },
      branch: { select: { name: true, address: true, phone: true, email: true, timezone: true } },
      institute: true,
    },
  });

  if (!payment || payment.status !== "SUCCESS") return null;
  if (payment.receiptPdfUrl) {
    return {
      receiptPdfUrl: payment.receiptPdfUrl,
      receiptGeneratedAt: payment.receiptGeneratedAt || new Date(),
    };
  }

  const orgCtx = toOrganizationContext(payment.institute as never);
  const display = resolveDisplayOrganizationInfo({
    organization: orgCtx,
    branch: payment.branch,
    mode: payment.branch ? "branch" : "organization",
  });

  const amount = toMoneyNumber(payment.amount);
  const dateStr = payment.date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const pdfBuffer = await bufferFromPdf((doc) => {
    doc.fontSize(18).text(display.name, { align: "left" });
    doc.fontSize(9).fillColor("#444");
    const addressParts = [
      display.address,
      [display.city, display.state, display.postalCode].filter(Boolean).join(", "),
      display.phone ? `Phone: ${display.phone}` : null,
      display.email ? `Email: ${display.email}` : null,
      display.gstNumber ? `GSTIN: ${display.gstNumber}` : null,
    ].filter(Boolean);
    for (const line of addressParts) {
      doc.text(String(line));
    }
    doc.moveDown();
    doc.fillColor("#000").fontSize(14).text("FEE RECEIPT", { align: "center" });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Receipt No: ${payment.receiptNo}`);
    doc.text(`Date: ${dateStr}`);
    doc.text(`Student: ${payment.studentName}`);
    doc.text(`Admission No: ${payment.admissionNo}`);
    doc.text(`Course: ${payment.courseName}`);
    doc.text(`Payment Mode: ${payment.method}`);
    if (payment.transactionRef) doc.text(`Reference: ${payment.transactionRef}`);
    doc.moveDown();
    doc.text("Particulars", { underline: true });
    if (payment.allocations.length > 0) {
      for (const a of payment.allocations) {
        const head = a.pendingFee?.feeHead || payment.feeHead || "Fee";
        const inv = a.studentInvoice?.invoiceNo ? ` (${a.studentInvoice.invoiceNo})` : "";
        doc.text(
          `${head}${inv} — ₹${toMoneyNumber(a.amount).toFixed(2)}`
        );
      }
    } else {
      doc.text(`${payment.feeHead || "Fee payment"} — ₹${amount.toFixed(2)}`);
    }
    doc.moveDown();
    doc.fontSize(12).text(`Amount Received: ₹${amount.toFixed(2)}`, { underline: true });
    if (payment.notes) {
      doc.moveDown();
      doc.fontSize(10).fillColor("#444").text(`Notes: ${payment.notes}`);
    }
    doc.moveDown(2);
    doc.fontSize(9).fillColor("#666").text("This is a computer-generated receipt.", {
      align: "center",
    });
  });

  const safeName = payment.receiptNo.replace(/[^a-zA-Z0-9-_]/g, "_");
  const relative = await saveFile(pdfBuffer, `${safeName}.pdf`, "receipts");
  const receiptPdfUrl = getFileUrl(relative.startsWith("/") ? relative : `/${relative}`);
  const receiptGeneratedAt = new Date();

  await prisma.payment.update({
    where: { id: payment.id },
    data: { receiptPdfUrl, receiptGeneratedAt },
  });

  return { receiptPdfUrl, receiptGeneratedAt };
}

/** Fire-and-forget after SUCCESS payment; failures are logged by caller. */
export function enqueueReceiptPdfGeneration(paymentId: string): void {
  void generateAndStoreReceiptPdf(paymentId).catch(() => {
    // Non-blocking: receipt number already exists; PDF can be regenerated on demand
  });
}

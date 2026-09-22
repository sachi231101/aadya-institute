import fs from "fs";
import path from "path";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { saveFile, getFileUrl } from "../../integrations/storage/storage.client";
import { buildReceiptData } from "../document-templates/document-data.service";
import { renderDocumentPdf } from "../document-templates/document-render.service";
import { getTemplateLayout } from "../document-templates/document-template.service";

/** Resolve local filesystem path for a stored receipt PDF URL/key. */
export function resolveLocalReceiptPdfPath(receiptPdfUrl: string): string | null {
  const keyMatch = receiptPdfUrl.match(/\/receipts\/[^/?#]+/);
  if (!keyMatch) return null;
  const localRoot = process.env.LOCAL_UPLOADS_DIR || "./uploads";
  return path.resolve(localRoot, keyMatch[0].replace(/^\//, ""));
}

function localReceiptPdfExists(receiptPdfUrl: string): boolean {
  const absolutePath = resolveLocalReceiptPdfPath(receiptPdfUrl);
  return !!absolutePath && fs.existsSync(absolutePath);
}

export async function generateAndStoreReceiptPdf(
  paymentId: string,
  options?: { force?: boolean }
): Promise<{
  receiptPdfUrl: string;
  receiptGeneratedAt: Date;
} | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      instituteId: true,
      receiptNo: true,
      status: true,
      receiptPdfUrl: true,
      receiptGeneratedAt: true,
    },
  });

  if (!payment || payment.status !== "SUCCESS") return null;

  if (
    payment.receiptPdfUrl &&
    !options?.force &&
    localReceiptPdfExists(payment.receiptPdfUrl)
  ) {
    return {
      receiptPdfUrl: payment.receiptPdfUrl,
      receiptGeneratedAt: payment.receiptGeneratedAt || new Date(),
    };
  }

  const [layout, data] = await Promise.all([
    getTemplateLayout(payment.instituteId, "RECEIPT"),
    buildReceiptData(paymentId),
  ]);
  if (!data) return null;

  const pdfBuffer = await renderDocumentPdf(layout, data);

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

/** Fire-and-forget after SUCCESS payment; failures are logged. */
export function enqueueReceiptPdfGeneration(paymentId: string): void {
  void generateAndStoreReceiptPdf(paymentId).catch((err: unknown) => {
    logger.error(
      { err, paymentId },
      `[receipt-pdf] Failed to generate PDF for payment ${paymentId}`
    );
  });
}

import fs from "fs";
import path from "path";
import { prisma } from "../../config/database";
import { saveFile, getFileUrl } from "../../integrations/storage/storage.client";
import {
  buildInvoiceData,
  type InvoiceKind,
} from "../document-templates/document-data.service";
import { renderDocumentPdf } from "../document-templates/document-render.service";
import { getTemplateLayout } from "../document-templates/document-template.service";

const FOLDER = "invoices";

/** Resolve local filesystem path for a stored invoice PDF URL/key. */
export function resolveLocalInvoicePdfPath(pdfUrl: string): string | null {
  const keyMatch = pdfUrl.match(/\/invoices\/[^/?#]+/);
  if (!keyMatch) return null;
  const localRoot = process.env.LOCAL_UPLOADS_DIR || "./uploads";
  return path.resolve(localRoot, keyMatch[0].replace(/^\//, ""));
}

function localInvoicePdfExists(pdfUrl: string): boolean {
  const absolutePath = resolveLocalInvoicePdfPath(pdfUrl);
  return !!absolutePath && fs.existsSync(absolutePath);
}

async function loadInvoiceMeta(kind: InvoiceKind, id: string) {
  const select = {
    id: true,
    instituteId: true,
    invoiceNo: true,
    pdfUrl: true,
    pdfGeneratedAt: true,
  } as const;

  return kind === "OTHER"
    ? prisma.otherInvoice.findUnique({ where: { id }, select })
    : prisma.studentInvoice.findUnique({ where: { id }, select });
}

export async function generateAndStoreInvoicePdf(
  kind: InvoiceKind,
  id: string,
  options?: { force?: boolean }
): Promise<{ pdfUrl: string; pdfGeneratedAt: Date } | null> {
  const invoice = await loadInvoiceMeta(kind, id);
  if (!invoice) return null;

  if (invoice.pdfUrl && !options?.force && localInvoicePdfExists(invoice.pdfUrl)) {
    return { pdfUrl: invoice.pdfUrl, pdfGeneratedAt: invoice.pdfGeneratedAt || new Date() };
  }

  const [layout, data] = await Promise.all([
    getTemplateLayout(invoice.instituteId, "INVOICE"),
    buildInvoiceData(kind, id),
  ]);
  if (!data) return null;

  const pdfBuffer = await renderDocumentPdf(layout, data);
  const safeName = `${kind === "OTHER" ? "OI" : "SI"}-${invoice.invoiceNo}`.replace(
    /[^a-zA-Z0-9-_]/g,
    "_"
  );
  const relative = await saveFile(pdfBuffer, `${safeName}.pdf`, FOLDER);
  const pdfUrl = getFileUrl(relative.startsWith("/") ? relative : `/${relative}`);
  const pdfGeneratedAt = new Date();

  if (kind === "OTHER") {
    await prisma.otherInvoice.update({ where: { id }, data: { pdfUrl, pdfGeneratedAt } });
  } else {
    await prisma.studentInvoice.update({ where: { id }, data: { pdfUrl, pdfGeneratedAt } });
  }

  return { pdfUrl, pdfGeneratedAt };
}

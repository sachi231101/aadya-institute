import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import type { ApiDocumentType, DocumentLayout } from "./document-template.types";

/** Institute document layouts for receipt, invoice, and certificate. */
export class DocumentTemplateRepository {
  static findByInstituteAndType(instituteId: string, documentType: ApiDocumentType) {
    return prisma.documentTemplate.findUnique({
      where: {
        instituteId_documentType: { instituteId, documentType },
      },
    });
  }

  /** Drop generated files so the next download re-renders with the new design. */
  static async clearGeneratedDocuments(
    instituteId: string,
    documentType: ApiDocumentType
  ): Promise<void> {
    if (documentType === "RECEIPT") {
      await prisma.payment.updateMany({
        where: { instituteId, NOT: { receiptPdfUrl: null } },
        data: { receiptPdfUrl: null, receiptGeneratedAt: null },
      });
      return;
    }
    if (documentType === "INVOICE") {
      await prisma.$transaction([
        prisma.studentInvoice.updateMany({
          where: { instituteId, NOT: { pdfUrl: null } },
          data: { pdfUrl: null, pdfGeneratedAt: null },
        }),
        prisma.otherInvoice.updateMany({
          where: { instituteId, NOT: { pdfUrl: null } },
          data: { pdfUrl: null, pdfGeneratedAt: null },
        }),
      ]);
    }
  }

  static upsert(
    instituteId: string,
    documentType: ApiDocumentType,
    name: string,
    layout: DocumentLayout
  ) {
    const json = layout as unknown as Prisma.InputJsonValue;
    return prisma.documentTemplate.upsert({
      where: {
        instituteId_documentType: { instituteId, documentType },
      },
      create: {
        instituteId,
        documentType,
        name,
        paperSize: "A4",
        layout: json,
      },
      update: {
        name,
        paperSize: "A4",
        layout: json,
      },
    });
  }
}

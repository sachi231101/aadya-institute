import { z } from "zod";
import { API_DOCUMENT_TYPES, type ApiDocumentType } from "./document-template.types";
import { DOCUMENT_BINDINGS } from "./document-template.defaults";

export const documentTemplateParamSchema = z.object({
  type: z.enum(API_DOCUMENT_TYPES),
});

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value");

const blockStyleSchema = z.object({
  fontSize: z.number().min(6).max(72),
  bold: z.boolean(),
  align: z.enum(["left", "center", "right"]),
  color: hexColor,
  background: hexColor.optional(),
  underline: z.boolean().optional(),
  inline: z.boolean().optional(),
  dashed: z.boolean().optional(),
});

const blockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["logo", "text", "field", "line", "table", "signature", "panel", "barcode", "qr"]),
  binding: z.string().min(1).max(80).optional(),
  text: z.string().max(2000).optional(),
  value: z.string().max(2000).optional(),
  x: z.number().min(0).max(2000),
  y: z.number().min(0).max(3000),
  width: z.number().min(4).max(2000),
  height: z.number().min(0).max(2000),
  style: blockStyleSchema,
});

export const documentLayoutSchema = z.object({
  blocks: z.array(blockSchema).max(120),
});

export const upsertDocumentTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  paperSize: z.literal("A4").optional(),
  layout: documentLayoutSchema,
});

const bindingAllowed = (documentType: ApiDocumentType, binding: string | undefined): boolean => {
  if (!binding) return false;
  if (binding === "logo") return true;
  return DOCUMENT_BINDINGS[documentType].includes(binding);
};

export const assertLayoutBindings = (
  documentType: ApiDocumentType,
  layout: z.infer<typeof documentLayoutSchema>
): string | null => {
  for (const block of layout.blocks) {
    if (block.type === "field" || block.type === "table" || block.type === "barcode" || block.type === "qr") {
      if (!bindingAllowed(documentType, block.binding)) {
        return `Block ${block.id} uses a field that is not available on this document`;
      }
    }
    if (block.type === "logo" && block.binding && block.binding !== "logo") {
      return `Block ${block.id} logo binding is invalid`;
    }
    if (
      block.type === "signature" &&
      block.binding &&
      block.binding !== "signatory" &&
      !DOCUMENT_BINDINGS[documentType].includes(block.binding)
    ) {
      return `Block ${block.id} uses a field that is not available on this document`;
    }
  }
  return null;
};

export type DocumentTemplateParams = z.infer<typeof documentTemplateParamSchema>;
export type UpsertDocumentTemplateBody = z.infer<typeof upsertDocumentTemplateSchema>;

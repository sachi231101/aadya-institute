export const API_DOCUMENT_TYPES = ["RECEIPT", "INVOICE", "CERTIFICATE"] as const;

export type ApiDocumentType = (typeof API_DOCUMENT_TYPES)[number];

export type CanvasBlockType =
  | "logo"
  | "text"
  | "field"
  | "line"
  | "table"
  | "signature"
  | "panel"
  | "barcode"
  | "qr";

export type CanvasAlign = "left" | "center" | "right";

export interface CanvasBlockStyle {
  fontSize: number;
  bold: boolean;
  align: CanvasAlign;
  color: string;
  background?: string;
  underline?: boolean;
  inline?: boolean;
  dashed?: boolean;
}

export interface CanvasBlock {
  id: string;
  type: CanvasBlockType;
  binding?: string;
  text?: string;
  value?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: CanvasBlockStyle;
}

export interface DocumentLayout {
  blocks: CanvasBlock[];
}

export interface DocumentTableData {
  columns?: string[];
  align?: CanvasAlign[];
  weights?: number[];
  rows: string[][];
  totals?: string[];
}

/** Values placed on a rendered document, keyed by block binding. */
export type DocumentRenderData = Record<string, string | DocumentTableData | undefined>;

export interface DocumentTemplateResponse {
  documentType: ApiDocumentType;
  name: string;
  paperSize: "A4";
  layout: DocumentLayout;
  saved: boolean;
}

export interface UpsertDocumentTemplateInput {
  name?: string;
  paperSize?: "A4";
  layout: DocumentLayout;
}

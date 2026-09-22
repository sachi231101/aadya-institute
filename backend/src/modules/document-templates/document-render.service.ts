import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import type {
  CanvasAlign,
  CanvasBlock,
  DocumentLayout,
  DocumentTableData,
  DocumentRenderData,
} from "./document-template.types";

/** Canvas coordinates are A4 at 96 dpi; PDF points are A4 at 72 dpi. */
const CANVAS_WIDTH = 794;
const PDF_WIDTH = 595.28;
const SCALE = PDF_WIDTH / CANVAS_WIDTH;

const DEFAULT_TABLE_HEADER_BG = "#e5e7eb";
const CELL_PADDING = 1.5;

interface TableColumnSpec {
  columns: string[];
  align: CanvasAlign[];
  weights: number[];
}

/** Column headers and relative widths, mirroring the Canvas editor preview. */
export const TABLE_COLUMNS: Record<string, TableColumnSpec> = {
  invoiceRows: {
    columns: [
      "Received against Invoice #",
      "Package Details",
      "Fees Details",
      "Invoice Date",
      "Due Fee",
      "Received Fee",
    ],
    align: ["left", "left", "left", "center", "right", "right"],
    weights: [1.4, 1.6, 1.1, 1, 0.7, 0.9],
  },
  installmentRows: {
    columns: ["Due Date", "Due Fee", "Received Fee", "Balance Fee", "Payment Details"],
    align: ["left", "right", "right", "right", "center"],
    weights: [1.1, 0.8, 1, 1, 2.2],
  },
  feeLines: {
    columns: ["Particulars", "Amount"],
    align: ["left", "right"],
    weights: [3, 1],
  },
  lineItems: {
    columns: ["Item", "Qty", "Rate", "Amount"],
    align: ["left", "center", "right", "right"],
    weights: [3, 0.7, 1, 1],
  },
  itemRows: {
    columns: ["Item Details", "HSN/SACCode", "Qty", "Rate", "Total"],
    align: ["left", "center", "right", "right", "right"],
    weights: [2.4, 1.4, 0.6, 1, 1],
  },
  transactionRows: {
    columns: [
      "SR. No.",
      "Transaction Date",
      "Mode",
      "Cheque/Transaction",
      "Amount",
      "TDS",
      "Total",
    ],
    align: ["left", "left", "left", "center", "right", "right", "right"],
    weights: [0.7, 1.3, 1.1, 1.5, 0.9, 0.6, 0.8],
  },
};

/**
 * PDFKit's built-in fonts use WinAnsi, which has no rupee sign. Replace the
 * characters we emit so amounts stay readable instead of dropping out.
 */
const toPdfText = (value: string): string =>
  value
    .replace(/\u20B9/g, "Rs.")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");

/** Map a stored logo URL/path to a local file when one exists. */
export const isRenderableImage = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const localRoot = process.env.LOCAL_UPLOADS_DIR || "./uploads";
  const match = value.match(/\/(document-logos|logos)\/([^/?#]+)$/);
  if (match) {
    const filePath = path.resolve(localRoot, match[1] as string, match[2] as string);
    return fs.existsSync(filePath) ? filePath : null;
  }
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/api/")) {
    const filePath = path.resolve(localRoot, value.replace(/^\//, ""));
    return fs.existsSync(filePath) ? filePath : null;
  }
  return null;
};

/** Admin-typed value wins, then the bound record value, then blank. */
export const resolveBlockValue = (block: CanvasBlock, data: DocumentRenderData): string => {
  if (block.value !== undefined) return block.value;
  if (!block.binding) return "";
  const raw = data[block.binding];
  if (raw == null) return "";
  return typeof raw === "string" ? raw : "";
};

const resolveValue = resolveBlockValue;

/**
 * Canvas stores an uploaded logo in block.text (and optionally block.value).
 * Fall back to the organization logo from render data.
 */
export const resolveLogoSource = (
  block: CanvasBlock,
  data: DocumentRenderData
): string | null => {
  const candidates = [
    block.value,
    block.text,
    resolveValue(block, data),
    typeof data.logo === "string" ? data.logo : undefined,
  ];
  for (const candidate of candidates) {
    const filePath = isRenderableImage(candidate);
    if (filePath) return filePath;
  }
  return null;
};

const resolveTable = (
  block: CanvasBlock,
  data: DocumentRenderData
): DocumentTableData | null => {
  if (!block.binding) return null;
  const spec = TABLE_COLUMNS[block.binding];
  if (!spec) return null;
  const raw = data[block.binding];
  const table = (raw && typeof raw === "object" ? (raw as DocumentTableData) : null) ?? {
    rows: [],
  };
  return {
    columns: spec.columns,
    align: spec.align,
    weights: spec.weights,
    rows: Array.isArray(table.rows) ? table.rows : [],
    ...(table.totals ? { totals: table.totals } : {}),
  };
};

const fontFor = (bold: boolean) => (bold ? "Helvetica-Bold" : "Helvetica");

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const scaleBox = (block: CanvasBlock): Box => ({
  x: block.x * SCALE,
  y: block.y * SCALE,
  width: block.width * SCALE,
  height: block.height * SCALE,
});

const drawBackground = (doc: PDFKit.PDFDocument, box: Box, background?: string) => {
  if (!background) return;
  doc.save();
  doc.rect(box.x, box.y, box.width, box.height).fill(background);
  doc.restore();
};

const drawText = (
  doc: PDFKit.PDFDocument,
  text: string,
  box: Box,
  options: {
    fontSize: number;
    bold: boolean;
    align: CanvasAlign;
    color: string;
    underline?: boolean;
    padding?: number;
    verticalCenter?: boolean;
  }
) => {
  const content = toPdfText(text);
  if (!content) return;
  const padding = options.padding ?? 0;
  const width = Math.max(box.width - padding * 2, 1);
  doc.font(fontFor(options.bold)).fontSize(options.fontSize).fillColor(options.color);
  const textHeight = doc.heightOfString(content, { width, align: options.align });
  const y = options.verticalCenter
    ? box.y + Math.max((box.height - textHeight) / 2, 0)
    : box.y;
  doc.text(content, box.x + padding, y, {
    width,
    align: options.align,
    ...(options.underline ? { underline: true } : {}),
  });
};

const drawLine = (doc: PDFKit.PDFDocument, block: CanvasBlock, box: Box) => {
  doc.save();
  doc.lineWidth(Math.max(block.height * SCALE, 0.6));
  doc.strokeColor(block.style.color);
  if (block.style.dashed) doc.dash(2, { space: 2 });
  doc
    .moveTo(box.x, box.y)
    .lineTo(box.x + box.width, box.y)
    .stroke();
  doc.undash();
  doc.restore();
};

/** Build a scannable Code128 PNG for receipt/invoice numbers. */
export const renderBarcodePng = async (value: string): Promise<Buffer | null> => {
  const text = value.trim();
  if (!text) return null;
  try {
    return await bwipjs.toBuffer({
      bcid: "code128",
      text,
      scale: 3,
      height: 12,
      includetext: false,
      backgroundcolor: "FFFFFF",
    });
  } catch {
    return null;
  }
};

/** Build a scannable QR PNG (certificate verification, etc.). */
export const renderQrPng = async (value: string): Promise<Buffer | null> => {
  const text = value.trim();
  if (!text) return null;
  try {
    return await bwipjs.toBuffer({
      bcid: "qrcode",
      text,
      scale: 4,
      includetext: false,
      backgroundcolor: "FFFFFF",
    });
  } catch {
    return null;
  }
};

const drawImageBuffer = (
  doc: PDFKit.PDFDocument,
  png: Buffer,
  box: Box
): void => {
  try {
    doc.image(png, box.x, box.y, {
      fit: [box.width, box.height],
      align: "center",
      valign: "center",
    });
  } catch {
    // A broken image must not fail the whole document.
  }
};

const drawBarcode = async (
  doc: PDFKit.PDFDocument,
  value: string,
  box: Box
): Promise<void> => {
  const png = await renderBarcodePng(value);
  if (png) drawImageBuffer(doc, png, box);
};

const drawQr = async (
  doc: PDFKit.PDFDocument,
  value: string,
  box: Box
): Promise<void> => {
  const png = await renderQrPng(value);
  if (png) drawImageBuffer(doc, png, box);
};

const drawLogo = (doc: PDFKit.PDFDocument, filePath: string, box: Box) => {
  try {
    doc.image(filePath, box.x, box.y, {
      fit: [box.width, box.height],
      align: "center",
      valign: "center",
    });
  } catch {
    // A broken image must not fail the whole document.
  }
};

const drawSignature = (
  doc: PDFKit.PDFDocument,
  caption: string,
  box: Box,
  block: CanvasBlock
) => {
  const fontSize = block.style.fontSize * SCALE;
  doc.save();
  doc.lineWidth(0.6).strokeColor(block.style.color);
  const lineY = box.y + box.height - fontSize - 4;
  doc
    .moveTo(box.x, lineY)
    .lineTo(box.x + box.width, lineY)
    .stroke();
  doc.restore();
  drawText(doc, caption, { ...box, y: lineY + 2, height: fontSize + 2 }, {
    fontSize,
    bold: block.style.bold,
    align: block.style.align,
    color: block.style.color,
  });
};

const drawTable = (
  doc: PDFKit.PDFDocument,
  table: DocumentTableData,
  box: Box,
  block: CanvasBlock
) => {
  const fontSize = block.style.fontSize * SCALE;
  const padding = CELL_PADDING * SCALE + 1;
  const columns = table.columns ?? [];
  const weights = table.weights ?? columns.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const widths = weights.map((weight) => (weight / totalWeight) * box.width);
  const offsets: number[] = [];
  let offset = box.x;
  for (const width of widths) {
    offsets.push(offset);
    offset += width;
  }

  const rowHeight = (cells: string[], bold: boolean): number => {
    doc.font(fontFor(bold)).fontSize(fontSize);
    let tallest = fontSize;
    cells.forEach((cell, index) => {
      const width = Math.max((widths[index] ?? box.width) - padding * 2, 1);
      const height = doc.heightOfString(toPdfText(cell || ""), { width });
      if (height > tallest) tallest = height;
    });
    return tallest + padding * 2;
  };

  const drawRow = (
    cells: string[],
    y: number,
    opts: { bold: boolean; background?: string; borderTop?: boolean; borderBottom?: boolean }
  ): number => {
    const height = rowHeight(cells, opts.bold);
    if (opts.background) {
      doc.save();
      doc.rect(box.x, y, box.width, height).fill(opts.background);
      doc.restore();
    }
    cells.forEach((cell, index) => {
      const width = widths[index] ?? box.width;
      drawText(
        doc,
        cell || "",
        { x: offsets[index] ?? box.x, y: y + padding, width, height },
        {
          fontSize,
          bold: opts.bold,
          align: table.align?.[index] ?? "left",
          color: block.style.color,
          padding,
        }
      );
    });
    doc.save();
    doc.lineWidth(0.4).strokeColor("#cbd5e1");
    if (opts.borderTop) {
      doc.moveTo(box.x, y).lineTo(box.x + box.width, y).stroke();
    }
    if (opts.borderBottom) {
      doc
        .moveTo(box.x, y + height)
        .lineTo(box.x + box.width, y + height)
        .stroke();
    }
    doc.restore();
    return height;
  };

  let cursorY = box.y;
  if (columns.length > 0) {
    cursorY += drawRow(columns, cursorY, {
      bold: true,
      background: block.style.background ?? DEFAULT_TABLE_HEADER_BG,
    });
  }
  for (const row of table.rows) {
    cursorY += drawRow(row, cursorY, { bold: false, borderBottom: true });
  }
  if (table.totals) {
    drawRow(table.totals, cursorY, { bold: true, borderTop: true, borderBottom: true });
  }
};

const drawField = (
  doc: PDFKit.PDFDocument,
  block: CanvasBlock,
  box: Box,
  value: string
) => {
  const fontSize = block.style.fontSize * SCALE;
  const padding = block.style.background ? CELL_PADDING * SCALE + 1 : 0;
  const label = block.text ?? "";

  if (block.style.inline) {
    const text = [label, value].filter(Boolean).join(" ");
    drawText(doc, text, box, {
      fontSize,
      bold: block.style.bold,
      align: block.style.align,
      color: block.style.color,
      underline: block.style.underline,
      padding,
      verticalCenter: true,
    });
    return;
  }

  if (!label) {
    drawText(doc, value, box, {
      fontSize,
      bold: block.style.bold,
      align: block.style.align,
      color: block.style.color,
      underline: block.style.underline,
      padding,
      verticalCenter: true,
    });
    return;
  }

  const labelSize = Math.max(fontSize * 0.8, 5);
  drawText(doc, label, { ...box, height: labelSize + 1 }, {
    fontSize: labelSize,
    bold: false,
    align: block.style.align,
    color: "#6b7280",
    padding,
  });
  drawText(
    doc,
    value,
    { ...box, y: box.y + labelSize + 1.5, height: Math.max(box.height - labelSize - 1.5, 1) },
    {
      fontSize,
      bold: block.style.bold,
      align: block.style.align,
      color: block.style.color,
      underline: block.style.underline,
      padding,
    }
  );
};

const drawBlock = async (
  doc: PDFKit.PDFDocument,
  block: CanvasBlock,
  data: DocumentRenderData
): Promise<void> => {
  const box = scaleBox(block);

  if (block.type === "line") {
    drawLine(doc, block, box);
    return;
  }

  doc.save();
  doc.rect(box.x, box.y, box.width, Math.max(box.height, 1)).clip();

  try {
    switch (block.type) {
      case "panel": {
        drawBackground(doc, box, block.style.background);
        drawText(doc, block.text ?? "", box, {
          fontSize: block.style.fontSize * SCALE,
          bold: block.style.bold,
          align: block.style.align,
          color: block.style.color,
          underline: block.style.underline,
          padding: CELL_PADDING * SCALE + 1,
          verticalCenter: true,
        });
        break;
      }
      case "text": {
        drawBackground(doc, box, block.style.background);
        drawText(doc, block.text ?? "", box, {
          fontSize: block.style.fontSize * SCALE,
          bold: block.style.bold,
          align: block.style.align,
          color: block.style.color,
          underline: block.style.underline,
          verticalCenter: true,
        });
        break;
      }
      case "logo": {
        const source = resolveLogoSource(block, data);
        if (source) drawLogo(doc, source, box);
        break;
      }
      case "barcode": {
        await drawBarcode(doc, resolveValue(block, data), box);
        break;
      }
      case "qr": {
        await drawQr(doc, resolveValue(block, data), box);
        break;
      }
      case "signature": {
        const caption = resolveValue(block, data) || block.text || "";
        drawSignature(doc, caption, box, block);
        break;
      }
      case "table": {
        const table = resolveTable(block, data);
        if (table) drawTable(doc, table, box, block);
        break;
      }
      case "field":
      default: {
        drawBackground(doc, box, block.style.background);
        drawField(doc, block, box, resolveValue(block, data));
        break;
      }
    }
  } finally {
    doc.restore();
  }
};

/** Render a saved Canvas layout to a single-page A4 PDF. */
export const renderDocumentPdf = async (
  layout: DocumentLayout,
  data: DocumentRenderData
): Promise<Buffer> => {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  for (const block of layout.blocks) {
    await drawBlock(doc, block, data);
  }
  doc.end();
  return finished;
};
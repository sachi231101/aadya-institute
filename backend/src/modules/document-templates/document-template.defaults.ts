import type {
  ApiDocumentType,
  CanvasAlign,
  CanvasBlock,
  CanvasBlockStyle,
  CanvasBlockType,
  DocumentLayout,
} from "./document-template.types";

export const DEFAULT_TEMPLATE_NAMES: Record<ApiDocumentType, string> = {
  RECEIPT: "Receipt",
  INVOICE: "Invoice",
  CERTIFICATE: "Certificate",
};

const HEADER_BINDINGS = ["instituteName", "address", "phone", "email", "gstNumber"] as const;

export const DOCUMENT_BINDINGS: Record<ApiDocumentType, readonly string[]> = {
  RECEIPT: [
    ...HEADER_BINDINGS,
    "receiptNo",
    "date",
    "receivedIn",
    "chequeNumber",
    "receivedFee",
    "studentName",
    "idCardNo",
    "studentAddress",
    "admissionNo",
    "courseName",
    "method",
    "transactionRef",
    "invoiceRows",
    "installmentRows",
    "feeLines",
    "amount",
    "notes",
  ],
  INVOICE: [
    ...HEADER_BINDINGS,
    "invoiceNo",
    "invoiceDate",
    "referenceNo",
    "placeOfSupply",
    "dueDate",
    "studentName",
    "studentAddress",
    "admissionNo",
    "courseName",
    "itemRows",
    "transactionRows",
    "lineItems",
    "subtotal",
    "adjustment",
    "discount",
    "tax",
    "grandTotal",
    "amountPaid",
    "balance",
    "terms",
    "notes",
  ],
  CERTIFICATE: [
    "instituteName",
    "certificateNo",
    "studentName",
    "courseName",
    "issueDate",
    "grade",
    "duration",
    "signatory",
  ],
};

type BlockExtra = {
  binding?: string;
  text?: string;
  fontSize?: number;
  bold?: boolean;
  align?: CanvasAlign;
  color?: string;
  background?: string;
  underline?: boolean;
  inline?: boolean;
  dashed?: boolean;
};

const LABEL_BG = "#f1f2f4";
const HEADER_BG = "#e5e7eb";
const GREEN = "#22c55e";
const MUTED = "#374151";

const styleOf = (extra: BlockExtra): CanvasBlockStyle => ({
  fontSize: extra.fontSize ?? 12,
  bold: extra.bold ?? false,
  align: extra.align ?? "left",
  color: extra.color ?? "#111827",
  ...(extra.background ? { background: extra.background } : {}),
  ...(extra.underline ? { underline: true } : {}),
  ...(extra.inline ? { inline: true } : {}),
  ...(extra.dashed ? { dashed: true } : {}),
});

const block = (
  id: string,
  type: CanvasBlockType,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: BlockExtra = {}
): CanvasBlock => ({
  id,
  type,
  x,
  y,
  width,
  height,
  ...(extra.binding ? { binding: extra.binding } : {}),
  ...(extra.text !== undefined ? { text: extra.text } : {}),
  style: styleOf(extra),
});

const RECEIPT_ROWS: Array<{ id: string; label: string; binding: string; bold?: boolean }> = [
  { id: "receipt-no", label: "Receipt #", binding: "receiptNo", bold: true },
  { id: "receipt-date", label: "Receipt Date", binding: "date" },
  { id: "received-in", label: "Received In", binding: "receivedIn" },
  { id: "cheque", label: "Cheque/Tran. Number", binding: "chequeNumber" },
  { id: "received-fee", label: "Received Fee", binding: "receivedFee" },
];

const TERMS_LINES: Array<{ text: string; bold?: boolean }> = [
  {
    text: "RULES AND REGULATION: All students must follow all the rules and regulations of the Institute.",
  },
  {
    text: "NON REFUNDABLE RECEIPT: Fee / Amount Once Paid is Non Refundable under any circumstances.",
  },
  {
    text: "EDIFY is now DIGITAL & ONLINE: EDIFY is now Online - Goto PLAY STORE download ZENOXERP app and install it on Mobile.",
  },
  {
    text: "Login using your Mobile number. Now you can upload your Resume, and apply for JOB online.",
  },
  { text: "Fee is inclusive of all Taxes." },
  {
    text: "If students fail to pay the fee within the due date, then Rs. 10/- per day late payment charges will apply.",
    bold: true,
  },
];

const receiptLayout = (): DocumentLayout => {
  const blocks: CanvasBlock[] = [
    block("logo", "logo", 40, 26, 116, 58, { binding: "logo" }),
    block("institute-name", "field", 172, 28, 320, 14, {
      binding: "instituteName",
      text: "",
      fontSize: 9,
    }),
    block("institute-address", "field", 172, 44, 320, 24, {
      binding: "address",
      text: "",
      fontSize: 8,
      color: MUTED,
    }),
    block("institute-email", "field", 172, 70, 320, 12, {
      binding: "email",
      text: "",
      fontSize: 8,
      color: MUTED,
    }),
    block("institute-phone", "field", 172, 84, 320, 12, {
      binding: "phone",
      text: "",
      fontSize: 8,
      color: MUTED,
    }),
    block("receipt-tag", "field", 520, 24, 234, 16, {
      binding: "receiptNo",
      text: "Receipt #",
      fontSize: 11,
      bold: true,
      color: "#16a34a",
      inline: true,
    }),
    block("barcode", "barcode", 556, 44, 198, 42, { binding: "receiptNo" }),

    block("received-from-header", "panel", 430, 136, 324, 18, {
      text: "Received From :",
      fontSize: 9,
      bold: true,
      background: HEADER_BG,
    }),
    block("rf-name", "field", 434, 158, 316, 14, {
      binding: "studentName",
      text: "",
      fontSize: 9,
    }),
    block("rf-id", "field", 434, 174, 316, 14, {
      binding: "idCardNo",
      text: "ID Card No. :",
      fontSize: 9,
      inline: true,
    }),
    block("rf-address", "field", 434, 194, 316, 30, {
      binding: "studentAddress",
      text: "",
      fontSize: 8,
      color: MUTED,
    }),
    block("amount-box", "field", 430, 228, 324, 28, {
      binding: "amount",
      text: "",
      fontSize: 13,
      bold: true,
      align: "center",
      background: GREEN,
      color: "#ffffff",
    }),

    block("invoice-heading", "text", 40, 292, 240, 16, {
      text: "Invoice Details",
      fontSize: 11,
      bold: true,
      underline: true,
    }),
    block("invoice-table", "table", 40, 314, 714, 104, { binding: "invoiceRows", text: "" }),
    block("installment-heading", "text", 40, 428, 240, 16, {
      text: "Installment Payments",
      fontSize: 11,
      bold: true,
      underline: true,
    }),
    block("installment-table", "table", 40, 450, 714, 146, {
      binding: "installmentRows",
      text: "",
    }),

    block("terms-divider-top", "line", 40, 612, 714, 1, { dashed: true, color: MUTED }),
    block("terms-title", "text", 40, 628, 300, 14, {
      text: "TERMS & CONDITIONS:",
      fontSize: 10,
      bold: true,
    }),
    block("terms-divider-bottom", "line", 40, 780, 714, 1, { dashed: true, color: MUTED }),
    block("signature", "signature", 560, 960, 194, 40, {
      text: "Authorised Signatory",
      fontSize: 9,
      align: "right",
    }),
    block("page-footer", "text", 560, 1070, 194, 14, {
      text: "Page 1 of 1",
      fontSize: 9,
      align: "right",
      color: MUTED,
    }),
  ];

  RECEIPT_ROWS.forEach((row, index) => {
    const y = 136 + index * 28;
    blocks.push(
      block(`label-${row.id}`, "panel", 40, y, 124, 22, {
        text: row.label,
        fontSize: 9,
        bold: true,
        background: LABEL_BG,
      })
    );
    blocks.push(
      block(`value-${row.id}`, "field", 176, y, 170, 22, {
        binding: row.binding,
        text: "",
        fontSize: 9,
        ...(row.bold ? { bold: true } : {}),
      })
    );
  });

  TERMS_LINES.forEach((line, index) => {
    blocks.push(
      block(`terms-${index + 1}`, "text", 40, 652 + index * 18, 714, 14, {
        text: line.text,
        fontSize: 8,
        ...(line.bold ? { bold: true } : {}),
      })
    );
  });

  return { blocks };
};

const INVOICE_DETAIL_ROWS: Array<{ id: string; label: string; binding: string }> = [
  { id: "invoice-no", label: "Invoice #", binding: "invoiceNo" },
  { id: "reference", label: "Refrence #", binding: "referenceNo" },
  { id: "invoice-date", label: "Invoice Date", binding: "invoiceDate" },
  { id: "balance-amount", label: "Balance Amount", binding: "balance" },
  { id: "received-amount", label: "Received Amount", binding: "amountPaid" },
  { id: "place-of-supply", label: "Place of Supply", binding: "placeOfSupply" },
];

const INVOICE_TOTAL_ROWS: Array<{
  id: string;
  label: string;
  binding: string;
  bold?: boolean;
}> = [
  { id: "sub-total", label: "Sub Total", binding: "subtotal", bold: true },
  { id: "adjustment", label: "Adjustment", binding: "adjustment" },
  { id: "grand-total", label: "Grand Total (₹)", binding: "grandTotal", bold: true },
  { id: "paid", label: "Paid              (₹)", binding: "amountPaid" },
  { id: "balance", label: "Balance        (₹)", binding: "balance" },
];

const invoiceLayout = (): DocumentLayout => {
  const blocks: CanvasBlock[] = [
    block("title", "text", 40, 28, 220, 20, { text: "INVOICE", fontSize: 15, bold: true }),
    block("invoice-no-big", "field", 40, 56, 220, 18, {
      binding: "invoiceNo",
      text: "",
      fontSize: 13,
    }),
    block("institute-name", "field", 280, 26, 340, 14, {
      binding: "instituteName",
      text: "",
      fontSize: 9,
      align: "center",
    }),
    block("institute-address", "field", 280, 42, 340, 26, {
      binding: "address",
      text: "",
      fontSize: 8,
      align: "center",
      color: MUTED,
    }),
    block("institute-email", "field", 280, 70, 340, 12, {
      binding: "email",
      text: "",
      fontSize: 8,
      align: "center",
      color: MUTED,
    }),
    block("institute-phone", "field", 280, 84, 340, 12, {
      binding: "phone",
      text: "",
      fontSize: 8,
      align: "center",
      color: MUTED,
    }),
    block("logo", "logo", 600, 22, 160, 76, { binding: "logo" }),
    block("barcode", "barcode", 40, 128, 226, 42, { binding: "invoiceNo" }),

    block("billto-box", "panel", 40, 186, 420, 112, { text: "", background: "#fcfcfc" }),
    block("billto-header", "panel", 40, 186, 420, 22, {
      text: "Bill To",
      fontSize: 9,
      bold: true,
      background: HEADER_BG,
    }),
    block("billto-name", "field", 48, 214, 400, 16, {
      binding: "studentName",
      text: "",
      fontSize: 10,
    }),
    block("billto-address", "field", 48, 248, 400, 28, {
      binding: "studentAddress",
      text: "",
      fontSize: 8,
      color: MUTED,
    }),

    block("invoice-details-box", "panel", 470, 186, 284, 150, {
      text: "",
      background: "#f7f7f7",
    }),
    block("invoice-details-header", "panel", 470, 186, 284, 22, {
      text: "Invoice Details",
      fontSize: 9,
      bold: true,
      background: HEADER_BG,
    }),

    block("item-table", "table", 40, 352, 714, 48, { binding: "itemRows", text: "" }),
    block("item-table-rule", "line", 40, 408, 714, 1, { color: "#9ca3af" }),

    block("transaction-table", "table", 40, 580, 714, 72, {
      binding: "transactionRows",
      text: "",
    }),
  ];

  INVOICE_DETAIL_ROWS.forEach((row, index) => {
    const y = 214 + index * 20;
    blocks.push(
      block(`invdet-label-${row.id}`, "text", 476, y, 120, 16, { text: row.label, fontSize: 8 })
    );
    blocks.push(
      block(`invdet-value-${row.id}`, "field", 600, y, 150, 16, {
        binding: row.binding,
        text: "",
        fontSize: 8,
      })
    );
  });

  INVOICE_TOTAL_ROWS.forEach((row, index) => {
    const y = 426 + index * 28;
    blocks.push(
      block(`total-label-${row.id}`, "text", 478, y, 156, 16, {
        text: row.label,
        fontSize: 10,
        ...(row.bold ? { bold: true } : {}),
      })
    );
    blocks.push(
      block(`total-value-${row.id}`, "field", 640, y, 114, 16, {
        binding: row.binding,
        text: "",
        fontSize: 10,
        align: "right",
        ...(row.bold ? { bold: true } : {}),
      })
    );
    blocks.push(block(`total-rule-${row.id}`, "line", 474, y + 22, 280, 1, { color: "#d1d5db" }));
  });

  return { blocks };
};

const certificateLayout = (): DocumentLayout => {
  const BLUE = "#1B4F9C";
  const INK = "#111827";
  const blocks: CanvasBlock[] = [
    // Double blue frame
    block("frame-outer", "panel", 22, 22, 750, 1079, { background: BLUE, text: "", fontSize: 8 }),
    block("frame-inner-white", "panel", 36, 36, 722, 1051, {
      background: "#FFFFFF",
      text: "",
      fontSize: 8,
    }),
    block("frame-inner", "panel", 48, 48, 698, 1027, { background: BLUE, text: "", fontSize: 8 }),
    block("page-white", "panel", 58, 58, 678, 1007, {
      background: "#FFFFFF",
      text: "",
      fontSize: 8,
    }),

    // Partner logos (upload images on each logo block)
    block("logo-left", "logo", 78, 78, 110, 110, { binding: "logo" }),
    block("logo-right", "logo", 606, 82, 120, 100, { binding: "logo" }),

    // Title ornaments + heading
    block("title-rule-l", "line", 90, 246, 160, 1.5, { color: BLUE }),
    block("title-rule-r", "line", 544, 246, 160, 1.5, { color: BLUE }),
    block("title", "text", 80, 228, 634, 44, {
      text: "CERTIFICATE",
      fontSize: 36,
      bold: true,
      align: "center",
      color: BLUE,
    }),
    block("flourish-mid", "text", 120, 274, 554, 18, {
      text: "- * -",
      fontSize: 12,
      align: "center",
      color: BLUE,
    }),
    block("subtitle", "text", 80, 298, 634, 28, {
      text: "of Merit",
      fontSize: 20,
      align: "center",
      color: BLUE,
    }),

    // Body copy
    block("awarded-to", "text", 120, 360, 554, 24, {
      text: "is awarded to",
      fontSize: 14,
      align: "center",
      color: INK,
    }),
    block("student", "field", 80, 396, 634, 48, {
      binding: "studentName",
      text: "",
      fontSize: 28,
      bold: true,
      align: "center",
      color: INK,
    }),
    block("course-lead", "text", 120, 460, 554, 24, {
      text: "for completing the certificate course on",
      fontSize: 14,
      align: "center",
      color: INK,
    }),
    block("course", "field", 80, 492, 634, 36, {
      binding: "courseName",
      text: "",
      fontSize: 20,
      bold: true,
      align: "center",
      color: INK,
    }),
    block("grade-line", "field", 180, 540, 434, 28, {
      binding: "grade",
      text: "by securing grade",
      fontSize: 14,
      bold: true,
      align: "center",
      inline: true,
      color: INK,
    }),

    // Meta
    block("issue-date", "field", 78, 640, 280, 24, {
      binding: "issueDate",
      text: "",
      fontSize: 12,
      color: INK,
    }),
    block("cert-no", "field", 78, 668, 320, 24, {
      binding: "certificateNo",
      text: "",
      fontSize: 12,
      color: INK,
    }),

    // Signatories
    block("sign-left-name", "text", 78, 760, 200, 18, {
      text: "Dr. Asha N.",
      fontSize: 11,
      bold: true,
      align: "center",
      color: INK,
    }),
    block("sign-left-role", "text", 78, 780, 200, 16, {
      text: "Principal",
      fontSize: 10,
      align: "center",
      color: INK,
    }),
    block("sign-left-org", "text", 78, 798, 200, 16, {
      text: "Sindhi College",
      fontSize: 10,
      align: "center",
      color: INK,
    }),
    block("sign-center-name", "text", 300, 760, 220, 18, {
      text: "Prof. Jayashree J Tambad",
      fontSize: 11,
      bold: true,
      align: "center",
      color: INK,
    }),
    block("sign-center-role", "text", 300, 780, 220, 16, {
      text: "Head of the Department",
      fontSize: 10,
      align: "center",
      color: INK,
    }),
    block("sign-center-org", "text", 300, 798, 220, 16, {
      text: "Sindhi College",
      fontSize: 10,
      align: "center",
      color: INK,
    }),
    block("sign-right", "signature", 540, 720, 180, 56, {
      binding: "signatory",
      text: "",
      fontSize: 10,
      align: "center",
      color: BLUE,
    }),
    block("sign-right-role", "text", 540, 784, 180, 16, {
      text: "Designated Partner",
      fontSize: 10,
      bold: true,
      align: "center",
      color: INK,
    }),
    block("sign-right-org", "text", 540, 802, 180, 28, {
      text: "EDIFY INSTITUTE OF COMPUTERS",
      fontSize: 9,
      bold: true,
      align: "center",
      color: INK,
    }),

    // QR verification
    block("qr", "qr", 580, 860, 100, 100, { binding: "certificateNo" }),
    block("qr-caption", "text", 540, 968, 180, 18, {
      text: "Scan for Verification",
      fontSize: 10,
      align: "center",
      color: INK,
    }),

    // Grade legend
    block("grade-legend", "text", 78, 1020, 638, 28, {
      text: "Grade A+ : >75% , Grade A : >=60% to <=75%, Grade B: >=36% to <=60%",
      fontSize: 9,
      bold: true,
      align: "center",
      color: INK,
    }),
  ];

  return { blocks };
};

const LAYOUTS: Record<ApiDocumentType, () => DocumentLayout> = {
  RECEIPT: receiptLayout,
  INVOICE: invoiceLayout,
  CERTIFICATE: certificateLayout,
};

export const defaultDocumentLayout = (documentType: ApiDocumentType): DocumentLayout =>
  LAYOUTS[documentType]();

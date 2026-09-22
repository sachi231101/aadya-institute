export const CANVAS_PAGE = { width: 794, height: 1123 } as const;

export const CANVAS_SLUGS = ["receipt", "invoice", "certificate"] as const;

export type CanvasSlug = (typeof CANVAS_SLUGS)[number];

export const SLUG_TO_API_TYPE = {
  receipt: "RECEIPT",
  invoice: "INVOICE",
  certificate: "CERTIFICATE",
} as const;

export type ApiDocumentType = (typeof SLUG_TO_API_TYPE)[CanvasSlug];

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
  /** Draw label and value on one line instead of stacked. */
  inline?: boolean;
  dashed?: boolean;
}

export interface CanvasBlock {
  id: string;
  type: CanvasBlockType;
  binding?: string;
  text?: string;
  /** Shown on the page. When omitted, the editor uses the sample for this binding. */
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

export interface DocumentTemplateRecord {
  documentType: ApiDocumentType;
  name: string;
  paperSize: "A4";
  layout: DocumentLayout;
  saved: boolean;
}

export interface PaletteItem {
  key: string;
  type: CanvasBlockType;
  label: string;
  binding?: string;
  text?: string;
  width: number;
  height: number;
  fontSize?: number;
  bold?: boolean;
  align?: CanvasAlign;
  color?: string;
  background?: string;
  underline?: boolean;
  inline?: boolean;
  dashed?: boolean;
}

export const CANVAS_DOCUMENTS: Record<
  CanvasSlug,
  { title: string; description: string; apiType: ApiDocumentType }
> = {
  receipt: {
    title: "Receipt",
    description: "Fee collection receipt shown after a payment is recorded.",
    apiType: "RECEIPT",
  },
  invoice: {
    title: "Invoice",
    description: "Student invoices and other invoices.",
    apiType: "INVOICE",
  },
  certificate: {
    title: "Certificate",
    description: "Certificate of Merit layout with logos, grade, signatures, and QR verification.",
    apiType: "CERTIFICATE",
  },
};

export const isCanvasSlug = (value: string | undefined): value is CanvasSlug =>
  CANVAS_SLUGS.includes(value as CanvasSlug);

export const SAMPLE_VALUES: Record<string, string> = {
  instituteName: "Aadya Institute of Technology",
  address: "#183, 1st Main Road Opp to Old Police Station, Ramamurthynagar Bangalore 560016.",
  phone: "Mobile No 9620222392 / 9964194324",
  email: "Email ID :- aadyainstitution@gmail.com",
  gstNumber: "29AAAAA0000A1Z5",
  receiptNo: "EDIFY5243",
  date: "09 September 2026",
  receivedIn: "Bharath QR",
  chequeNumber: "",
  receivedFee: "3,000.00",
  studentName: "Gagan Kumar S R",
  idCardNo: "AI0926SMD3146RN",
  studentAddress: "#10,8th main,3rd cross, Ramamurthy Nagar, Hoysal Nagar, Bangalore 560016",
  admissionNo: "ADM-1048",
  courseName: "Power BI",
  method: "UPI",
  transactionRef: "UPI-88421",
  amount: "₹ 3,000.00",
  notes: "September installment",
  invoiceNo: "922",
  invoiceDate: "09 September 2026",
  referenceNo: "",
  placeOfSupply: "Karnataka",
  dueDate: "05 Oct 2026",
  subtotal: "100",
  adjustment: "0",
  discount: "0",
  tax: "0",
  grandTotal: "100",
  amountPaid: "100",
  balance: "0",
  terms: "Fees are non-refundable after the first class.",
  certificateNo: "AICSIND2026074",
  issueDate: "09-May-2026",
  grade: "B",
  duration: "6 Months",
  signatory: "Authorised Signatory",
};

export interface TableSample {
  columns: string[];
  align?: CanvasAlign[];
  rows: string[][];
  totals?: string[];
}

export const TABLE_SAMPLES: Record<string, TableSample> = {
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
    rows: [
      ["9213", "AED13 - SAP Material Management", "Course Fees", "09 Sep 2026", "2500", "2500"],
      ["9213", "AED13 - SAP Material Management", "Registration Fees", "09 Sep 2026", "500", "500"],
    ],
  },
  installmentRows: {
    columns: ["Due Date", "Due Fee", "Received Fee", "Balance Fee", "Payment Details"],
    align: ["left", "right", "right", "right", "center"],
    rows: [
      ["09 Sep 2026", "500", "500", "0", "EDIFY5243 09 Sep 26 3000 Bharath QR"],
      ["09 Sep 2026", "2500", "2500", "0", "EDIFY5243 09 Sep 26 3000 Bharath QR"],
      ["30 Sep 2026", "14500", "0", "14500", ""],
      ["10 Oct 2026", "14500", "", "14500", ""],
    ],
    totals: ["", "32000", "3000", "29000", ""],
  },
  feeLines: {
    columns: ["Particulars", "Amount"],
    align: ["left", "right"],
    rows: [
      ["Tuition fee", "₹10,000.00"],
      ["Lab fee", "₹2,500.00"],
    ],
  },
  lineItems: {
    columns: ["Item", "Qty", "Rate", "Amount"],
    align: ["left", "center", "right", "right"],
    rows: [
      ["Course fee", "1", "₹12,000.00", "₹12,000.00"],
      ["Study kit", "1", "₹3,000.00", "₹3,000.00"],
    ],
  },
  itemRows: {
    columns: ["Item Details", "HSN/SACCode", "Qty", "Rate", "Total"],
    align: ["left", "center", "right", "right", "right"],
    rows: [["Blue Book", "", "1", "100", "100"]],
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
    rows: [["1", "09 Sep 2026", "Bharath QR", "", "100", "0", "100"]],
    totals: ["", "", "", "", "", "Total", "100"],
  },
};

const LABEL_BG = "#f1f2f4";
const HEADER_BG = "#e5e7eb";
const GREEN = "#22c55e";
const MUTED = "#374151";

const commonPalette: PaletteItem[] = [
  { key: "logo", type: "logo", label: "Logo", binding: "logo", width: 116, height: 58 },
  { key: "panel", type: "panel", label: "Label box", text: "Label", width: 124, height: 22, fontSize: 9, bold: true, background: LABEL_BG },
  { key: "line", type: "line", label: "Line", width: 714, height: 1 },
  { key: "dashed-line", type: "line", label: "Dashed line", width: 714, height: 1, dashed: true },
  { key: "heading", type: "text", label: "Heading", text: "Heading", width: 240, height: 16, fontSize: 11, bold: true, underline: true },
  { key: "custom-text", type: "text", label: "Custom text", text: "Text", width: 320, height: 16, fontSize: 9 },
  { key: "signature", type: "signature", label: "Signature", text: "Authorised Signatory", width: 194, height: 40, fontSize: 9, align: "right" },
];

const headerFields: PaletteItem[] = [
  { key: "instituteName", type: "field", label: "Institute name", binding: "instituteName", text: "", width: 320, height: 14, fontSize: 9 },
  { key: "address", type: "field", label: "Address", binding: "address", text: "", width: 320, height: 24, fontSize: 8, color: MUTED },
  { key: "email", type: "field", label: "Email", binding: "email", text: "", width: 320, height: 12, fontSize: 8, color: MUTED },
  { key: "phone", type: "field", label: "Phone", binding: "phone", text: "", width: 320, height: 12, fontSize: 8, color: MUTED },
  { key: "gstNumber", type: "field", label: "GSTIN", binding: "gstNumber", text: "GSTIN", width: 280, height: 14, fontSize: 8, color: MUTED, inline: true },
];

export const DOCUMENT_PALETTE: Record<CanvasSlug, PaletteItem[]> = {
  receipt: [
    ...commonPalette,
    ...headerFields,
    { key: "barcode", type: "barcode", label: "Barcode", binding: "receiptNo", width: 198, height: 42 },
    { key: "receiptNo", type: "field", label: "Receipt number", binding: "receiptNo", text: "", width: 150, height: 22, fontSize: 9, bold: true },
    { key: "date", type: "field", label: "Receipt date", binding: "date", text: "", width: 170, height: 22, fontSize: 9 },
    { key: "receivedIn", type: "field", label: "Received in", binding: "receivedIn", text: "", width: 170, height: 22, fontSize: 9 },
    { key: "chequeNumber", type: "field", label: "Cheque / transaction number", binding: "chequeNumber", text: "", width: 170, height: 22, fontSize: 9 },
    { key: "receivedFee", type: "field", label: "Received fee", binding: "receivedFee", text: "", width: 170, height: 22, fontSize: 9 },
    { key: "studentName", type: "field", label: "Received from", binding: "studentName", text: "", width: 316, height: 14, fontSize: 9, bold: true },
    { key: "idCardNo", type: "field", label: "ID card number", binding: "idCardNo", text: "ID Card No. :", width: 316, height: 14, fontSize: 9, inline: true },
    { key: "studentAddress", type: "field", label: "Student address", binding: "studentAddress", text: "", width: 316, height: 30, fontSize: 8, color: MUTED },
    { key: "amount", type: "field", label: "Amount box", binding: "amount", text: "", width: 324, height: 28, fontSize: 13, bold: true, align: "center", background: GREEN, color: "#ffffff" },
    { key: "invoiceRows", type: "table", label: "Invoice details table", binding: "invoiceRows", text: "", width: 714, height: 104 },
    { key: "installmentRows", type: "table", label: "Installment payments table", binding: "installmentRows", text: "", width: 714, height: 146 },
    { key: "courseName", type: "field", label: "Course", binding: "courseName", text: "Course", width: 340, height: 22, fontSize: 9, inline: true },
    { key: "admissionNo", type: "field", label: "Admission number", binding: "admissionNo", text: "Admission No", width: 300, height: 22, fontSize: 9, inline: true },
    { key: "method", type: "field", label: "Payment mode", binding: "method", text: "Payment mode", width: 300, height: 22, fontSize: 9, inline: true },
    { key: "transactionRef", type: "field", label: "Reference", binding: "transactionRef", text: "Reference", width: 300, height: 22, fontSize: 9, inline: true },
    { key: "feeLines", type: "table", label: "Fee lines table", binding: "feeLines", text: "", width: 714, height: 80 },
    { key: "notes", type: "field", label: "Notes", binding: "notes", text: "Notes", width: 680, height: 30, fontSize: 8, color: MUTED },
  ],
  invoice: [
    ...commonPalette,
    ...headerFields,
    { key: "barcode", type: "barcode", label: "Barcode", binding: "invoiceNo", width: 226, height: 42 },
    { key: "invoiceNo", type: "field", label: "Invoice number", binding: "invoiceNo", text: "", width: 200, height: 18, fontSize: 13 },
    { key: "invoiceDate", type: "field", label: "Invoice date", binding: "invoiceDate", text: "", width: 150, height: 16, fontSize: 9 },
    { key: "referenceNo", type: "field", label: "Reference number", binding: "referenceNo", text: "", width: 150, height: 16, fontSize: 9 },
    { key: "placeOfSupply", type: "field", label: "Place of supply", binding: "placeOfSupply", text: "", width: 150, height: 16, fontSize: 9 },
    { key: "dueDate", type: "field", label: "Due date", binding: "dueDate", text: "", width: 150, height: 16, fontSize: 9 },
    { key: "studentName", type: "field", label: "Bill to name", binding: "studentName", text: "", width: 400, height: 16, fontSize: 10 },
    { key: "studentAddress", type: "field", label: "Bill to address", binding: "studentAddress", text: "", width: 400, height: 28, fontSize: 8, color: MUTED },
    { key: "admissionNo", type: "field", label: "Admission number", binding: "admissionNo", text: "Admission No", width: 300, height: 16, fontSize: 9, inline: true },
    { key: "courseName", type: "field", label: "Course", binding: "courseName", text: "Course", width: 340, height: 16, fontSize: 9, inline: true },
    { key: "itemRows", type: "table", label: "Item details table", binding: "itemRows", text: "", width: 714, height: 48 },
    { key: "transactionRows", type: "table", label: "Transactions table", binding: "transactionRows", text: "", width: 714, height: 72 },
    { key: "lineItems", type: "table", label: "Line items table", binding: "lineItems", text: "", width: 714, height: 80 },
    { key: "subtotal", type: "field", label: "Subtotal", binding: "subtotal", text: "", width: 114, height: 16, fontSize: 10, align: "right" },
    { key: "adjustment", type: "field", label: "Adjustment", binding: "adjustment", text: "", width: 114, height: 16, fontSize: 10, align: "right" },
    { key: "discount", type: "field", label: "Discount", binding: "discount", text: "", width: 114, height: 16, fontSize: 10, align: "right" },
    { key: "tax", type: "field", label: "Tax", binding: "tax", text: "", width: 114, height: 16, fontSize: 10, align: "right" },
    { key: "grandTotal", type: "field", label: "Grand total", binding: "grandTotal", text: "", width: 114, height: 16, fontSize: 10, bold: true, align: "right" },
    { key: "amountPaid", type: "field", label: "Amount paid", binding: "amountPaid", text: "", width: 114, height: 16, fontSize: 10, align: "right" },
    { key: "balance", type: "field", label: "Balance", binding: "balance", text: "", width: 114, height: 16, fontSize: 10, align: "right" },
    { key: "terms", type: "field", label: "Terms", binding: "terms", text: "Terms", width: 680, height: 40, fontSize: 8, color: MUTED },
    { key: "notes", type: "field", label: "Notes", binding: "notes", text: "Notes", width: 680, height: 30, fontSize: 8, color: MUTED },
  ],
  certificate: [
    { key: "logo", type: "logo", label: "Logo", binding: "logo", width: 110, height: 110 },
    { key: "panel", type: "panel", label: "Panel / frame", text: "", width: 200, height: 40, background: "#1B4F9C" },
    { key: "line", type: "line", label: "Line", width: 354, height: 2 },
    { key: "heading", type: "text", label: "Heading", text: "CERTIFICATE", width: 634, height: 44, fontSize: 36, bold: true, align: "center", color: "#1B4F9C" },
    { key: "custom-text", type: "text", label: "Custom text", text: "is awarded to", width: 554, height: 24, fontSize: 14, align: "center" },
    { key: "studentName", type: "field", label: "Student", binding: "studentName", text: "", width: 634, height: 48, fontSize: 28, bold: true, align: "center" },
    { key: "courseName", type: "field", label: "Course", binding: "courseName", text: "", width: 634, height: 36, fontSize: 20, bold: true, align: "center" },
    { key: "grade", type: "field", label: "Grade", binding: "grade", text: "by securing grade", width: 434, height: 28, fontSize: 14, bold: true, align: "center", inline: true },
    { key: "issueDate", type: "field", label: "Issue date", binding: "issueDate", text: "", width: 280, height: 24, fontSize: 12 },
    { key: "certificateNo", type: "field", label: "Certificate number", binding: "certificateNo", text: "", width: 320, height: 24, fontSize: 12 },
    { key: "signatory", type: "signature", label: "Signatory", binding: "signatory", text: "", width: 180, height: 56 },
    { key: "qr", type: "qr", label: "QR code", binding: "certificateNo", width: 100, height: 100 },
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

const placed = (
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
  { text: "RULES AND REGULATION: All students must follow all the rules and regulations of the Institute." },
  { text: "NON REFUNDABLE RECEIPT: Fee / Amount Once Paid is Non Refundable under any circumstances." },
  { text: "EDIFY is now DIGITAL & ONLINE: EDIFY is now Online - Goto PLAY STORE download ZENOXERP app and install it on Mobile." },
  { text: "Login using your Mobile number. Now you can upload your Resume, and apply for JOB online." },
  { text: "Fee is inclusive of all Taxes." },
  { text: "If students fail to pay the fee within the due date, then Rs. 10/- per day late payment charges will apply.", bold: true },
];

const receiptLayout = (): DocumentLayout => {
  const blocks: CanvasBlock[] = [
    placed("logo", "logo", 40, 26, 116, 58, { binding: "logo" }),
    placed("institute-name", "field", 172, 28, 320, 14, { binding: "instituteName", text: "", fontSize: 9 }),
    placed("institute-address", "field", 172, 44, 320, 24, { binding: "address", text: "", fontSize: 8, color: MUTED }),
    placed("institute-email", "field", 172, 70, 320, 12, { binding: "email", text: "", fontSize: 8, color: MUTED }),
    placed("institute-phone", "field", 172, 84, 320, 12, { binding: "phone", text: "", fontSize: 8, color: MUTED }),
    placed("receipt-tag", "field", 520, 24, 234, 16, {
      binding: "receiptNo",
      text: "Receipt #",
      fontSize: 11,
      bold: true,
      color: "#16a34a",
      inline: true,
    }),
    placed("barcode", "barcode", 556, 44, 198, 42, { binding: "receiptNo" }),

    placed("received-from-header", "panel", 430, 136, 324, 18, {
      text: "Received From :",
      fontSize: 9,
      bold: true,
      background: HEADER_BG,
    }),
    placed("rf-name", "field", 434, 158, 316, 14, { binding: "studentName", text: "", fontSize: 9 }),
    placed("rf-id", "field", 434, 174, 316, 14, { binding: "idCardNo", text: "ID Card No. :", fontSize: 9, inline: true }),
    placed("rf-address", "field", 434, 194, 316, 30, { binding: "studentAddress", text: "", fontSize: 8, color: MUTED }),
    placed("amount-box", "field", 430, 228, 324, 28, {
      binding: "amount",
      text: "",
      fontSize: 13,
      bold: true,
      align: "center",
      background: GREEN,
      color: "#ffffff",
    }),

    placed("invoice-heading", "text", 40, 292, 240, 16, {
      text: "Invoice Details",
      fontSize: 11,
      bold: true,
      underline: true,
    }),
    placed("invoice-table", "table", 40, 314, 714, 104, { binding: "invoiceRows", text: "" }),
    placed("installment-heading", "text", 40, 428, 240, 16, {
      text: "Installment Payments",
      fontSize: 11,
      bold: true,
      underline: true,
    }),
    placed("installment-table", "table", 40, 450, 714, 146, { binding: "installmentRows", text: "" }),

    placed("terms-divider-top", "line", 40, 612, 714, 1, { dashed: true, color: MUTED }),
    placed("terms-title", "text", 40, 628, 300, 14, { text: "TERMS & CONDITIONS:", fontSize: 10, bold: true }),
    placed("terms-divider-bottom", "line", 40, 780, 714, 1, { dashed: true, color: MUTED }),
    placed("signature", "signature", 560, 960, 194, 40, { text: "Authorised Signatory", fontSize: 9, align: "right" }),
    placed("page-footer", "text", 560, 1070, 194, 14, { text: "Page 1 of 1", fontSize: 9, align: "right", color: MUTED }),
  ];

  RECEIPT_ROWS.forEach((row, index) => {
    const y = 136 + index * 28;
    blocks.push(
      placed(`label-${row.id}`, "panel", 40, y, 124, 22, {
        text: row.label,
        fontSize: 9,
        bold: true,
        background: LABEL_BG,
      })
    );
    blocks.push(
      placed(`value-${row.id}`, "field", 176, y, 170, 22, {
        binding: row.binding,
        text: "",
        fontSize: 9,
        ...(row.bold ? { bold: true } : {}),
      })
    );
  });

  TERMS_LINES.forEach((line, index) => {
    blocks.push(
      placed(`terms-${index + 1}`, "text", 40, 652 + index * 18, 714, 14, {
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
    placed("title", "text", 40, 28, 220, 20, { text: "INVOICE", fontSize: 15, bold: true }),
    placed("invoice-no-big", "field", 40, 56, 220, 18, { binding: "invoiceNo", text: "", fontSize: 13 }),
    placed("institute-name", "field", 280, 26, 340, 14, { binding: "instituteName", text: "", fontSize: 9, align: "center" }),
    placed("institute-address", "field", 280, 42, 340, 26, { binding: "address", text: "", fontSize: 8, align: "center", color: MUTED }),
    placed("institute-email", "field", 280, 70, 340, 12, { binding: "email", text: "", fontSize: 8, align: "center", color: MUTED }),
    placed("institute-phone", "field", 280, 84, 340, 12, { binding: "phone", text: "", fontSize: 8, align: "center", color: MUTED }),
    placed("logo", "logo", 600, 22, 160, 76, { binding: "logo" }),
    placed("barcode", "barcode", 40, 128, 226, 42, { binding: "invoiceNo" }),

    placed("billto-box", "panel", 40, 186, 420, 112, { text: "", background: "#fcfcfc" }),
    placed("billto-header", "panel", 40, 186, 420, 22, { text: "Bill To", fontSize: 9, bold: true, background: HEADER_BG }),
    placed("billto-name", "field", 48, 214, 400, 16, { binding: "studentName", text: "", fontSize: 10 }),
    placed("billto-address", "field", 48, 248, 400, 28, { binding: "studentAddress", text: "", fontSize: 8, color: MUTED }),

    placed("invoice-details-box", "panel", 470, 186, 284, 150, { text: "", background: "#f7f7f7" }),
    placed("invoice-details-header", "panel", 470, 186, 284, 22, { text: "Invoice Details", fontSize: 9, bold: true, background: HEADER_BG }),

    placed("item-table", "table", 40, 352, 714, 48, { binding: "itemRows", text: "" }),
    placed("item-table-rule", "line", 40, 408, 714, 1, { color: "#9ca3af" }),

    placed("transaction-table", "table", 40, 580, 714, 72, { binding: "transactionRows", text: "" }),
  ];

  INVOICE_DETAIL_ROWS.forEach((row, index) => {
    const y = 214 + index * 20;
    blocks.push(
      placed(`invdet-label-${row.id}`, "text", 476, y, 120, 16, { text: row.label, fontSize: 8 })
    );
    blocks.push(
      placed(`invdet-value-${row.id}`, "field", 600, y, 150, 16, {
        binding: row.binding,
        text: "",
        fontSize: 8,
      })
    );
  });

  INVOICE_TOTAL_ROWS.forEach((row, index) => {
    const y = 426 + index * 28;
    blocks.push(
      placed(`total-label-${row.id}`, "text", 478, y, 156, 16, {
        text: row.label,
        fontSize: 10,
        ...(row.bold ? { bold: true } : {}),
      })
    );
    blocks.push(
      placed(`total-value-${row.id}`, "field", 640, y, 114, 16, {
        binding: row.binding,
        text: "",
        fontSize: 10,
        align: "right",
        ...(row.bold ? { bold: true } : {}),
      })
    );
    blocks.push(
      placed(`total-rule-${row.id}`, "line", 474, y + 22, 280, 1, { color: "#d1d5db" })
    );
  });

  return { blocks };
};

const certificateLayout = (): DocumentLayout => {
  const BLUE = "#1B4F9C";
  const INK = "#111827";
  return {
    blocks: [
      placed("frame-outer", "panel", 22, 22, 750, 1079, { background: BLUE, text: "", fontSize: 8 }),
      placed("frame-inner-white", "panel", 36, 36, 722, 1051, {
        background: "#FFFFFF",
        text: "",
        fontSize: 8,
      }),
      placed("frame-inner", "panel", 48, 48, 698, 1027, { background: BLUE, text: "", fontSize: 8 }),
      placed("page-white", "panel", 58, 58, 678, 1007, {
        background: "#FFFFFF",
        text: "",
        fontSize: 8,
      }),
      placed("logo-left", "logo", 78, 78, 110, 110, { binding: "logo" }),
      placed("logo-right", "logo", 606, 82, 120, 100, { binding: "logo" }),
      placed("title-rule-l", "line", 90, 246, 160, 1.5, { color: BLUE }),
      placed("title-rule-r", "line", 544, 246, 160, 1.5, { color: BLUE }),
      placed("title", "text", 80, 228, 634, 44, {
        text: "CERTIFICATE",
        fontSize: 36,
        bold: true,
        align: "center",
        color: BLUE,
      }),
      placed("flourish-mid", "text", 120, 274, 554, 18, {
        text: "- * -",
        fontSize: 12,
        align: "center",
        color: BLUE,
      }),
      placed("subtitle", "text", 80, 298, 634, 28, {
        text: "of Merit",
        fontSize: 20,
        align: "center",
        color: BLUE,
      }),
      placed("awarded-to", "text", 120, 360, 554, 24, {
        text: "is awarded to",
        fontSize: 14,
        align: "center",
        color: INK,
      }),
      placed("student", "field", 80, 396, 634, 48, {
        binding: "studentName",
        text: "",
        fontSize: 28,
        bold: true,
        align: "center",
        color: INK,
      }),
      placed("course-lead", "text", 120, 460, 554, 24, {
        text: "for completing the certificate course on",
        fontSize: 14,
        align: "center",
        color: INK,
      }),
      placed("course", "field", 80, 492, 634, 36, {
        binding: "courseName",
        text: "",
        fontSize: 20,
        bold: true,
        align: "center",
        color: INK,
      }),
      placed("grade-line", "field", 180, 540, 434, 28, {
        binding: "grade",
        text: "by securing grade",
        fontSize: 14,
        bold: true,
        align: "center",
        inline: true,
        color: INK,
      }),
      placed("issue-date", "field", 78, 640, 280, 24, {
        binding: "issueDate",
        text: "",
        fontSize: 12,
        color: INK,
      }),
      placed("cert-no", "field", 78, 668, 320, 24, {
        binding: "certificateNo",
        text: "",
        fontSize: 12,
        color: INK,
      }),
      placed("sign-left-name", "text", 78, 760, 200, 18, {
        text: "Dr. Asha N.",
        fontSize: 11,
        bold: true,
        align: "center",
        color: INK,
      }),
      placed("sign-left-role", "text", 78, 780, 200, 16, {
        text: "Principal",
        fontSize: 10,
        align: "center",
        color: INK,
      }),
      placed("sign-left-org", "text", 78, 798, 200, 16, {
        text: "Sindhi College",
        fontSize: 10,
        align: "center",
        color: INK,
      }),
      placed("sign-center-name", "text", 300, 760, 220, 18, {
        text: "Prof. Jayashree J Tambad",
        fontSize: 11,
        bold: true,
        align: "center",
        color: INK,
      }),
      placed("sign-center-role", "text", 300, 780, 220, 16, {
        text: "Head of the Department",
        fontSize: 10,
        align: "center",
        color: INK,
      }),
      placed("sign-center-org", "text", 300, 798, 220, 16, {
        text: "Sindhi College",
        fontSize: 10,
        align: "center",
        color: INK,
      }),
      placed("sign-right", "signature", 540, 720, 180, 56, {
        binding: "signatory",
        text: "",
        fontSize: 10,
        align: "center",
        color: BLUE,
      }),
      placed("sign-right-role", "text", 540, 784, 180, 16, {
        text: "Designated Partner",
        fontSize: 10,
        bold: true,
        align: "center",
        color: INK,
      }),
      placed("sign-right-org", "text", 540, 802, 180, 28, {
        text: "EDIFY INSTITUTE OF COMPUTERS",
        fontSize: 9,
        bold: true,
        align: "center",
        color: INK,
      }),
      placed("qr", "qr", 580, 860, 100, 100, { binding: "certificateNo" }),
      placed("qr-caption", "text", 540, 968, 180, 18, {
        text: "Scan for Verification",
        fontSize: 10,
        align: "center",
        color: INK,
      }),
      placed("grade-legend", "text", 78, 1020, 638, 28, {
        text: "Grade A+ : >75% , Grade A : >=60% to <=75%, Grade B: >=36% to <=60%",
        fontSize: 9,
        bold: true,
        align: "center",
        color: INK,
      }),
    ],
  };
};

const defaultLayouts: Record<CanvasSlug, () => DocumentLayout> = {
  receipt: receiptLayout,
  invoice: invoiceLayout,
  certificate: certificateLayout,
};

export const defaultDocumentLayout = (slug: CanvasSlug): DocumentLayout => defaultLayouts[slug]();

export const blockFromPalette = (item: PaletteItem, id: string, x: number, y: number): CanvasBlock =>
  placed(id, item.type, x, y, item.width, item.height, {
    binding: item.binding,
    text: item.text,
    fontSize: item.fontSize,
    bold: item.bold,
    align: item.align,
    color: item.color,
    background: item.background,
    underline: item.underline,
    inline: item.inline,
    dashed: item.dashed,
  });

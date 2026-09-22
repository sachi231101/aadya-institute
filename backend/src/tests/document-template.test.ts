import { describe, test } from "node:test";
import assert from "node:assert";
import fs from "fs";
import os from "os";
import path from "path";
import { API_DOCUMENT_TYPES } from "../modules/document-templates/document-template.types";
import {
  DOCUMENT_BINDINGS,
  defaultDocumentLayout,
} from "../modules/document-templates/document-template.defaults";
import {
  assertLayoutBindings,
  documentLayoutSchema,
} from "../modules/document-templates/document-template.validation";
import {
  TABLE_COLUMNS,
  renderBarcodePng,
  renderDocumentPdf,
  renderQrPng,
  resolveBlockValue,
  resolveLogoSource,
} from "../modules/document-templates/document-render.service";
import type {
  CanvasBlock,
  DocumentLayout,
  DocumentRenderData,
} from "../modules/document-templates/document-template.types";

describe("document template defaults", () => {
  for (const documentType of API_DOCUMENT_TYPES) {
    test(`${documentType} starter layout is valid`, () => {
      const layout = defaultDocumentLayout(documentType);
      const parsed = documentLayoutSchema.safeParse(layout);
      assert.equal(parsed.success, true, parsed.success ? "" : parsed.error.message);
      assert.equal(assertLayoutBindings(documentType, layout), null);
      assert.ok(layout.blocks.length > 0);
    });
  }

  test("rejects a receipt field that belongs on an invoice", () => {
    const layout = defaultDocumentLayout("RECEIPT");
    layout.blocks.push({
      id: "due",
      type: "field",
      binding: "dueDate",
      x: 10,
      y: 10,
      width: 100,
      height: 24,
      style: { fontSize: 12, bold: false, align: "left", color: "#111827" },
    });
    assert.ok(assertLayoutBindings("RECEIPT", layout));
    assert.ok(DOCUMENT_BINDINGS.INVOICE.includes("dueDate"));
    assert.equal(DOCUMENT_BINDINGS.RECEIPT.includes("dueDate"), false);
  });

  test("every table binding in a starter layout has column widths", () => {
    for (const documentType of API_DOCUMENT_TYPES) {
      for (const block of defaultDocumentLayout(documentType).blocks) {
        if (block.type !== "table") continue;
        assert.ok(
          block.binding && TABLE_COLUMNS[block.binding],
          `${documentType} table ${block.id} has no column spec`
        );
      }
    }
  });
});

const isPdf = (buffer: Buffer): boolean =>
  buffer.length > 800 && buffer.subarray(0, 5).toString() === "%PDF-";

const blockOf = (partial: Partial<CanvasBlock>): CanvasBlock => ({
  id: "block",
  type: "field",
  x: 40,
  y: 40,
  width: 200,
  height: 20,
  style: { fontSize: 10, bold: false, align: "left", color: "#111827" },
  ...partial,
});

describe("document renderer", () => {
  const sampleData: DocumentRenderData = {
    instituteName: "Aadya Institute of Technology",
    address: "#183, 1st Main Road, Bangalore 560016",
    receiptNo: "EDIFY5243",
    invoiceNo: "922",
    studentName: "Kavya Vikas",
    amount: "\u20B9 3,000.00",
    invoiceRows: { rows: [["9213", "SAP", "Course Fees", "09 Sep 2026", "2500", "2500"]] },
    installmentRows: {
      rows: [["09 Sep 2026", "500", "500", "0", "EDIFY5243"]],
      totals: ["", "32000", "3000", "29000", ""],
    },
    itemRows: { rows: [["Blue Book", "", "1", "100", "100"]] },
    transactionRows: {
      rows: [["1", "09 Sep 2026", "Bharath QR", "", "100", "0", "100"]],
      totals: ["", "", "", "", "", "Total", "100"],
    },
  };

  for (const documentType of API_DOCUMENT_TYPES) {
    test(`renders ${documentType} starter layout to a PDF`, async () => {
      const buffer = await renderDocumentPdf(defaultDocumentLayout(documentType), sampleData);
      assert.ok(isPdf(buffer), `${documentType} did not produce a PDF`);
    });
  }

  test("renders the rupee sign without dropping the amount", async () => {
    const layout: DocumentLayout = {
      blocks: [blockOf({ binding: "amount", text: "" })],
    };
    const buffer = await renderDocumentPdf(layout, sampleData);
    assert.ok(isPdf(buffer));
  });

  test("block value overrides the bound value", () => {
    const bound = blockOf({ binding: "studentName", text: "" });
    const overridden = blockOf({ binding: "studentName", value: "Poornima", text: "" });
    assert.equal(resolveBlockValue(bound, sampleData), "Kavya Vikas");
    assert.equal(resolveBlockValue(overridden, sampleData), "Poornima");
  });

  test("an unknown binding renders blank instead of failing", async () => {
    const block = blockOf({ binding: "notAField", text: "" });
    assert.equal(resolveBlockValue(block, sampleData), "");
    const buffer = await renderDocumentPdf({ blocks: [block] }, sampleData);
    assert.ok(isPdf(buffer));
  });

  test("a missing logo file does not fail the document", async () => {
    const layout: DocumentLayout = {
      blocks: [blockOf({ type: "logo", binding: "logo", width: 100, height: 50 })],
    };
    const buffer = await renderDocumentPdf(layout, { logo: "/document-logos/missing.png" });
    assert.ok(isPdf(buffer));
  });

  test("canvas-uploaded logo in block.text is preferred over organization logo", () => {
    const prev = process.env.LOCAL_UPLOADS_DIR;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aadya-logo-"));
    process.env.LOCAL_UPLOADS_DIR = tmp;
    try {
      const dir = path.join(tmp, "document-logos");
      fs.mkdirSync(dir, { recursive: true });
      const filename = "logo-canvas.png";
      fs.writeFileSync(path.join(dir, filename), Buffer.from([137, 80, 78, 71]));
      const block = blockOf({
        type: "logo",
        binding: "logo",
        text: `/api/v1/administration/document-logos/${filename}`,
        width: 100,
        height: 50,
      });
      const resolved = resolveLogoSource(block, { logo: "/logos/org.png" });
      assert.equal(resolved, path.resolve(tmp, "document-logos", filename));
    } finally {
      process.env.LOCAL_UPLOADS_DIR = prev;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("renders a scannable Code128 barcode PNG", async () => {
    const png = await renderBarcodePng("EDIFY5243");
    assert.ok(png);
    assert.equal(png!.subarray(0, 4).toString("hex"), "89504e47");
  });

  test("embeds a Code128 barcode into the PDF", async () => {
    const layout: DocumentLayout = {
      blocks: [
        blockOf({
          type: "barcode",
          binding: "receiptNo",
          width: 198,
          height: 42,
        }),
      ],
    };
    const buffer = await renderDocumentPdf(layout, { receiptNo: "RCP/2026/0021" });
    assert.ok(isPdf(buffer));
    assert.ok(buffer.length > 1200);
  });

  test("renders a scannable QR PNG", async () => {
    const png = await renderQrPng("AICSIND2026074");
    assert.ok(png);
    assert.equal(png!.subarray(0, 4).toString("hex"), "89504e47");
  });

  test("embeds a QR code into the certificate PDF", async () => {
    const layout: DocumentLayout = {
      blocks: [
        blockOf({
          type: "qr",
          binding: "certificateNo",
          width: 100,
          height: 100,
        }),
      ],
    };
    const buffer = await renderDocumentPdf(layout, { certificateNo: "AICSIND2026074" });
    assert.ok(isPdf(buffer));
    assert.ok(buffer.length > 1200);
  });
});

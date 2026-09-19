import ExcelJS from "exceljs";
import { AppError } from "../../middlewares/error.middleware";

/** Canonical lead import field → accepted header aliases (normalized). */
const LEAD_HEADER_ALIASES: Record<string, string> = {
  name: "name",
  phonenumber: "phoneNumber",
  phone: "phoneNumber",
  email: "email",
  interestedin: "interestedIn",
  branchname: "branchName",
  branchid: "branchId",
  source: "source",
};

export const DEFAULT_LEAD_INTERESTED_IN = "General enquiry";

export const LEADS_IMPORT_TEMPLATE_CSV =
  "Name,Phone Number,Email,Interested In,Branch Name,Source\n";

/** Normalize a CSV/Excel header for alias lookup. */
export function normalizeImportHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/**
 * Map raw row keys (any alias / case) onto canonical lead import fields.
 * Unknown headers are dropped.
 */
export function canonicalizeLeadImportRow(
  row: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const canonical = LEAD_HEADER_ALIASES[normalizeImportHeader(rawKey)];
    if (!canonical) continue;
    // Prefer first non-empty value if duplicate aliases appear
    if (out[canonical]?.trim() && !value?.trim()) continue;
    if (!out[canonical]?.trim()) {
      out[canonical] = value ?? "";
    }
  }
  return out;
}

export function applyLeadImportDefaults(
  row: Record<string, string>
): Record<string, string> {
  return {
    ...row,
    interestedIn: row.interestedIn?.trim() || DEFAULT_LEAD_INTERESTED_IN,
  };
}

/**
 * Resolve Branch Name or branch code → branchId (case-insensitive).
 * Legacy branchId kept if present. Map keys should include both names and codes.
 */
export function resolveLeadBranchId(
  row: Record<string, string>,
  branchNameToId: Map<string, string>,
  allowedBranchIds: Set<string>
): { branchId?: string; error?: string } {
  const legacyId = row.branchId?.trim();
  if (legacyId) {
    if (!allowedBranchIds.has(legacyId)) {
      return { error: "branchId is not in this institute" };
    }
    return { branchId: legacyId };
  }

  const branchName = row.branchName?.trim();
  if (!branchName) {
    return { error: "Branch Name or branchId is required" };
  }

  const resolved = branchNameToId.get(branchName.toLowerCase());
  if (!resolved) {
    return {
      error: `Unknown Branch Name: ${branchName} (must match an existing branch name or code exactly)`,
    };
  }
  return { branchId: resolved };
}

/**
 * Normalize phone values coming from Excel/CSV.
 * Excel often stores mobiles as numbers (or scientific notation like 9.8765E+9).
 */
export function normalizeImportPhone(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";

  if (/e[+-]?\d+$/i.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isFinite(n)) return String(Math.round(n));
  }

  if (/^\d+\.0+$/.test(trimmed)) {
    return trimmed.replace(/\.0+$/, "");
  }

  return trimmed;
}

export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseCsvText(csv: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new AppError("CSV is empty", 400);
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    // Prefer integer string for phone-like numbers (avoid 9.87654321e+9)
    if (Number.isInteger(value) || Math.abs(value) >= 1e9) {
      return String(Math.round(value));
    }
    return String(value).trim();
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    if ("text" in value && typeof (value as { text?: string }).text === "string") {
      return (value as { text: string }).text.trim();
    }
    if ("result" in value) {
      const result = (value as { result?: ExcelJS.CellValue }).result;
      return cellToString(result ?? null);
    }
    if ("richText" in value && Array.isArray((value as { richText: Array<{ text: string }> }).richText)) {
      return (value as { richText: Array<{ text: string }> }).richText
        .map((t) => t.text)
        .join("")
        .trim();
    }
  }
  return String(value).trim();
}

export async function parseXlsxBuffer(buffer: Buffer): Promise<{
  headers: string[];
  rows: Record<string, string>[];
}> {
  const workbook = new ExcelJS.Workbook();
  // exceljs accepts Buffer in Node
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new AppError("Excel file has no worksheets", 400);
  }

  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cellToString(cell.value);
    });
    // Fill holes from sparse cells
    for (let i = 0; i < values.length; i++) {
      if (values[i] == null) values[i] = "";
    }
    matrix.push(values);
  });

  if (matrix.length === 0) {
    throw new AppError("Excel sheet is empty", 400);
  }

  const headers = matrix[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const values = matrix[i];
    const row: Record<string, string> = {};
    let hasAny = false;
    headers.forEach((header, idx) => {
      const v = (values[idx] ?? "").trim();
      row[header] = v;
      if (v) hasAny = true;
    });
    if (hasAny) rows.push(row);
  }

  return { headers, rows };
}

export function isXlsxFileName(fileName?: string | null): boolean {
  return Boolean(fileName && /\.xlsx$/i.test(fileName.trim()));
}

/**
 * Load rows from either CSV text or base64 Excel payload.
 */
export async function loadImportRows(input: {
  csv?: string;
  fileBase64?: string;
  fileName?: string;
}): Promise<{ headers: string[]; rows: Record<string, string>[]; source: "csv" | "xlsx" }> {
  const wantsXlsx =
    Boolean(input.fileBase64?.trim()) &&
    (isXlsxFileName(input.fileName) || !input.csv?.trim());

  if (wantsXlsx && input.fileBase64?.trim()) {
    let buffer: Buffer;
    try {
      buffer = Buffer.from(input.fileBase64.trim(), "base64");
    } catch {
      throw new AppError("Invalid fileBase64 encoding", 400);
    }
    if (buffer.length === 0) {
      throw new AppError("Excel file is empty", 400);
    }
    const parsed = await parseXlsxBuffer(buffer);
    return { ...parsed, source: "xlsx" };
  }

  if (!input.csv?.trim()) {
    throw new AppError("CSV content or fileBase64 is required", 400);
  }

  return { ...parseCsvText(input.csv), source: "csv" };
}

export type ImportEntityType = "students" | "leads" | "users";
export type ExportEntityType = "students" | "leads" | "users" | "branches";

export interface CsvRowError {
  row: number;
  field?: string;
  message: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: CsvRowError[];
}

export interface ImportPreviewResult {
  jobId: string;
  entityType: ImportEntityType;
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: Record<string, string>[];
  errors: CsvRowError[];
  status: string;
}

export interface UsageDeletedList {
  branches: Array<{
    id: string;
    name: string;
    code: string | null;
    status: string;
    updatedAt: Date;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    updatedAt: Date;
  }>;
}

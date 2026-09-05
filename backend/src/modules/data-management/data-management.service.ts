import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { hashPassword } from "../../utils/password";
import { createAuditLog } from "../../utils/audit-log.util";
import { SequenceService } from "../masters/sequence.service";
import type { AuthUser } from "../auth/auth.types";
import { DataManagementRepository } from "./data-management.repository";
import type {
  ImportPreviewInput,
  ExportInput,
  ListImportsQuery,
} from "./data-management.validation";
import type { CsvRowError, ImportEntityType, ExportEntityType } from "./data-management.types";

const TEMPLATES: Record<ImportEntityType, string> = {
  students: "name,email,phone,password,branchId,studentCode\n",
  leads: "name,phoneNumber,email,interestedIn,branchId,source\n",
  users: "name,email,phone,password,roles,branchId\n",
};

const SYNC_ROW_LIMIT = 500;
const EXPORT_DIR = path.resolve(process.cwd(), "uploads", "exports");

function parseCsv(csv: string): { headers: string[]; rows: Record<string, string>[] } {
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

function splitCsvLine(line: string): string[] {
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

function toCsv(headers: string[], rows: Array<Record<string, string | number | null | undefined>>): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

function validateRows(
  entityType: ImportEntityType,
  rows: Record<string, string>[],
  allowedBranchIds: Set<string>
): { validRows: Record<string, string>[]; errors: CsvRowError[] } {
  const errors: CsvRowError[] = [];
  const validRows: Record<string, string>[] = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // header is row 1
    const rowErrors: CsvRowError[] = [];

    const require = (field: string, label = field) => {
      if (!row[field]?.trim()) {
        rowErrors.push({ row: rowNumber, field, message: `${label} is required` });
      }
    };

    if (entityType === "students") {
      require("name");
      require("branchId");
      if (row.branchId && !allowedBranchIds.has(row.branchId)) {
        rowErrors.push({ row: rowNumber, field: "branchId", message: "branchId is not in this institute" });
      }
      if (!row.email?.trim() && !row.phone?.trim()) {
        rowErrors.push({ row: rowNumber, message: "At least one of email or phone is required" });
      }
    } else if (entityType === "leads") {
      require("name");
      require("phoneNumber", "phoneNumber");
      require("interestedIn", "interestedIn");
      require("branchId");
      if (row.branchId && !allowedBranchIds.has(row.branchId)) {
        rowErrors.push({ row: rowNumber, field: "branchId", message: "branchId is not in this institute" });
      }
    } else if (entityType === "users") {
      require("name");
      require("roles");
      if (!row.email?.trim() && !row.phone?.trim()) {
        rowErrors.push({ row: rowNumber, message: "At least one of email or phone is required" });
      }
      if (row.branchId && !allowedBranchIds.has(row.branchId)) {
        rowErrors.push({ row: rowNumber, field: "branchId", message: "branchId is not in this institute" });
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validRows.push(row);
    }
  });

  return { validRows, errors };
}

async function processStudentRow(instituteId: string, row: Record<string, string>) {
  const passwordHash = await hashPassword(row.password?.trim() || "Aadya@123");
  let studentCode = row.studentCode?.trim().toUpperCase();
  if (!studentCode) {
    studentCode = await SequenceService.getNextNumber(instituteId, "STUDENT", { branchId: row.branchId });
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        instituteId,
        branchId: row.branchId,
        name: row.name.trim(),
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        passwordHash,
      },
    });

    const studentRole = await tx.role.findFirst({ where: { name: "STUDENT" } });
    if (studentRole) {
      await tx.userRole.create({ data: { userId: user.id, roleId: studentRole.id } });
    }

    await tx.student.create({
      data: {
        userId: user.id,
        instituteId,
        branchId: row.branchId,
        studentCode,
      },
    });
  });
}

async function processLeadRow(instituteId: string, createdById: string, row: Record<string, string>) {
  await prisma.lead.create({
    data: {
      instituteId,
      branchId: row.branchId,
      name: row.name.trim(),
      phoneNumber: row.phoneNumber.trim(),
      email: row.email?.trim() || null,
      interestedIn: row.interestedIn.trim(),
      source: row.source?.trim() || "WALK_IN",
      createdById,
    },
  });
}

async function processUserRow(instituteId: string, row: Record<string, string>) {
  const roleNames = row.roles
    .split(/[|;,]/)
    .map((r) => r.trim())
    .filter(Boolean);
  const roles = await DataManagementRepository.findRolesByNames(roleNames);
  if (roles.length !== roleNames.length) {
    const found = new Set(roles.map((r) => r.name));
    const missing = roleNames.filter((r) => !found.has(r));
    throw new Error(`Invalid role(s): ${missing.join(", ")}`);
  }

  const passwordHash = await hashPassword(row.password?.trim() || "Password@123");
  await prisma.user.create({
    data: {
      instituteId,
      branchId: row.branchId?.trim() || null,
      name: row.name.trim(),
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      passwordHash,
      userRoles: {
        create: roles.map((r) => ({ roleId: r.id })),
      },
    },
  });
}

async function processRows(
  entityType: ImportEntityType,
  instituteId: string,
  createdById: string,
  rows: Record<string, string>[]
): Promise<{ successRows: number; errorRows: number; errorReport: CsvRowError[] }> {
  let successRows = 0;
  const errorReport: CsvRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (entityType === "students") await processStudentRow(instituteId, row);
      else if (entityType === "leads") await processLeadRow(instituteId, createdById, row);
      else await processUserRow(instituteId, row);
      successRows++;
    } catch (err) {
      errorReport.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Failed to import row",
      });
    }
  }

  return { successRows, errorRows: errorReport.length, errorReport };
}

export const DataManagementService = {
  getTemplate(entityType: ImportEntityType) {
    return {
      entityType,
      contentType: "text/csv",
      fileName: `${entityType}-import-template.csv`,
      csv: TEMPLATES[entityType],
    };
  },

  async previewImport(currentUser: AuthUser, input: ImportPreviewInput) {
    const instituteId = currentUser.instituteId;
    const allowedBranchIds = await DataManagementRepository.findBranchIdsForInstitute(instituteId);
    const { rows } = parseCsv(input.csv);
    const { validRows, errors } = validateRows(input.entityType, rows, allowedBranchIds);

    const job = await DataManagementRepository.createImportJob({
      institute: { connect: { id: instituteId } },
      createdBy: { connect: { id: currentUser.id } },
      entityType: input.entityType,
      status: "PREVIEW",
      fileName: input.fileName || `${input.entityType}-import.csv`,
      totalRows: rows.length,
      successRows: validRows.length,
      errorRows: errors.length,
      previewData: validRows as unknown as Prisma.InputJsonValue,
      errorReport: errors as unknown as Prisma.InputJsonValue,
    });

    return {
      jobId: job.id,
      entityType: input.entityType,
      totalRows: rows.length,
      validRows: validRows.length,
      errorRows: errors.length,
      preview: validRows.slice(0, 50),
      errors: errors.slice(0, 100),
      status: job.status,
    };
  },

  async confirmImport(currentUser: AuthUser, jobId: string) {
    const instituteId = currentUser.instituteId;
    const job = await DataManagementRepository.findImportJob(jobId, instituteId);
    if (!job) throw new AppError("Import job not found", 404);
    if (job.status !== "PREVIEW" && job.status !== "PENDING") {
      throw new AppError(`Import job cannot be confirmed from status ${job.status}`, 400);
    }

    const previewRows = Array.isArray(job.previewData)
      ? (job.previewData as Record<string, string>[])
      : [];

    // Re-load full valid rows from previewData; for large jobs we only stored first 50 —
    // require client to re-preview with smaller sets or process what we have.
    const rowsToProcess = previewRows;
    if (rowsToProcess.length === 0) {
      throw new AppError("No valid rows available to import. Run preview again.", 400);
    }

    if (job.totalRows > SYNC_ROW_LIMIT || rowsToProcess.length > SYNC_ROW_LIMIT) {
      await DataManagementRepository.updateImportJob(jobId, instituteId, {
        status: "PROCESSING",
      });
      // Process asynchronously without blocking response for oversized previews
      void (async () => {
        try {
          const result = await processRows(
            job.entityType as ImportEntityType,
            instituteId,
            currentUser.id,
            rowsToProcess
          );
          await DataManagementRepository.updateImportJob(jobId, instituteId, {
            status: result.errorRows > 0 && result.successRows === 0 ? "FAILED" : "COMPLETED",
            successRows: result.successRows,
            errorRows: result.errorRows,
            errorReport: result.errorReport as unknown as Prisma.InputJsonValue,
            resultSummary: {
              processed: rowsToProcess.length,
              successRows: result.successRows,
              errorRows: result.errorRows,
            } as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          });
        } catch (err) {
          await DataManagementRepository.updateImportJob(jobId, instituteId, {
            status: "FAILED",
            errorReport: [{ message: err instanceof Error ? err.message : "Import failed" }] as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          });
        }
      })();

      return { jobId, status: "PROCESSING", message: "Import started in background" };
    }

    await DataManagementRepository.updateImportJob(jobId, instituteId, { status: "PROCESSING" });
    const result = await processRows(
      job.entityType as ImportEntityType,
      instituteId,
      currentUser.id,
      rowsToProcess
    );

    const updated = await DataManagementRepository.updateImportJob(jobId, instituteId, {
      status: result.errorRows > 0 && result.successRows === 0 ? "FAILED" : "COMPLETED",
      successRows: result.successRows,
      errorRows: result.errorRows,
      errorReport: result.errorReport as unknown as Prisma.InputJsonValue,
      resultSummary: {
        processed: rowsToProcess.length,
        successRows: result.successRows,
        errorRows: result.errorRows,
      } as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    });

    return updated;
  },

  async listImports(currentUser: AuthUser, query: ListImportsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await DataManagementRepository.listImportJobs(currentUser.instituteId, {
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async exportData(
    currentUser: AuthUser,
    input: ExportInput,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ) {
    const instituteId = currentUser.instituteId;
    const entityType = input.entityType as ExportEntityType;

    const job = await DataManagementRepository.createExportJob({
      institute: { connect: { id: instituteId } },
      createdBy: { connect: { id: currentUser.id } },
      entityType,
      status: "PROCESSING",
      filters: (input.filters ?? {}) as Prisma.InputJsonValue,
    });

    try {
      await fs.mkdir(EXPORT_DIR, { recursive: true });

      let headers: string[] = [];
      let rows: Array<Record<string, string | number | null | undefined>> = [];

      if (entityType === "students") {
        const data = await DataManagementRepository.exportStudents(instituteId);
        headers = ["studentCode", "name", "email", "phone", "branch", "status", "createdAt"];
        rows = data.map((s) => ({
          studentCode: s.studentCode,
          name: s.user?.name ?? "",
          email: s.user?.email ?? "",
          phone: s.user?.phone ?? "",
          branch: s.branch?.name ?? "",
          status: s.status,
          createdAt: s.createdAt.toISOString(),
        }));
      } else if (entityType === "leads") {
        const data = await DataManagementRepository.exportLeads(instituteId);
        headers = ["name", "phoneNumber", "email", "interestedIn", "branch", "stage", "status", "createdAt"];
        rows = data.map((l) => ({
          name: l.name,
          phoneNumber: l.phoneNumber,
          email: l.email ?? "",
          interestedIn: l.interestedIn,
          branch: l.branch?.name ?? "",
          stage: l.stage,
          status: l.status,
          createdAt: l.createdAt.toISOString(),
        }));
      } else if (entityType === "users") {
        const data = await DataManagementRepository.exportUsers(instituteId);
        headers = ["name", "email", "phone", "roles", "branch", "status", "createdAt"];
        rows = data.map((u) => ({
          name: u.name,
          email: u.email ?? "",
          phone: u.phone ?? "",
          roles: u.userRoles.map((ur) => ur.role.name).join("|"),
          branch: u.branch?.name ?? "",
          status: u.status,
          createdAt: u.createdAt.toISOString(),
        }));
      } else {
        const data = await DataManagementRepository.exportBranches(instituteId);
        headers = ["name", "code", "phone", "email", "status", "createdAt"];
        rows = data.map((b) => ({
          name: b.name,
          code: b.code,
          phone: b.phone ?? "",
          email: b.email ?? "",
          status: b.status,
          createdAt: b.createdAt.toISOString(),
        }));
      }

      const token = crypto.randomBytes(24).toString("hex");
      const fileName = `${entityType}-${instituteId.slice(0, 8)}-${Date.now()}.csv`;
      const filePath = path.join(EXPORT_DIR, fileName);
      await fs.writeFile(filePath, toCsv(headers, rows), "utf8");

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const updated = await DataManagementRepository.updateExportJob(job.id, instituteId, {
        status: "COMPLETED",
        filePath,
        downloadToken: token,
        expiresAt,
        rowCount: rows.length,
        completedAt: new Date(),
      });

      await createAuditLog({
        userId: currentUser.id,
        instituteId,
        action: "DATA_EXPORTED",
        entityType: "DataExportJob",
        entityId: job.id,
        newData: { entityType, rowCount: rows.length },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      return {
        jobId: job.id,
        entityType,
        rowCount: rows.length,
        downloadToken: token,
        expiresAt,
        downloadPath: `/data-management/export/${token}/download`,
        status: updated?.status ?? "COMPLETED",
      };
    } catch (err) {
      await DataManagementRepository.updateExportJob(job.id, instituteId, {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Export failed",
        completedAt: new Date(),
      });
      throw err instanceof AppError ? err : new AppError("Export failed", 500);
    }
  },

  async downloadExport(currentUser: AuthUser, token: string) {
    const job = await DataManagementRepository.findExportByToken(token);
    if (!job || job.instituteId !== currentUser.instituteId) {
      throw new AppError("Export not found", 404);
    }
    if (job.status !== "COMPLETED" || !job.filePath) {
      throw new AppError("Export is not ready", 400);
    }
    if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
      throw new AppError("Download link has expired", 410);
    }

    return {
      filePath: job.filePath,
      fileName: path.basename(job.filePath),
      entityType: job.entityType,
    };
  },

  async listDeleted(currentUser: AuthUser) {
    return DataManagementRepository.listDeleted(currentUser.instituteId);
  },

  async restoreBranch(currentUser: AuthUser, branchId: string) {
    const branch = await DataManagementRepository.restoreBranch(branchId, currentUser.instituteId);
    if (!branch) throw new AppError("Deleted branch not found", 404);

    await createAuditLog({
      userId: currentUser.id,
      instituteId: currentUser.instituteId,
      branchId: branch.id,
      action: "BRANCH_RESTORED",
      entityType: "Branch",
      entityId: branch.id,
      newData: { status: "ACTIVE" },
    });

    return branch;
  },

  async getBackupStatus(currentUser: AuthUser) {
    return DataManagementRepository.getOrCreateBackupStatus(currentUser.instituteId);
  },
};

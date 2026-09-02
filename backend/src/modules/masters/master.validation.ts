import { z } from "zod";

export const masterListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  branchId: z.string().optional(),
});

export const createMasterRecordSchema = z.object({
  entityType: z.string().min(1, "entityType is required").trim(),
  name: z.string().min(1, "Name is required").trim(),
  /** Optional; only used for numbering series (document target). Ignored for other masters. */
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
  branchId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  sortOrder: z.coerce.number().int().default(0),
  data: z.record(z.string(), z.any()).optional(),
});

export const updateMasterRecordSchema = z.object({
  name: z.string().min(1).trim().optional(),
  /** Optional; only used for numbering series (document target). */
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
  branchId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

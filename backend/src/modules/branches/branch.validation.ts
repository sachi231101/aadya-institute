import { z } from "zod";

const statusEnum = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"])
);

export const createBranchSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters").trim(),
  code: z
    .string()
    .min(2, "Branch code must be at least 2 characters")
    .max(10, "Branch code must be at most 10 characters")
    .trim()
    .toUpperCase(),
  address: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: "Phone must be a 10-digit number",
    }),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).trim().optional(),
  code: z.string().min(2).max(10).trim().toUpperCase().optional(),
  address: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: "Phone must be a 10-digit number",
    }),
  status: statusEnum.optional(),
});

export const branchListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  status: statusEnum.optional(),
});

export type CreateBranchDto = z.infer<typeof createBranchSchema>;
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>;
export type BranchListQueryDto = z.infer<typeof branchListQuerySchema>;

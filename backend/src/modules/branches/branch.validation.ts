import { z } from "zod";

const statusEnum = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"])
);

const phoneValidation = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val === "" || val === null ? undefined : val))
  .refine(
    (val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    {
      message: "Phone must be a valid phone number (7-15 digits)",
    }
  );

const addressValidation = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val === "" || val === null ? undefined : val));

export const createBranchSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters").trim(),
  code: z
    .string()
    .min(2, "Branch code must be at least 2 characters")
    .max(10, "Branch code must be at most 10 characters")
    .trim()
    .toUpperCase(),
  address: addressValidation,
  phone: phoneValidation,
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).trim().optional(),
  code: z.string().min(2).max(10).trim().toUpperCase().optional(),
  address: addressValidation,
  phone: phoneValidation,
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

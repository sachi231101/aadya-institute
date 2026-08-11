import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email").trim().toLowerCase().optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone must be a 10-digit number")
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  roles: z
    .array(z.string().min(1))
    .min(1, "At least one role is required"),
  branchId: z.string().cuid("Invalid branch ID").optional(),
}).refine((data) => data.email || data.phone, {
  message: "At least one of email or phone is required",
  path: ["email"],
});

export const updateUserSchema = z.object({
  name: z.string().min(2).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  branchId: z.string().cuid().optional().nullable(),
});

const statusEnum = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(["ACTIVE", "INACTIVE", "BLOCKED"])
);

export const updateUserStatusSchema = z.object({
  status: statusEnum,
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  role: z.string().optional(),
  branchId: z.string().cuid().optional(),
  status: statusEnum.optional(),
});


export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
export type UserListQueryDto = z.infer<typeof userListQuerySchema>;

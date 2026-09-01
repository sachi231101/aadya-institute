import { z } from "zod";
import { ALL_MODULE_KEYS } from "../../utils/module-permissions";

const phoneSchema = z.preprocess(
  (val) => {
    if (typeof val === "string" && val.trim() !== "") {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 ? digits.slice(-10) : val;
    }
    return val;
  },
  z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number").optional()
);

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email").trim().toLowerCase().optional(),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val && val.trim().length >= 8 ? val : "Password@123")),
  roles: z
    .array(z.string().min(1))
    .min(1, "At least one role is required"),
  branchId: z.string().optional(),
  modulePermissions: z
    .array(z.string().refine((key) => ALL_MODULE_KEYS.includes(key), {
      message: "Invalid module key",
    }))
    .optional(),
  permissions: z.array(z.string().min(1)).optional(),
}).refine((data) => data.email || data.phone, {
  message: "At least one of email or phone is required",
  path: ["email"],
});

export const updateUserSchema = z.object({
  name: z.string().min(2).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  phone: phoneSchema,
  branchId: z.string().optional().nullable(),
  whatsappEnabled: z.boolean().optional(),
});

export const updateUserPermissionsSchema = z
  .object({
    modulePermissions: z
      .array(z.string().refine((key) => ALL_MODULE_KEYS.includes(key), {
        message: "Invalid module key",
      }))
      .optional(),
    permissions: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => data.modulePermissions !== undefined || (data.permissions && data.permissions.length >= 0), {
    message: "Either modulePermissions or permissions must be provided",
  });

export const permissionCatalogQuerySchema = z.object({
  role: z.enum(["CENTER_MANAGER", "COUNSELLOR"]),
});

export const updateWhatsappPreferenceSchema = z.object({
  whatsappEnabled: z.boolean(),
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
  branchId: z.string().optional(),
  status: statusEnum.optional(),
});


export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserPermissionsDto = z.infer<typeof updateUserPermissionsSchema>;
export type UserListQueryDto = z.infer<typeof userListQuerySchema>;

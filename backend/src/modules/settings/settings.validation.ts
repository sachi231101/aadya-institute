import { z } from "zod";

export const updatePersonalSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email").trim().toLowerCase(),
  phone: z.string().trim().optional().or(z.literal("")),
  designation: z.string().optional(),
  designationMasterId: z.string().optional(),
  department: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
    .regex(/[0-9]/, "New password must contain at least one number"),
});

export const updateNotificationsSchema = z.object({
  emailAdmissions: z.boolean().optional(),
  emailFeeAlerts: z.boolean().optional(),
  emailAttendance: z.boolean().optional(),
  whatsappReminders: z.boolean().optional(),
  aiCallAlerts: z.boolean().optional(),
});

export const updateSystemPreferencesSchema = z.object({
  primaryBranch: z.string().optional(),
  currencyFormat: z.string().optional(),
  themeMode: z.string().optional(),
  autoLogoutMinutes: z.coerce.number().int().positive().max(1440).optional(),
});

export const systemSettingCategorySchema = z.enum([
  "GENERAL",
  "LOCALIZATION",
  "ACADEMIC",
  "EXAMINATION",
  "FEES",
  "COMMUNICATION",
  "PORTAL",
]);

export const upsertSystemSettingsSchema = z.object({
  settings: z
    .record(z.string().min(1), z.unknown())
    .refine((obj) => Object.keys(obj).length > 0, "At least one setting is required"),
});

export const systemSettingCategoryParamSchema = z.object({
  category: systemSettingCategorySchema,
});

export type UpdatePersonalInput = z.infer<typeof updatePersonalSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpsertSystemSettingsInput = z.infer<typeof upsertSystemSettingsSchema>;
export type SystemSettingCategory = z.infer<typeof systemSettingCategorySchema>;

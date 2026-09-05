import { z } from "zod";

const optionalEmail = z
  .string()
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Invalid email",
  })
  .optional();

const optionalUrl = z
  .string()
  .refine((v) => v === "" || z.string().url().safeParse(v).success, {
    message: "Invalid URL",
  })
  .optional();

export const createInstituteSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20).toUpperCase(),
  email: optionalEmail,
  phone: z.string().optional(),
  address: z.string().optional(),
  website: optionalUrl,
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  gstNumber: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  logoUrl: optionalUrl,
});

export const updateInstituteSchema = z.object({
  name: z.string().min(1).optional(),
  email: optionalEmail,
  phone: z.string().optional(),
  address: z.string().optional(),
  website: optionalUrl,
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  gstNumber: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  logoUrl: optionalUrl,
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export type CreateInstituteDto = z.infer<typeof createInstituteSchema>;
export type UpdateInstituteDto = z.infer<typeof updateInstituteSchema>;

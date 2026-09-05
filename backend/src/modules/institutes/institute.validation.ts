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

const ianaTimezone = z
  .string()
  .refine(
    (v) =>
      v === "UTC" ||
      /^[A-Za-z_]+\/[A-Za-z0-9_+\-]+(?:\/[A-Za-z0-9_+\-]+)?$/.test(v),
    { message: "Invalid timezone" }
  );

const isoCurrency = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, { message: "Currency must be a 3-letter ISO code" })
  .transform((v) => v.toUpperCase());

const dateFormatEnum = z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]);

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const optionalTimezone = z.preprocess(emptyToUndefined, ianaTimezone.optional());
const optionalCurrency = z.preprocess(emptyToUndefined, isoCurrency.optional());
const optionalDateFormat = z.preprocess(emptyToUndefined, dateFormatEnum.optional());

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
  timezone: optionalTimezone,
  currency: optionalCurrency,
  dateFormat: optionalDateFormat,
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
  timezone: optionalTimezone,
  currency: optionalCurrency,
  dateFormat: optionalDateFormat,
  logoUrl: optionalUrl,
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export type CreateInstituteDto = z.infer<typeof createInstituteSchema>;
export type UpdateInstituteDto = z.infer<typeof updateInstituteSchema>;

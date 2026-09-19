import { z } from "zod";

export const applicationCreateSchema = z
  .object({
    applicantName: z.string().min(2, "Applicant name must be at least 2 characters"),
    phone: z
      .string()
      .min(1, "Mobile number is required")
      .transform((v) => v.replace(/\D/g, "").slice(-10))
      .refine((v) => v.length === 10 && /^[6-9]/.test(v), "Enter a valid 10-digit Indian mobile"),
    email: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email address"),
    courseId: z.string().min(1, "Course is required"),
    branchId: z.string().optional(),
    feeStatus: z.enum(["PAID", "PENDING"]).default("PAID"),
    applicationFee: z.coerce.number().min(0, "Fee must be 0 or more").optional(),
    paymentModeMasterId: z.string().optional(),
    paymentRef: z.string().optional(),
    notes: z.string().optional(),
    leadId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.feeStatus !== "PAID") return;
    if (
      data.applicationFee === undefined ||
      data.applicationFee === null ||
      Number.isNaN(Number(data.applicationFee))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the application fee amount",
        path: ["applicationFee"],
      });
    }
    if (!data.paymentModeMasterId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment mode is required",
        path: ["paymentModeMasterId"],
      });
    }
  });

export type ApplicationCreateFormValues = z.infer<typeof applicationCreateSchema>;

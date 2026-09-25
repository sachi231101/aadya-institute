import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined,
  z.string().optional()
);

const optionalCuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined,
  z.string().cuid("Invalid ID format").optional()
);

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : undefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid date")
    .optional()
);

export const studentReportQuerySchema = z
  .object({
    branchId: optionalCuid,
    courseId: optionalCuid,
    batchId: optionalCuid,
    status: optionalTrimmedString,
    riskFlag: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim().length > 0
            ? value.trim()
            : undefined,
        z.enum(["Normal", "At Risk", "Triggered"]).optional()
      ),
    dateFrom: optionalDate,
    dateTo: optionalDate,
  })
  .superRefine((query, ctx) => {
    if (
      query.dateFrom &&
      query.dateTo &&
      new Date(`${query.dateFrom}T00:00:00.000Z`) >
        new Date(`${query.dateTo}T23:59:59.999Z`)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      });
    }
  });

export const admissionsReportQuerySchema = z
  .object({
    branchId: optionalCuid,
    academicYear: optionalTrimmedString,
    dateFrom: optionalDate,
    dateTo: optionalDate,
    courseId: optionalCuid,
    batchId: optionalCuid,
    status: optionalTrimmedString,
    counsellorId: optionalCuid,
    leadSource: optionalTrimmedString,
  })
  .superRefine((query, ctx) => {
    if (
      query.dateFrom &&
      query.dateTo &&
      new Date(`${query.dateFrom}T00:00:00.000Z`) >
        new Date(`${query.dateTo}T23:59:59.999Z`)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      });
    }
  });

export const attendanceReportQuerySchema = z
  .object({
    branchId: optionalCuid,
    dateFrom: optionalDate,
    dateTo: optionalDate,
    courseId: optionalCuid,
    batchId: optionalCuid,
    facultyId: optionalCuid,
    sessionType: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim().length > 0
            ? value.trim().toUpperCase()
            : undefined,
        z.enum(["THEORY", "PRACTICAL"]).optional()
      ),
  })
  .superRefine((query, ctx) => {
    if (
      query.dateFrom &&
      query.dateTo &&
      new Date(`${query.dateFrom}T00:00:00.000Z`) >
        new Date(`${query.dateTo}T23:59:59.999Z`)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      });
    }
  });

export const facultyReportQuerySchema = z.object({
  branchId: optionalCuid,
  status: optionalTrimmedString,
});

export const courseReportQuerySchema = z.object({
  branchId: optionalCuid,
  status: optionalTrimmedString,
  category: optionalTrimmedString,
});

export const examinationsReportQuerySchema = z
  .object({
    branchId: optionalCuid,
    status: optionalTrimmedString,
    courseId: optionalCuid,
    dateFrom: optionalDate,
    dateTo: optionalDate,
  })
  .superRefine((query, ctx) => {
    if (
      query.dateFrom &&
      query.dateTo &&
      new Date(`${query.dateFrom}T00:00:00.000Z`) >
        new Date(`${query.dateTo}T23:59:59.999Z`)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      });
    }
  });

export const financialReportQuerySchema = z
  .object({
    branchId: optionalCuid,
    academicYear: optionalTrimmedString,
    dateFrom: optionalDate,
    dateTo: optionalDate,
    courseId: optionalCuid,
    batchId: optionalCuid,
    studentId: optionalCuid,
    feeHeadMasterId: optionalCuid,
    paymentModeMasterId: optionalCuid,
    paymentStatus: optionalTrimmedString,
    counsellorId: optionalCuid,
    transactionType: optionalTrimmedString,
    outstandingFilter: optionalTrimmedString,
    trendGranularity: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim().length > 0
            ? value.trim().toLowerCase()
            : undefined,
        z.enum(["monthly", "yearly", "quarterly"]).optional()
      ),
  })
  .superRefine((query, ctx) => {
    if (
      query.dateFrom &&
      query.dateTo &&
      new Date(`${query.dateFrom}T00:00:00.000Z`) >
        new Date(`${query.dateTo}T23:59:59.999Z`)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "dateTo must be on or after dateFrom",
      });
    }
  });

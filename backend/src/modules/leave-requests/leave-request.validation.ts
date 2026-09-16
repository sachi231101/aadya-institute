import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const createLeaveRequestSchema = z
  .object({
    startDate: dateKey,
    endDate: dateKey,
    reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date cannot be before start date",
    path: ["endDate"],
  });

export const reviewLeaveRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(300).optional(),
});

export const leaveRequestIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;

import { z } from "zod";

export const listPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]).optional(),
});

export const createPlanSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  price: z.number().min(0),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  features: z.record(z.string(), z.unknown()).optional(),
});

export const updatePlanSchema = createPlanSchema.partial();

export const createSubscriptionSchema = z.object({
  billingPlanId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  autoRenew: z.boolean().optional(),
});

export const updateSubscriptionSchema = z.object({
  billingPlanId: z.string().optional(),
  status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED", "TRIAL"]).optional(),
  endDate: z.string().datetime().optional().nullable(),
  autoRenew: z.boolean().optional(),
});

export const createInvoiceSchema = z.object({
  subscriptionId: z.string().optional(),
  amount: z.number().min(0),
  taxAmount: z.number().min(0).optional(),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  paidAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});

export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

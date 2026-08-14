import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(500, "Message cannot exceed 500 characters"),
  conversationId: z.string().cuid("Invalid conversation ID format").optional(),
});

export const conversationParamSchema = z.object({
  id: z.string().cuid("Invalid conversation ID format"),
});

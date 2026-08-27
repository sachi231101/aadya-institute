import { z } from "zod";

/**
 * Strips dangerous HTML tags and scripts to prevent stored XSS
 */
const sanitizePlainText = (val: string): string => {
  const trimmed = val.trim();
  // Remove basic script and html tags
  return trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>?/gm, "");
};

export const createDirectChatSchema = z.object({
  recipientUserId: z.string().min(1, "Recipient user ID is required"),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters")
    .transform((val) => sanitizePlainText(val))
    .refine((val) => val.length > 0, {
      message: "Message content cannot be empty or only HTML tags",
    }),
});

export const queryMessagesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

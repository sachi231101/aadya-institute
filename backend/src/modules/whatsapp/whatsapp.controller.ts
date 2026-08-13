import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendError } from "../../utils/response";
import { whatsAppService } from "./whatsapp.service";
import { z } from "zod";

const sendTestMessageSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
  name: z.string().default("Test User"),
  campaignName: z.string().min(1, "Campaign name is required"),
  templateParams: z.array(z.string()).default([]),
});

export const sendTestMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { phone, name, campaignName, templateParams } = sendTestMessageSchema.parse(req.body);
    const result = await whatsAppService.sendTestMessage(phone, name, campaignName, templateParams);
    sendSuccess(res, result, 200, "Test WhatsApp message sent successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to send test WhatsApp message", 400);
  }
};

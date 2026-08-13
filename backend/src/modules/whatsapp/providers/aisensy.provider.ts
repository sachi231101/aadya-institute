/**
 * AiSensy provider — concrete implementation of IWhatsAppProvider.
 *
 * This class adapts the AiSensy HTTP client to the common WhatsApp provider
 * interface. If the WhatsApp provider changes (e.g., to another vendor), only
 * this file and the client need to change — the business layer is unaffected.
 *
 * @module modules/whatsapp/providers/aisensy.provider
 */
import { aiSensySendMessage } from "../../../integrations/whatsapp/aisensy.client";
import { normalizePhone } from "../../../utils/phone";
import type { IWhatsAppProvider, SendWhatsAppTemplateOptions, SendWhatsAppResult } from "../whatsapp.types";
import { NON_RETRIABLE_ERROR_CODES } from "../../notifications/notification.constants";

export class AiSensyProvider implements IWhatsAppProvider {
  async sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult> {
    // AiSensy expects phone WITHOUT the leading + e.g. "919876543210"
    const normalized = normalizePhone(options.phone);
    const destination = normalized.startsWith("+")
      ? normalized.slice(1)
      : normalized;

    const result = await aiSensySendMessage({
      campaignName: options.campaignName,
      destination,
      userName: options.name,
      templateParams: options.templateParams,
      ...(options.media ? { media: options.media } : {}),
    });

    if (!result.success || !result.msgId) {
      // Treat as non-retriable if AiSensy returned a known error code
      const code = result.code ?? "SEND_FAILED";
      const isNonRetriable = NON_RETRIABLE_ERROR_CODES.has(code);
      const err = new Error(result.error ?? "AiSensy send failed") as any;
      err.code = code;
      err.nonRetriable = isNonRetriable;
      throw err;
    }

    return { providerMessageId: result.msgId };
  }
}

/** Singleton provider instance */
export const aiSensyProvider = new AiSensyProvider();

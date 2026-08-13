/**
 * AiSensy provider — concrete implementation of IWhatsAppProvider.
 *
 * @module modules/whatsapp/integrations/aisensy.provider
 */
import { aiSensySendMessage } from "./aisensy.client";
import { normalizePhone } from "../../../utils/phone";
import type { IWhatsAppProvider, SendWhatsAppTemplateOptions, SendWhatsAppResult } from "../whatsapp.types";
import { NON_RETRIABLE_ERROR_CODES } from "../whatsapp.constants";

export class AiSensyProvider implements IWhatsAppProvider {
  async sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult> {
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

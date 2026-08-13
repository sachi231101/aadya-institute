/**
 * WhatsApp service — channel abstraction layer.
 *
 * Business logic calls this service, not the provider directly.
 * The service validates inputs, formats phone numbers, and delegates to
 * the injected IWhatsAppProvider.
 *
 * @module modules/whatsapp/whatsapp.service
 */
import { isValidIndianPhone, normalizePhone } from "../../utils/phone";
import { logger } from "../../config/logger";
import { aiSensyProvider } from "./providers/aisensy.provider";
import type { IWhatsAppProvider, SendWhatsAppTemplateOptions, SendWhatsAppResult } from "./whatsapp.types";

class WhatsAppService {
  constructor(private readonly provider: IWhatsAppProvider) {}

  /**
   * Send a WhatsApp template message via the configured provider.
   *
   * @throws Error if phone is invalid (so worker can mark FAILED without retry)
   */
  async sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult> {
    const rawPhone = options.phone.replace(/^\+/, "").replace(/^91/, "");

    if (!isValidIndianPhone(rawPhone)) {
      const err = new Error(`Invalid Indian phone number: ${options.phone}`) as any;
      err.code = "INVALID_PHONE";
      err.nonRetriable = true;
      throw err;
    }

    const normalizedPhone = normalizePhone(options.phone);
    logger.debug(
      { campaign: options.campaignName, phone: normalizedPhone },
      "[whatsapp] Sending template"
    );

    return this.provider.sendTemplate({ ...options, phone: normalizedPhone });
  }

  /**
   * Send a test WhatsApp message (ADMIN only).
   * Validates the phone and delegates to the provider.
   */
  async sendTestMessage(
    phone: string,
    name: string,
    campaignName: string,
    templateParams: string[]
  ): Promise<SendWhatsAppResult> {
    return this.sendTemplate({ phone, name, campaignName, templateParams });
  }
}

/** Singleton with AiSensy provider — swap provider here if needed */
export const whatsAppService = new WhatsAppService(aiSensyProvider);

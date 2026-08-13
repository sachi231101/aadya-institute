/**
 * Types for the WhatsApp notification module.
 *
 * @module whatsapp.types
 */

export interface SendWhatsAppTemplateOptions {
  /** Phone number in E.164 format (+91XXXXXXXXXX) or international without + */
  phone: string;
  /** Recipient display name for personalisation */
  name: string;
  /** AiSensy campaign/template name — must be "Live" in AiSensy dashboard */
  campaignName: string;
  /** Ordered variable values matching the template placeholders ({{1}}, {{2}}, ...) */
  templateParams: string[];
  /** Optional media for templates with a media header */
  media?: {
    url: string;
    filename: string;
  };
}

export interface SendWhatsAppResult {
  /** Provider-assigned message ID (for delivery tracking via webhook) */
  providerMessageId: string;
}

/**
 * WhatsApp provider interface.
 *
 * All provider implementations (AiSensy, Meta, etc.) must implement this.
 * Business logic never depends on a concrete provider — it calls this interface.
 */
export interface IWhatsAppProvider {
  sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult>;
}

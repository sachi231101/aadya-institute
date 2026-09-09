/**
 * MSG91 WhatsApp provider — concrete IWhatsAppProvider implementation.
 *
 * @module modules/whatsapp/integrations/msg91.provider
 */
import { normalizePhone } from "../../../utils/phone";
import type {
  IWhatsAppProvider,
  SendWhatsAppTemplateOptions,
  SendWhatsAppResult,
} from "../whatsapp.types";
import { NON_RETRIABLE_ERROR_CODES } from "../whatsapp.constants";
import { msg91GetTemplates, msg91SendTemplate, type Msg91ProviderTemplate } from "./msg91.client";

export interface Msg91ConnectionTestResult {
  success: boolean;
  status: "CONNECTED" | "NOT_CONFIGURED" | "AUTH_FAILED" | "ERROR";
  message: string;
}

export class Msg91WhatsAppProvider implements IWhatsAppProvider {
  async sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult> {
    const normalized = normalizePhone(options.phone);
    const destination = normalized.startsWith("+") ? normalized.slice(1) : normalized;

    const { resolveWhatsappProviderConfig } = await import("../../integrations/integration.service");
    const config = options.instituteId
      ? await resolveWhatsappProviderConfig(options.instituteId)
      : { authKey: "", integratedNumber: "", namespace: undefined };

    if (!config.authKey || !config.integratedNumber) {
      const err = new Error("MSG91 is not configured") as Error & {
        code?: string;
        nonRetriable?: boolean;
      };
      err.code = "MSG91_CONFIGURATION_MISSING";
      err.nonRetriable = true;
      throw err;
    }

    const result = await msg91SendTemplate(
      {
        integratedNumber: config.integratedNumber,
        templateName: options.campaignName,
        languageCode: options.language || "en",
        namespace: options.namespace || config.namespace,
        destination,
        bodyParams: options.templateParams,
        media: options.media,
        crqid: options.notificationId,
      },
      config.authKey
    );

    if (!result.success || !result.requestId) {
      const code = result.code ?? "MSG91_REQUEST_FAILED";
      const err = new Error(result.error ?? "MSG91 send failed") as Error & {
        code?: string;
        nonRetriable?: boolean;
      };
      err.code = code;
      err.nonRetriable = NON_RETRIABLE_ERROR_CODES.has(code) || code.startsWith("MSG91_");
      if (code === "MSG91_PROVIDER_UNAVAILABLE" || code === "MSG91_REQUEST_FAILED") {
        err.nonRetriable = code !== "MSG91_PROVIDER_UNAVAILABLE" && NON_RETRIABLE_ERROR_CODES.has(code);
        if (code === "MSG91_PROVIDER_UNAVAILABLE") err.nonRetriable = false;
      }
      throw err;
    }

    return { providerMessageId: result.requestId };
  }

  async getTemplates(
    instituteId: string,
    options?: { templateStatus?: string; pageSize?: number; pageNum?: number }
  ): Promise<Msg91ProviderTemplate[]> {
    const { resolveWhatsappProviderConfig } = await import("../../integrations/integration.service");
    const config = await resolveWhatsappProviderConfig(instituteId);
    if (!config.authKey || !config.integratedNumber) {
      const err = new Error("MSG91 is not configured") as Error & {
        code?: string;
        nonRetriable?: boolean;
      };
      err.code = "MSG91_CONFIGURATION_MISSING";
      err.nonRetriable = true;
      throw err;
    }

    return msg91GetTemplates(
      {
        number: config.integratedNumber,
        templateStatus: options?.templateStatus,
        pageSize: options?.pageSize ?? 100,
        pageNum: options?.pageNum ?? 1,
      },
      config.authKey
    );
  }

  async testConnection(instituteId: string): Promise<Msg91ConnectionTestResult> {
    const { resolveWhatsappProviderConfig } = await import("../../integrations/integration.service");
    const config = await resolveWhatsappProviderConfig(instituteId);

    if (!config.authKey || !config.integratedNumber) {
      return {
        success: false,
        status: "NOT_CONFIGURED",
        message: "MSG91 auth key and integrated number are required",
      };
    }

    try {
      await msg91GetTemplates(
        { number: config.integratedNumber, pageSize: 1, pageNum: 1 },
        config.authKey
      );
      return { success: true, status: "CONNECTED", message: "Connection successful" };
    } catch (err: any) {
      if (err?.code === "MSG91_AUTHENTICATION_FAILED") {
        return { success: false, status: "AUTH_FAILED", message: "MSG91 authentication failed" };
      }
      return {
        success: false,
        status: "ERROR",
        message: err?.message || "MSG91 connection failed",
      };
    }
  }
}

/** Singleton provider instance */
export const msg91Provider = new Msg91WhatsAppProvider();

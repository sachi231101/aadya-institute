/**
 * MSG91 WhatsApp provider — concrete IWhatsAppProvider implementation.
 *
 * @module modules/whatsapp/integrations/msg91.provider
 */
import { logger } from "../../../config/logger";
import { normalizePhone } from "../../../utils/phone";
import type {
  IWhatsAppProvider,
  SendWhatsAppTemplateOptions,
  SendWhatsAppResult,
} from "../whatsapp.types";
import { NON_RETRIABLE_ERROR_CODES } from "../whatsapp.constants";
import {
  msg91GetIntegratedNumbers,
  msg91GetTemplates,
  msg91SendTemplate,
  type Msg91IntegratedNumbersResult,
  type Msg91ProviderTemplate,
} from "./msg91.client";

export interface Msg91ConnectionTestResult {
  success: boolean;
  status: "CONNECTED" | "NOT_CONFIGURED" | "AUTH_FAILED" | "PROVIDER_ERROR" | "ERROR";
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

  async getIntegratedNumbers(instituteId: string): Promise<Msg91IntegratedNumbersResult> {
    const { resolveWhatsappProviderConfig } = await import("../../integrations/integration.service");
    const config = await resolveWhatsappProviderConfig(instituteId);
    if (!config.authKey) {
      const err = new Error("MSG91 auth key is not configured") as Error & {
        code?: string;
        nonRetriable?: boolean;
      };
      err.code = "MSG91_CONFIGURATION_MISSING";
      err.nonRetriable = true;
      throw err;
    }
    return msg91GetIntegratedNumbers(config.authKey);
  }

  /**
   * Validate MSG91 credentials without sending a WhatsApp message.
   * Auth-only: whatsapp-activation. With number: get-templates probe.
   */
  async testConnection(instituteId: string): Promise<Msg91ConnectionTestResult> {
    const { resolveWhatsappProviderConfig } = await import("../../integrations/integration.service");
    const config = await resolveWhatsappProviderConfig(instituteId);

    logger.info({ instituteId }, "msg91.connection.test.started");

    if (!config.authKey) {
      logger.info({ instituteId }, "msg91.connection.test.failed");
      return {
        success: false,
        status: "NOT_CONFIGURED",
        message: "MSG91 Auth Key is not configured",
      };
    }

    try {
      if (!config.integratedNumber) {
        await msg91GetIntegratedNumbers(config.authKey);
      } else {
        await msg91GetTemplates(
          { number: config.integratedNumber, pageSize: 1, pageNum: 1 },
          config.authKey
        );
      }
      logger.info({ instituteId }, "msg91.connection.test.success");
      return { success: true, status: "CONNECTED", message: "Connection successful" };
    } catch (err: any) {
      logger.info({ instituteId, code: err?.code }, "msg91.connection.test.failed");
      if (err?.code === "MSG91_AUTHENTICATION_FAILED") {
        return {
          success: false,
          status: "AUTH_FAILED",
          message: "MSG91 authentication failed. Please verify the configured Auth Key.",
        };
      }
      if (err?.code === "MSG91_PROVIDER_UNAVAILABLE") {
        return {
          success: false,
          status: "PROVIDER_ERROR",
          message: "MSG91 provider is temporarily unavailable. Try again later.",
        };
      }
      if (err?.code === "MSG91_CONFIGURATION_MISSING" || err?.code === "MSG91_NUMBER_FETCH_FAILED") {
        return {
          success: false,
          status: "NOT_CONFIGURED",
          message: err?.message || "MSG91 is not fully configured",
        };
      }
      return {
        success: false,
        status: "ERROR",
        message: "MSG91 connection failed. Please verify configuration.",
      };
    }
  }
}

/** Singleton provider instance */
export const msg91Provider = new Msg91WhatsAppProvider();

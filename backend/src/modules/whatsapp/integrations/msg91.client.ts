/**
 * MSG91 WhatsApp HTTP client — provider-specific API calls only.
 *
 * @module modules/whatsapp/integrations/msg91.client
 */
import axios, { type AxiosError } from "axios";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";

export interface Msg91TemplateComponentValue {
  type: "text" | "image" | "video" | "document";
  value?: string;
  subtype?: string;
}

export interface Msg91SendTemplateRequest {
  integratedNumber: string;
  templateName: string;
  languageCode: string;
  namespace?: string;
  destination: string;
  /** Ordered body variable values → body_1, body_2, … */
  bodyParams: string[];
  media?: { url: string; filename?: string };
  /** Correlation id returned in webhooks */
  crqid?: string;
}

export interface Msg91SendTemplateResult {
  success: boolean;
  requestId?: string;
  error?: string;
  code?: string;
}

export interface Msg91ProviderTemplate {
  name: string;
  language: string;
  status: string;
  namespace?: string;
  id?: string;
  category?: string;
  raw?: Record<string, unknown>;
}

export interface Msg91GetTemplatesParams {
  number: string;
  templateName?: string;
  templateStatus?: string;
  templateLanguage?: string;
  pageSize?: number;
  pageNum?: number;
}

export interface Msg91IntegratedNumbersResult {
  numbers: string[];
  primary?: string;
}

const sanitizeErrorData = (data: unknown): unknown => {
  if (!data || typeof data !== "object") return data;
  const clone = { ...(data as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (/auth|key|secret|token/i.test(key)) clone[key] = "[redacted]";
  }
  return clone;
};

const mapHttpError = (status?: number, data?: any): { code: string; message: string } => {
  const message =
    data?.message ||
    data?.error ||
    data?.errors?.[0]?.message ||
    (typeof data === "string" ? data : undefined) ||
    "MSG91 request failed";

  if (status === 401 || status === 403) {
    return { code: "MSG91_AUTHENTICATION_FAILED", message: "MSG91 authentication failed" };
  }
  if (status === 404) {
    return { code: "MSG91_TEMPLATE_NOT_FOUND", message: String(message) };
  }
  if (status && status >= 500) {
    return { code: "MSG91_PROVIDER_UNAVAILABLE", message: "MSG91 provider unavailable" };
  }
  return { code: "MSG91_REQUEST_FAILED", message: String(message) };
};

const extractRequestId = (data: any): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const id =
    data.request_id ||
    data.requestId ||
    data.data?.request_id ||
    data.data?.requestId ||
    data.message?.[0]?.request_id ||
    data.messages?.[0]?.id;
  return id ? String(id) : undefined;
};

const normalizeTemplateRow = (
  row: Record<string, any>,
  defaults?: { namespace?: string; category?: string; name?: string }
): Msg91ProviderTemplate => {
  const name = String(
    row.template_name ||
      row.name ||
      row.templateName ||
      row.elementName ||
      defaults?.name ||
      ""
  );
  const language = String(
    row.template_language || row.language || row.language_code || row.languageCode || "en"
  );
  const status = String(
    row.template_status || row.status || row.approval_status || "UNKNOWN"
  ).toUpperCase();
  const namespace =
    row.namespace ||
    row.template_namespace ||
    row.templateNamespace ||
    defaults?.namespace;
  const id = row.id || row.template_id || row.templateId || row.msg91_template_id;
  const category = row.category || row.template_category || defaults?.category;

  return {
    name,
    language,
    status,
    namespace: namespace ? String(namespace) : undefined,
    id: id ? String(id) : undefined,
    category: category ? String(category) : undefined,
    raw: row,
  };
};

/**
 * MSG91 get-template-client returns either flat rows or nested:
 * data: [{ name, namespace, category, languages: [{ language, status, ... }] }]
 */
const extractTemplates = (data: any): Msg91ProviderTemplate[] => {
  if (!data) return [];
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.templates)
        ? data.templates
        : Array.isArray(data.data?.data)
          ? data.data.data
          : Array.isArray(data.data?.templates)
            ? data.data.templates
            : [];

  const out: Msg91ProviderTemplate[] = [];

  for (const row of list) {
    if (!row || typeof row !== "object") continue;

    const languages = Array.isArray((row as any).languages)
      ? (row as any).languages
      : null;

    if (languages && languages.length > 0) {
      for (const lang of languages) {
        if (!lang || typeof lang !== "object") continue;
        const normalized = normalizeTemplateRow(lang, {
          name: (row as any).name,
          namespace: (row as any).namespace,
          category: (row as any).category,
        });
        if (normalized.name) out.push(normalized);
      }
      continue;
    }

    const normalized = normalizeTemplateRow(row as Record<string, any>);
    if (normalized.name) out.push(normalized);
  }

  return out;
};

const digitsOnly = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
};

/**
 * Extract integrated WhatsApp numbers from MSG91 whatsapp-activation payloads.
 * Response shapes vary; prefer documented fields then deep-scan digit strings.
 */
export const extractIntegratedNumbers = (data: unknown): Msg91IntegratedNumbersResult => {
  const found = new Set<string>();

  const consider = (value: unknown) => {
    const n = digitsOnly(value);
    if (n) found.add(n);
  };

  const walk = (node: unknown, depth = 0) => {
    if (!node || depth > 6) return;
    if (typeof node === "string" || typeof node === "number") {
      consider(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (/integrated.?number|whatsapp.?number|phone|mobile|msisdn|^number$/i.test(key)) {
          consider(obj[key]);
        }
      }
      for (const value of Object.values(obj)) walk(value, depth + 1);
    }
  };

  walk(data);
  const numbers = Array.from(found);
  return { numbers, primary: numbers[0] };
};

/**
 * Fetch integrated WhatsApp number(s) for the MSG91 account.
 * GET {MSG91_CONTROL_BASE_URL}/api/v5/whatsapp/whatsapp-activation/
 * Auth: authkey header. Does not send any WhatsApp message.
 */
export const msg91GetIntegratedNumbers = async (
  authKey: string
): Promise<Msg91IntegratedNumbersResult> => {
  if (!authKey) {
    const err = new Error("MSG91 auth key is not configured") as Error & {
      code?: string;
      nonRetriable?: boolean;
    };
    err.code = "MSG91_CONFIGURATION_MISSING";
    err.nonRetriable = true;
    throw err;
  }

  try {
    const res = await axios.get(
      `${env.MSG91_CONTROL_BASE_URL.replace(/\/$/, "")}/api/v5/whatsapp/whatsapp-activation/`,
      {
        headers: {
          accept: "application/json",
          authkey: authKey,
        },
        timeout: 20_000,
      }
    );

    const result = extractIntegratedNumbers(res.data);
    if (result.numbers.length === 0) {
      const err = new Error("No integrated WhatsApp number found on MSG91") as Error & {
        code?: string;
        nonRetriable?: boolean;
      };
      err.code = "MSG91_NUMBER_FETCH_FAILED";
      err.nonRetriable = true;
      throw err;
    }

    logger.info(
      { count: result.numbers.length, primary: result.primary },
      "msg91.number.fetch.success"
    );
    return result;
  } catch (err) {
    if ((err as Error & { code?: string }).code?.startsWith("MSG91_")) {
      throw err;
    }
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    logger.error(
      { status, data: sanitizeErrorData(data) },
      "msg91.number.fetch.failed"
    );
    const mapped = mapHttpError(status, data);
    const apiError = new Error(
      mapped.code === "MSG91_AUTHENTICATION_FAILED"
        ? mapped.message
        : "Failed to fetch MSG91 WhatsApp number"
    ) as Error & {
      code?: string;
      statusCode?: number;
      nonRetriable?: boolean;
    };
    apiError.code =
      mapped.code === "MSG91_AUTHENTICATION_FAILED"
        ? mapped.code
        : mapped.code === "MSG91_PROVIDER_UNAVAILABLE"
          ? mapped.code
          : "MSG91_NUMBER_FETCH_FAILED";
    apiError.statusCode = status;
    apiError.nonRetriable =
      apiError.code === "MSG91_AUTHENTICATION_FAILED" ||
      apiError.code === "MSG91_CONFIGURATION_MISSING";
    throw apiError;
  }
};

export const msg91GetTemplates = async (
  params: Msg91GetTemplatesParams,
  authKey: string
): Promise<Msg91ProviderTemplate[]> => {
  if (!authKey) {
    const err = new Error("MSG91 auth key is not configured") as Error & { code?: string; nonRetriable?: boolean };
    err.code = "MSG91_CONFIGURATION_MISSING";
    err.nonRetriable = true;
    throw err;
  }
  if (!params.number) {
    const err = new Error("MSG91 integrated number is not configured") as Error & {
      code?: string;
      nonRetriable?: boolean;
    };
    err.code = "MSG91_CONFIGURATION_MISSING";
    err.nonRetriable = true;
    throw err;
  }

  const pageSize = Math.min(500, Math.max(1, params.pageSize ?? 100));
  const pageNum = Math.max(1, params.pageNum ?? 1);

  try {
    const res = await axios.get(
      `${env.MSG91_CONTROL_BASE_URL.replace(/\/$/, "")}/api/v5/whatsapp/get-template-client/${encodeURIComponent(params.number)}`,
      {
        headers: {
          accept: "application/json",
          authkey: authKey,
        },
        params: {
          ...(params.templateName ? { template_name: params.templateName } : {}),
          ...(params.templateStatus ? { template_status: params.templateStatus } : {}),
          ...(params.templateLanguage ? { template_language: params.templateLanguage } : {}),
          page_size: pageSize,
          page_num: pageNum,
        },
        timeout: 20_000,
      }
    );

    return extractTemplates(res.data);
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    logger.error(
      { status, data: sanitizeErrorData(data), number: params.number },
      "[msg91] get-templates failed"
    );
    const mapped = mapHttpError(status, data);
    const apiError = new Error(mapped.message) as Error & {
      code?: string;
      statusCode?: number;
      nonRetriable?: boolean;
    };
    apiError.code = mapped.code;
    apiError.statusCode = status;
    apiError.nonRetriable = mapped.code === "MSG91_AUTHENTICATION_FAILED" || mapped.code === "MSG91_CONFIGURATION_MISSING";
    throw apiError;
  }
};

export const msg91SendTemplate = async (
  payload: Msg91SendTemplateRequest,
  authKey: string
): Promise<Msg91SendTemplateResult> => {
  if (!authKey) {
    return { success: false, error: "MSG91 auth key is not configured", code: "MSG91_CONFIGURATION_MISSING" };
  }
  if (!payload.integratedNumber) {
    return {
      success: false,
      error: "MSG91 integrated number is not configured",
      code: "MSG91_CONFIGURATION_MISSING",
    };
  }

  const components: Record<string, Msg91TemplateComponentValue> = {};
  payload.bodyParams.forEach((value, index) => {
    components[`body_${index + 1}`] = { type: "text", value };
  });

  if (payload.media?.url) {
    components.header_1 = {
      type: "image",
      value: payload.media.url,
    };
  }

  const body = {
    integrated_number: payload.integratedNumber,
    content_type: "template",
    ...(payload.crqid ? { CRQID: payload.crqid } : {}),
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: payload.templateName,
        language: {
          code: payload.languageCode || "en",
          policy: "deterministic",
        },
        ...(payload.namespace ? { namespace: payload.namespace } : {}),
        to_and_components: [
          {
            to: [payload.destination],
            components,
          },
        ],
      },
    },
  };

  try {
    const res = await axios.post(
      `${env.MSG91_API_BASE_URL.replace(/\/$/, "")}/api/v5/whatsapp/whatsapp-outbound-message/bulk/`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
        timeout: 15_000,
      }
    );

    const requestId = extractRequestId(res.data);
    const hasError =
      res.data?.hasError === true ||
      res.data?.type === "error" ||
      (typeof res.data?.status === "string" && /fail|error/i.test(res.data.status));

    if (hasError && !requestId) {
      const mapped = mapHttpError(res.status, res.data);
      return { success: false, error: mapped.message, code: mapped.code };
    }

    logger.debug(
      {
        templateName: payload.templateName,
        destination: payload.destination,
        requestId,
      },
      "[msg91] Template message accepted"
    );

    return { success: true, requestId: requestId || `msg91-${Date.now()}` };
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    logger.error(
      {
        status,
        data: sanitizeErrorData(data),
        templateName: payload.templateName,
        destination: payload.destination,
      },
      "[msg91] Send failed"
    );

    const mapped = mapHttpError(status, data);
    const apiError = new Error(mapped.message) as Error & {
      code?: string;
      statusCode?: number;
      nonRetriable?: boolean;
      msg91Error?: unknown;
    };
    apiError.code = mapped.code;
    apiError.statusCode = status;
    apiError.nonRetriable =
      mapped.code === "MSG91_AUTHENTICATION_FAILED" ||
      mapped.code === "MSG91_CONFIGURATION_MISSING" ||
      mapped.code === "MSG91_TEMPLATE_NOT_FOUND" ||
      mapped.code === "MSG91_INVALID_RECIPIENT";
    apiError.msg91Error = sanitizeErrorData(data);
    throw apiError;
  }
};

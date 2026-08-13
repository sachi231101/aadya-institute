/**
 * AiSensy HTTP client — low-level HTTP calls for WhatsApp.
 *
 * Provider-specific code is isolated here so the business layer never
 * depends on AiSensy's API format directly.
 *
 * @module modules/whatsapp/integrations/aisensy.client
 */
import axios, { type AxiosError } from "axios";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";

const client = axios.create({
  baseURL: env.AISENSY_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface AiSensySendRequest {
  /** Campaign name — must be set to "Live" in AiSensy dashboard */
  campaignName: string;
  /** Recipient phone in international format WITHOUT + e.g. "919876543210" */
  destination: string;
  /** Recipient display name (used for WhatsApp template personalisation) */
  userName: string;
  /** Ordered list of variable values matching the template placeholders */
  templateParams: string[];
  /** Optional media for media-header templates */
  media?: {
    url: string;
    filename: string;
  };
}

export interface AiSensySendResponse {
  success: boolean;
  msgId?: string;
  error?: string;
  code?: string;
}

export const aiSensySendMessage = async (
  payload: AiSensySendRequest
): Promise<AiSensySendResponse> => {
  const body = {
    apiKey: env.AISENSY_API_KEY,
    campaignName: payload.campaignName,
    destination: payload.destination,
    userName: payload.userName,
    templateParams: payload.templateParams,
    ...(payload.media ? { media: payload.media } : {}),
  };

  try {
    const res = await client.post<AiSensySendResponse>("", body);

    logger.debug(
      { campaignName: payload.campaignName, destination: payload.destination, msgId: res.data?.msgId },
      "[aisensy] Message sent successfully"
    );

    return res.data;
  } catch (err) {
    const axiosErr = err as AxiosError<AiSensySendResponse>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;

    logger.error(
      {
        status,
        data,
        campaign: payload.campaignName,
        destination: payload.destination,
      },
      "[aisensy] Send failed"
    );

    const apiError = new Error(
      data?.error ?? axiosErr.message ?? "AiSensy send failed"
    ) as NodeJS.ErrnoException;

    (apiError as any).code = data?.code ?? (status === 401 ? "INVALID_API_KEY" : undefined);
    (apiError as any).statusCode = status;
    (apiError as any).aiSensyError = data;

    throw apiError;
  }
};

import type { IntegrationType } from "@prisma/client";
import { logger } from "../../../config/logger";
import { decryptCredentials } from "../../../utils/integration-credentials.util";
import * as repo from "../integration.repository";

export interface TestResult {
  success: boolean;
  message: string;
  status?: string;
}

export const testAiConnection = async (
  instituteId: string
): Promise<TestResult> => {
  const row = await repo.findByInstituteAndType(instituteId, "AI");
  const creds = decryptCredentials(row?.encryptedCredentials);
  const apiKey = creds.apiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return { success: false, message: "API key is not configured" };
  }
  const baseUrl =
    (row?.configuration as { baseUrl?: string } | null)?.baseUrl ||
    process.env.LLM_BASE_URL ||
    "https://api.openai.com/v1";
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { success: false, message: `Provider returned ${res.status}` };
    }
    return { success: true, message: "Connection successful" };
  } catch (err) {
    logger.warn({ err, instituteId }, "AI integration test failed");
    return { success: false, message: "Connection failed" };
  }
};

export const testWhatsappConnection = async (
  instituteId: string
): Promise<TestResult> => {
  const { msg91Provider } = await import("../../whatsapp/integrations/msg91.provider");
  const result = await msg91Provider.testConnection(instituteId);
  return { success: result.success, message: result.message, status: result.status };
};

export const testAiCallingConnection = async (
  instituteId: string
): Promise<TestResult> => {
  const { resolveAiCallingConfig } = await import(
    "../../ai-calling/ai-calling.config"
  );
  const resolved = await resolveAiCallingConfig(instituteId);

  if (!resolved.telephonyApiKey) {
    return {
      success: false,
      message:
        "API key missing — set SARVAM_API_KEY or TELEPHONY_API_KEY in backend .env",
    };
  }
  const key = resolved.telephonyApiKey.trim();
  if (
    (key.startsWith("sk_samvaad_") && key.length < 32) ||
    key.length < 24
  ) {
    return {
      success: false,
      message:
        "API key looks truncated/incomplete. Copy the FULL key from Sarvam Voice Agents → Settings → API Key into backend .env (SARVAM_API_KEY), then restart.",
    };
  }
  if (!resolved.telephonyBaseUrl) {
    return {
      success: false,
      message:
        "Telephony base URL missing — set TELEPHONY_BASE_URL=https://apps.sarvam.ai/api/outbounds",
    };
  }
  if (!resolved.fromNumber) {
    return {
      success: false,
      message:
        "From number missing — set TELEPHONY_FROM_NUMBER or From number in this form",
    };
  }

  const orgId = process.env.SARVAM_ORG_ID || "";
  const workspaceId = process.env.SARVAM_WORKSPACE_ID || "";
  const appId = process.env.SARVAM_APP_ID || "";
  const connectionId = process.env.SARVAM_CONNECTION_ID || "";
  const missing: string[] = [];
  if (!orgId) missing.push("SARVAM_ORG_ID");
  if (!workspaceId) missing.push("SARVAM_WORKSPACE_ID");
  if (!appId) missing.push("SARVAM_APP_ID");
  if (!connectionId) missing.push("SARVAM_CONNECTION_ID");
  if (missing.length) {
    return {
      success: false,
      message: `Dial config incomplete — set ${missing.join(", ")} in backend .env`,
    };
  }

  if (!resolved.isEnabled) {
    return {
      success: false,
      message:
        "Config looks ready, but AI Calling is OFF — turn Enabled ON and Save first",
    };
  }

  // Live auth probe against Instant Outbound (incomplete body → no dial).
  try {
    const url = `${resolved.telephonyBaseUrl.replace(/\/$/, "")}/v1/orgs/${orgId}/workspaces/${workspaceId}/outbounds`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": resolved.telephonyApiKey,
      },
      body: JSON.stringify({
        app_config: {
          app_id: appId,
          app_version: Number(process.env.SARVAM_APP_VERSION || "1") || 1,
          connection_config: {
            connection_id: connectionId,
            agent_phone_number: resolved.fromNumber,
          },
        },
        user_config: {},
      }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();

    if (res.status === 401 || res.status === 403) {
      const detail =
        text.includes("Invalid API key format") || text.includes("Unauthorized")
          ? " Current key is rejected (often an api.sarvam.ai sk_ key). Create an API key in Sarvam Voice Agents → Settings → API Key and set SARVAM_API_KEY / TELEPHONY_API_KEY."
          : "";
      return {
        success: false,
        message: `Sarvam rejected API key (HTTP ${res.status}).${detail}`,
      };
    }

    if (res.status === 422) {
      return {
        success: true,
        message:
          "Sarvam Instant Outbound auth OK (validation-only probe, no dial). Place an AI Call on a lead to verify a live ring.",
      };
    }

    return {
      success: true,
      message: `Dial config reachable (HTTP ${res.status}). Place an AI Call on a lead to verify a live ring.`,
    };
  } catch (err) {
    logger.warn({ err, instituteId }, "AI Calling Sarvam auth probe failed");
    return {
      success: false,
      message:
        "Could not reach Sarvam Instant Outbound API — check network / TELEPHONY_BASE_URL",
    };
  }
};

export const testPaymentConnection = async (
  instituteId: string
): Promise<TestResult> => {
  const row = await repo.findByInstituteAndType(instituteId, "PAYMENT");
  const creds = decryptCredentials(row?.encryptedCredentials);
  const keyId = (row?.configuration as { keyId?: string } | null)?.keyId;
  const keySecret = creds.keySecret;
  if (!keyId || !keySecret) {
    return { success: false, message: "Razorpay Key ID and Secret are required" };
  }
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { success: false, message: `Provider returned ${res.status}` };
    }
    return { success: true, message: "Connection successful" };
  } catch (err) {
    logger.warn({ err, instituteId }, "Payment integration test failed");
    return { success: false, message: "Connection failed" };
  }
};

export const testEmailConnection = async (
  instituteId: string
): Promise<TestResult> => {
  const row = await repo.findByInstituteAndType(instituteId, "EMAIL");
  const config = (row?.configuration || {}) as {
    host?: string;
    port?: number;
    username?: string;
    secure?: boolean;
  };
  const creds = decryptCredentials(row?.encryptedCredentials);
  if (!config.host || !config.port || !config.username || !creds.password) {
    return { success: false, message: "SMTP host, port, username, and password are required" };
  }
  try {
    // Dynamic import so environments without nodemailer still compile if not installed.
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: Boolean(config.secure),
      auth: { user: config.username, pass: creds.password },
    });
    await transporter.verify();
    return { success: true, message: "Connection successful" };
  } catch (err) {
    logger.warn({ err, instituteId }, "Email integration test failed");
    return { success: false, message: "Connection failed" };
  }
};

export const testGoogleWorkspace = async (
  instituteId: string,
  userId: string
): Promise<TestResult> => {
  const { prisma } = await import("../../../config/database");
  const conn = await prisma.googleWorkspaceConnection.findFirst({
    where: { instituteId, userId, status: "CONNECTED" },
  });
  if (!conn) {
    return { success: false, message: "Google Workspace is not connected" };
  }
  return { success: true, message: "Connection successful" };
};

export const testGoogleSheets = async (
  instituteId: string,
  userId: string
): Promise<TestResult> => {
  const base = await testGoogleWorkspace(instituteId, userId);
  if (!base.success) return base;
  const row = await repo.findByInstituteAndType(instituteId, "GOOGLE_SHEETS");
  const spreadsheetId = (row?.configuration as { spreadsheetId?: string } | null)
    ?.spreadsheetId;
  if (!spreadsheetId) {
    return {
      success: true,
      message: "Google account connected (no spreadsheet selected yet)",
    };
  }
  return { success: true, message: "Connection successful" };
};

export const runIntegrationTest = async (
  instituteId: string,
  type: IntegrationType,
  userId: string
): Promise<TestResult> => {
  switch (type) {
    case "AI":
      return testAiConnection(instituteId);
    case "WHATSAPP":
      return testWhatsappConnection(instituteId);
    case "AI_CALLING":
      return testAiCallingConnection(instituteId);
    case "PAYMENT":
      return testPaymentConnection(instituteId);
    case "EMAIL":
      return testEmailConnection(instituteId);
    case "GOOGLE_WORKSPACE":
      return testGoogleWorkspace(instituteId, userId);
    case "GOOGLE_SHEETS":
      return testGoogleSheets(instituteId, userId);
    default:
      return { success: false, message: "Unsupported integration type" };
  }
};

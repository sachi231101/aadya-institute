import type { IntegrationType } from "@prisma/client";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { decryptCredentials } from "../../../utils/integration-credentials.util";
import * as repo from "../integration.repository";

export interface TestResult {
  success: boolean;
  message: string;
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
  const row = await repo.findByInstituteAndType(instituteId, "WHATSAPP");
  const creds = decryptCredentials(row?.encryptedCredentials);
  const apiKey = creds.apiKey || env.AISENSY_API_KEY;
  if (!apiKey) {
    return { success: false, message: "API key is not configured" };
  }
  // AiSensy does not expose a universal health endpoint; presence of key + base URL is enough for V1.
  if (!env.AISENSY_BASE_URL) {
    return { success: false, message: "WhatsApp provider base URL is missing" };
  }
  return { success: true, message: "Connection successful" };
};

export const testAiCallingConnection = async (
  instituteId: string
): Promise<TestResult> => {
  const row = await repo.findByInstituteAndType(instituteId, "AI_CALLING");
  const creds = decryptCredentials(row?.encryptedCredentials);
  const apiKey = creds.apiKey || process.env.SARVAM_API_KEY || "";
  if (!apiKey) {
    return { success: false, message: "API key is not configured" };
  }
  return { success: true, message: "Connection successful" };
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

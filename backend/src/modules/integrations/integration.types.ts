import type {
  Integration,
  IntegrationStatus,
  IntegrationTestStatus,
  IntegrationType,
} from "@prisma/client";

export const INTEGRATION_TYPES: IntegrationType[] = [
  "AI",
  "WHATSAPP",
  "AI_CALLING",
  "GOOGLE_WORKSPACE",
  "GOOGLE_SHEETS",
  "PAYMENT",
  "EMAIL",
];

export const INTEGRATION_CATALOG: Record<
  IntegrationType,
  {
    name: string;
    description: string;
    defaultProvider: string;
    providers: string[];
  }
> = {
  AI: {
    name: "AI Integration",
    description: "Connect AI services for Ask AI and academy intelligence.",
    defaultProvider: "OPENAI",
    providers: ["OPENAI"],
  },
  WHATSAPP: {
    name: "WhatsApp Integration",
    description: "Send WhatsApp notifications and campaign messages.",
    defaultProvider: "AISENSY",
    providers: ["AISENSY"],
  },
  AI_CALLING: {
    name: "AI Calling",
    description: "Automated lead and student voice calls.",
    defaultProvider: "SARVAM",
    providers: ["SARVAM"],
  },
  GOOGLE_WORKSPACE: {
    name: "Google Workspace",
    description: "Meet, Calendar, and Drive for classes and recordings.",
    defaultProvider: "GOOGLE",
    providers: ["GOOGLE"],
  },
  GOOGLE_SHEETS: {
    name: "Google Sheets",
    description: "Import and export academy data via Google Sheets.",
    defaultProvider: "GOOGLE",
    providers: ["GOOGLE"],
  },
  PAYMENT: {
    name: "Payment Gateway",
    description: "Online student fee payments.",
    defaultProvider: "RAZORPAY",
    providers: ["RAZORPAY"],
  },
  EMAIL: {
    name: "Email Integration",
    description: "Email notifications and academy communication.",
    defaultProvider: "SMTP",
    providers: ["SMTP"],
  },
};

export interface IntegrationCardDto {
  type: IntegrationType;
  name: string;
  description: string;
  provider: string | null;
  status: IntegrationStatus;
  isConfigured: boolean;
  isEnabled: boolean;
  maskedCredential: string | null;
  lastTestedAt: string | null;
  lastTestStatus: IntegrationTestStatus | null;
  lastError: string | null;
}

export interface IntegrationDetailDto extends IntegrationCardDto {
  id: string | null;
  configuration: Record<string, unknown>;
  connectedAt: string | null;
  connectedById: string | null;
  updatedAt: string | null;
}

export interface UpsertIntegrationInput {
  provider?: string;
  isEnabled?: boolean;
  configuration?: Record<string, unknown>;
  /** Only set when admin submits new secrets; omit to keep existing. */
  credentials?: Record<string, string | undefined | null>;
  replaceCredentials?: boolean;
}

export type IntegrationRow = Integration;

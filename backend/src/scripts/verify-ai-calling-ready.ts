/**
 * One-shot AI Calling readiness check (no live dial).
 * Run: npx tsx src/scripts/verify-ai-calling-ready.ts
 */
import "dotenv/config";
import { prisma } from "../config/database";
import { resolveAiCallingConfig } from "../modules/ai-calling/ai-calling.config";
import { isTelephonyConfigured } from "../modules/leads/services/lead-ai-call.service";

async function main() {
  const envChecks = {
    SARVAM_API_KEY: Boolean(process.env.SARVAM_API_KEY),
    TELEPHONY_BASE_URL: process.env.TELEPHONY_BASE_URL || null,
    TELEPHONY_FROM_NUMBER: process.env.TELEPHONY_FROM_NUMBER || null,
    PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL || null,
    SARVAM_ORG_ID: Boolean(process.env.SARVAM_ORG_ID),
    SARVAM_WORKSPACE_ID: Boolean(process.env.SARVAM_WORKSPACE_ID),
    SARVAM_APP_ID: process.env.SARVAM_APP_ID || null,
    SARVAM_CONNECTION_ID: Boolean(process.env.SARVAM_CONNECTION_ID),
    REDIS_URL: Boolean(process.env.REDIS_URL),
    isTelephonyConfigured: isTelephonyConfigured(),
  };

  const institutes = await prisma.institute.findMany({
    select: { id: true, name: true },
    take: 5,
  });

  const configs = [];
  for (const inst of institutes) {
    const resolved = await resolveAiCallingConfig(inst.id);
    const integration = await prisma.integration.findFirst({
      where: { instituteId: inst.id, type: "AI_CALLING" },
      select: { isEnabled: true, provider: true },
    });
    configs.push({
      institute: inst.name,
      instituteId: inst.id,
      isEnabled: resolved.isEnabled,
      hasTelephony: resolved.hasTelephony,
      fromNumber: resolved.fromNumber || null,
      source: resolved.source,
      integrationRowEnabled: integration?.isEnabled ?? null,
      telephonyBaseUrl: resolved.telephonyBaseUrl || null,
    });
  }

  const webhookPath = "/api/v1/webhooks/sarvam/callback";
  const publicBase =
    process.env.PUBLIC_API_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`;
  const webhookReachableFromSarvam =
    !publicBase.includes("localhost") && !publicBase.includes("127.0.0.1");

  console.log(
    JSON.stringify(
      {
        envChecks,
        institutes: configs,
        webhookCallbackUrl: `${publicBase}${webhookPath}`,
        webhookReachableFromSarvam,
        notes: [
          webhookReachableFromSarvam
            ? "Webhook URL is public — Sarvam can POST results"
            : "PUBLIC_API_BASE_URL is localhost — dial may work; call-result webhooks will NOT reach Aadya without ngrok/tunnel",
          "Turn AI Calling ON in Admin → Integrations if isEnabled is false",
          "Live ring proof requires Leads → AI Call on a real phone",
        ],
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

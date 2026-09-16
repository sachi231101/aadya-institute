/**
 * Place one live Lead → AI Call and poll CallLog for Sarvam acceptance.
 * Uses institute from-number as destination only if AI_CALLING_E2E_TO is unset —
 * prefer AI_CALLING_E2E_TO=+91XXXXXXXXXX for a real ring test.
 */
import "dotenv/config";
import { prisma } from "../config/database";

const BASE = process.env.PUBLIC_API_BASE_URL || "http://localhost:5000";
const API = BASE.includes("localhost")
  ? "http://localhost:5000"
  : "http://localhost:5000"; // always hit local API for create/dial; tunnel is for Sarvam webhooks

async function login(): Promise<string> {
  const passwords = [
    process.env.SEED_ADMIN_PASSWORD || "ChangeMe@123",
    "Admin@123",
    "Aadya@123",
    "password",
  ];
  const emails = ["admin@aadya.in", "admin@aadyainstitute.com", "admin@aadya.test"];
  for (const email of emails) {
    for (const password of passwords) {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: email, password }),
      });
      const body = (await res.json()) as {
        data?: { tokens?: { accessToken?: string }; accessToken?: string };
      };
      const token = body?.data?.tokens?.accessToken || body?.data?.accessToken;
      if (token) return token;
    }
  }
  throw new Error("Admin login failed");
}

function pickToNumber(): string {
  const explicit = (process.env.AI_CALLING_E2E_TO || "").trim();
  if (explicit) return explicit;
  // Previously used in CallLog attempts on this install
  return "7026803692";
}

async function main() {
  const token = await login();
  const to = pickToNumber();
  const createRes = await fetch(`${API}/api/v1/leads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "E2E Dial Probe",
      phoneNumber: to,
      interestedIn: "General Enquiry",
      notes: "Auto-created for AI Calling live-dial verification",
    }),
  });
  const createBody = (await createRes.json()) as {
    success?: boolean;
    message?: string;
    data?: { id?: string; phoneNumber?: string };
  };
  if (!createRes.ok || !createBody.data?.id) {
    console.log(
      JSON.stringify(
        { step: "createLead", status: createRes.status, body: createBody },
        null,
        2
      )
    );
    process.exit(2);
  }

  const leadId = createBody.data.id;

  // createLead auto-enqueues; also hit explicit endpoint for clarity
  const dialRes = await fetch(`${API}/api/v1/leads/${leadId}/ai-call`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const dialBody = await dialRes.json();

  let latest: {
    id: string;
    status: string;
    externalCallId: string | null;
    failureReason: string | null;
    fromNumber: string | null;
  } | null = null;

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    latest = await prisma.callLog.findFirst({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        externalCallId: true,
        failureReason: true,
        fromNumber: true,
      },
    });
    if (
      latest &&
      latest.externalCallId &&
      !latest.externalCallId.startsWith("queued_") &&
      !latest.externalCallId.startsWith("local_")
    ) {
      break;
    }
    if (latest && ["FAILED", "COMPLETED", "NO_ANSWER", "BUSY"].includes(latest.status)) {
      break;
    }
  }

  const webhookUrl = `${process.env.PUBLIC_API_BASE_URL}/api/v1/webhooks/sarvam/callback`;
  const accepted =
    Boolean(latest?.externalCallId) &&
    !String(latest?.externalCallId).startsWith("queued_") &&
    !String(latest?.externalCallId).startsWith("local_") &&
    latest?.status !== "FAILED";

  console.log(
    JSON.stringify(
      {
        leadId,
        toLast4: to.replace(/\D/g, "").slice(-4),
        dialHttpStatus: dialRes.status,
        dialBody,
        callLog: latest,
        webhookCallbackConfigured: webhookUrl,
        liveDialAccepted: accepted,
        note: accepted
          ? "Sarvam accepted outbound (provider call id present)."
          : "Dial not accepted yet — check failureReason / worker logs.",
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
  process.exit(accepted ? 0 : 2);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

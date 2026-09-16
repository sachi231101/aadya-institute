/**
 * Prove Sarvam webhook handler updates CallLog (local POST; no provider required).
 * Usage: npx tsx src/scripts/prove-sarvam-webhook.ts [externalCallId]
 */
import "dotenv/config";
import { prisma } from "../config/database";

const API = "http://localhost:5000";

async function main() {
  const argId = process.argv[2];
  const callLog = argId
    ? await prisma.callLog.findFirst({ where: { externalCallId: argId } })
    : await prisma.callLog.findFirst({
        where: {
          externalCallId: { not: null },
          NOT: [
            { externalCallId: { startsWith: "queued_" } },
            { externalCallId: { startsWith: "local_" } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

  if (!callLog?.externalCallId || !callLog.leadId) {
    console.log(JSON.stringify({ success: false, message: "No live CallLog to update" }));
    process.exit(2);
  }

  const payload = {
    attempt_id: callLog.externalCallId,
    status: "COMPLETED",
    duration: 42,
    customer_number: "7026803692",
    recording_url: "https://example.com/recording-e2e.mp3",
    interaction_transcript: [
      { role: "agent", text: "Hello from E2E webhook probe" },
      { role: "user", text: "Interested in a course" },
    ],
    final_agent_variables: {
      interestStatus: "HIGH",
      summary: "E2E webhook probe summary",
    },
    metadata: {
      leadId: callLog.leadId,
      instituteId: callLog.instituteId,
      callLogId: callLog.id,
    },
  };

  const res = await fetch(`${API}/api/v1/webhooks/sarvam/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();

  // Handler acks then processes async — brief wait
  await new Promise((r) => setTimeout(r, 2000));

  const updated = await prisma.callLog.findUnique({
    where: { id: callLog.id },
    select: {
      id: true,
      status: true,
      duration: true,
      interestStatus: true,
      aiSummary: true,
      transcript: true,
      recordingUrl: true,
      externalCallId: true,
    },
  });

  const followUp = await prisma.leadFollowUp.findFirst({
    where: { leadId: callLog.leadId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, notes: true, createdAt: true },
  });

  const ok =
    res.status === 200 &&
    updated?.status === "COMPLETED" &&
    Boolean(updated.aiSummary);

  console.log(
    JSON.stringify(
      {
        success: ok,
        httpStatus: res.status,
        ack: body,
        beforeStatus: callLog.status,
        after: updated,
        followUpCreated: followUp,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
  process.exit(ok ? 0 : 2);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

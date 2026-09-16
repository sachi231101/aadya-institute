/**
 * Prove whether current SARVAM_API_KEY works on api.sarvam.ai (STT stack)
 * vs apps.sarvam.ai Instant Outbound (Voice Agents).
 */
import "dotenv/config";

async function main() {
  const key = process.env.SARVAM_API_KEY || "";
  const org = process.env.SARVAM_ORG_ID || "";
  const ws = process.env.SARVAM_WORKSPACE_ID || "";

  const stt = await fetch("https://api.sarvam.ai/text-lid", {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: "namaste" }),
  });
  const sttBody = await stt.text();

  const outboundUrl = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${org}/workspaces/${ws}/outbounds`;
  const outbound = await fetch(outboundUrl, {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_config: {
        app_id: process.env.SARVAM_APP_ID,
        app_version: 1,
        connection_config: {
          connection_id: process.env.SARVAM_CONNECTION_ID,
          agent_phone_number: process.env.TELEPHONY_FROM_NUMBER,
        },
      },
      user_config: {},
    }),
  });
  const outboundBody = await outbound.text();

  console.log(
    JSON.stringify(
      {
        keyPrefix: key.slice(0, 6),
        apiSarvamAi_textLid: {
          status: stt.status,
          ok: stt.ok,
          preview: sttBody.slice(0, 180),
        },
        appsSarvamAi_instantOutbound: {
          status: outbound.status,
          ok: outbound.ok,
          preview: outboundBody.slice(0, 180),
        },
        conclusion:
          stt.ok && (outbound.status === 401 || outbound.status === 403)
            ? "KEY_IS_STT_SUBSCRIPTION_NOT_VOICE_AGENTS"
            : outbound.status === 422
              ? "KEY_WORKS_FOR_VOICE_AGENTS"
              : "CHECK_RESULTS",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

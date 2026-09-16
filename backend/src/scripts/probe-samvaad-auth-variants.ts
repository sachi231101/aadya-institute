/**
 * Try auth variants for Samvaad Instant Outbound (no dial).
 */
import "dotenv/config";

async function attempt(
  label: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
) {
  const org = process.env.SARVAM_ORG_ID || "";
  const ws = process.env.SARVAM_WORKSPACE_ID || "";
  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${org}/workspaces/${ws}/outbounds`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    return { label, status: res.status, preview: text.slice(0, 280) };
  } catch (err) {
    return {
      label,
      status: 0,
      preview: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const key = process.env.SARVAM_API_KEY || "";
  const truncated = key.startsWith("sk_samvaad_")
    ? key.slice("sk_samvaad_".length)
    : key;

  const baseBody = {
    app_config: {
      app_id: process.env.SARVAM_APP_ID,
      app_version: 1,
      connection_config: {
        connection_id: process.env.SARVAM_CONNECTION_ID,
        agent_phone_number: process.env.TELEPHONY_FROM_NUMBER,
      },
    },
    user_config: {},
  };

  const results = [
    await attempt("X-API-Key full", { "X-API-Key": key }, baseBody),
    await attempt("X-API-Key suffix", { "X-API-Key": truncated }, baseBody),
    await attempt("Bearer full", { Authorization: `Bearer ${key}` }, baseBody),
    await attempt(
      "both Bearer+X-API-Key",
      { Authorization: `Bearer ${key}`, "X-API-Key": key },
      baseBody
    ),
    await attempt(
      "api-subscription-key",
      { "api-subscription-key": key },
      baseBody
    ),
  ];

  console.log(
    JSON.stringify(
      {
        keyPrefix: key.slice(0, 12),
        keyLength: key.length,
        results,
        hint:
          "422 with missing user_phone_number = auth accepted. 401 Invalid API key format = wrong key/header.",
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

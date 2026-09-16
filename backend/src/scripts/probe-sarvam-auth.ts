/**
 * Probe Sarvam Voice Agents auth + scope (no outbound dial).
 * Tries both X-API-Key and api-subscription-key.
 * Run: npx tsx src/scripts/probe-sarvam-auth.ts
 */
import "dotenv/config";

async function probe(
  name: string,
  url: string,
  key: string,
  headerName: "X-API-Key" | "api-subscription-key" | "API-Subscription-Key"
) {
  try {
    const res = await fetch(url, {
      headers: {
        [headerName]: key,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    return {
      name,
      header: headerName,
      status: res.status,
      ok: res.ok,
      bodyPreview: text.slice(0, 500),
    };
  } catch (err) {
    return {
      name,
      header: headerName,
      status: 0,
      ok: false,
      bodyPreview: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const org = process.env.SARVAM_ORG_ID || "";
  const ws = process.env.SARVAM_WORKSPACE_ID || "";
  const key = process.env.SARVAM_API_KEY || "";
  const app = process.env.SARVAM_APP_ID || "";
  const conn = process.env.SARVAM_CONNECTION_ID || "";
  const from = process.env.TELEPHONY_FROM_NUMBER || "";

  if (!org || !ws || !key) {
    console.log(
      JSON.stringify({
        success: false,
        message: "Missing SARVAM_ORG_ID / SARVAM_WORKSPACE_ID / SARVAM_API_KEY",
      })
    );
    process.exit(1);
  }

  const deploymentsUrl = `https://apps.sarvam.ai/api/app-authoring/v1/orgs/${org}/workspaces/${ws}/deployments`;
  const outboundsUrl = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${org}/workspaces/${ws}/outbounds`;

  const results = [
    await probe("deployments", deploymentsUrl, key, "X-API-Key"),
    await probe("deployments", deploymentsUrl, key, "api-subscription-key"),
    await probe("deployments", deploymentsUrl, key, "API-Subscription-Key"),
    await probe("outbounds_get", outboundsUrl, key, "X-API-Key"),
    await probe("outbounds_get", outboundsUrl, key, "api-subscription-key"),
  ];

  const accepted = results.filter((r) => r.status !== 401 && r.status !== 403);
  const best = accepted.find((r) => r.ok) || accepted[0] || null;

  console.log(
    JSON.stringify(
      {
        env: {
          hasKey: Boolean(key),
          keyPrefix: key.slice(0, 6),
          orgSet: Boolean(org),
          workspaceSet: Boolean(ws),
          app,
          connectionSet: Boolean(conn),
          from,
        },
        results,
        summary: {
          anyNonAuthError: accepted.length > 0,
          preferredHeader: best?.header || null,
          diagnosis:
            results.every((r) => r.status === 401 || r.status === 403)
              ? "API key rejected by Sarvam Voice Agents — get key from Voice Agents dashboard Settings → API Key (may differ from api.sarvam.ai sk_ key)"
              : "At least one probe passed auth gate",
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

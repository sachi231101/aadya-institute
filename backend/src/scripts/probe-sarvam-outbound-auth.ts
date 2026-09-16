/**
 * Auth-only Instant Outbound probe (incomplete body → no dial).
 * Expect 401/403 if key wrong, 422 if key OK but body invalid.
 */
import "dotenv/config";

async function main() {
  const org = process.env.SARVAM_ORG_ID || "";
  const ws = process.env.SARVAM_WORKSPACE_ID || "";
  const key = process.env.SARVAM_API_KEY || "";
  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${org}/workspaces/${ws}/outbounds`;

  const body = {
    app_config: {
      app_id: process.env.SARVAM_APP_ID,
      app_version: Number(process.env.SARVAM_APP_VERSION || "1") || 1,
      connection_config: {
        connection_id: process.env.SARVAM_CONNECTION_ID,
        agent_phone_number: process.env.TELEPHONY_FROM_NUMBER,
      },
    },
    // Intentionally incomplete — missing user_phone_number so Sarvam should not dial
    user_config: {},
  };

  const headersVariants: Array<Record<string, string>> = [
    { "Content-Type": "application/json", "X-API-Key": key },
    { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
  ];

  const results = [];
  for (const headers of headersVariants) {
    const authLabel = headers["X-API-Key"]
      ? "X-API-Key"
      : headers.Authorization
        ? "Bearer"
        : "unknown";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const text = await res.text();
      results.push({
        auth: authLabel,
        status: res.status,
        bodyPreview: text.slice(0, 500),
        interpretation:
          res.status === 401 || res.status === 403
            ? "KEY_REJECTED"
            : res.status === 422
              ? "KEY_ACCEPTED_VALIDATION_FAILED_NO_DIAL"
              : res.status >= 200 && res.status < 300
                ? "UNEXPECTED_SUCCESS_CHECK_IF_DIALED"
                : `OTHER_${res.status}`,
      });
    } catch (err) {
      results.push({
        auth: authLabel,
        status: 0,
        bodyPreview: err instanceof Error ? err.message : String(err),
        interpretation: "NETWORK_ERROR",
      });
    }
  }

  console.log(JSON.stringify({ url, keyPrefix: key.slice(0, 6), results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

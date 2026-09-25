import { UniversalLLMClient } from "../integrations/llm/llm.client";

async function main() {
  const c = new UniversalLLMClient({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
    model: process.env.LLM_MODEL || "gemini-3.8-flash",
  });
  const r = await c.generateChatCompletion(
    [{ role: "user", content: "Reply with exactly: OK" }],
    [],
    { temperature: 0, maxTokens: 20 }
  );
  console.log(
    JSON.stringify(
      {
        content: r.message.content,
        finish: r.finishReason,
        usedLive: Boolean(r.message.content && !r.message.toolCalls),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err?.response?.data || err?.message || err);
  process.exit(1);
});

import axios from "axios";
import "../config/env";

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const base = (process.env.LLM_BASE_URL || "").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "gemini-3.8-flash";
  if (!key || !base) throw new Error("Missing GEMINI_API_KEY / LLM_BASE_URL");

  const tools = [
    {
      type: "function",
      function: {
        name: "get_daily_operations_summary",
        description: "Daily ops summary",
        parameters: { type: "object", properties: {} },
      },
    },
  ];

  const r1 = await axios.post(
    `${base}/chat/completions`,
    {
      model,
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        { role: "system", content: "Use tools for institute questions." },
        { role: "user", content: "What is today's daily operations summary?" },
      ],
      tools,
      tool_choice: "auto",
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  const msg = r1.data.choices[0].message;
  console.log("finish", r1.data.choices[0].finish_reason);
  console.log("message_keys", Object.keys(msg));
  console.log("tool_calls", JSON.stringify(msg.tool_calls, null, 2));

  if (!msg.tool_calls?.length) {
    console.log("no tool calls; content=", msg.content);
    return;
  }

  const toolCall = msg.tool_calls[0];
  const r2 = await axios.post(
    `${base}/chat/completions`,
    {
      model,
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        { role: "system", content: "Use tools for institute questions." },
        { role: "user", content: "What is today's daily operations summary?" },
        {
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.tool_calls,
        },
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            summaryText: "3 classes, 1 admission, 2 follow-ups due today.",
          }),
        },
      ],
      tools,
      tool_choice: "auto",
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  console.log("round2_finish", r2.data.choices[0].finish_reason);
  console.log("round2_content", r2.data.choices[0].message.content);
}

main().catch((e) => {
  console.error("FAIL", JSON.stringify(e.response?.data || e.message, null, 2));
  process.exit(1);
});

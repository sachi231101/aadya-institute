import axios from "axios";
import type {
  ChatMessage,
  ToolFunctionDefinition,
  LLMCompletionResult,
  LLMProvider,
  ToolCall,
} from "./llm.types";
import { logger } from "../../config/logger";

export class UniversalLLMClient implements LLMProvider {
  private apiKey: string | undefined;
  private baseURL: string;
  private model: string;

  constructor(options?: { apiKey?: string; baseURL?: string; model?: string }) {
    const provider = (process.env.LLM_PROVIDER || "GEMINI").toUpperCase();
    const isGemini = provider === "GEMINI";
    this.apiKey =
      options?.apiKey ??
      process.env.GEMINI_API_KEY ??
      process.env.LLM_API_KEY ??
      process.env.OPENAI_API_KEY;
    this.baseURL =
      options?.baseURL ??
      process.env.LLM_BASE_URL ??
      (isGemini
        ? "https://generativelanguage.googleapis.com/v1beta/openai"
        : "https://api.openai.com/v1");
    this.model =
      options?.model ??
      process.env.LLM_MODEL ??
      (isGemini ? "gemini-3.8-flash" : "gpt-4o-mini");
  }

  /** Map retired Gemini model ids to a current default. */
  private resolveLiveModel(): string {
    const raw = this.normalizeModelId(this.model);
    const retired: Record<string, string> = {
      "gemini-2.0-flash": "gemini-3.8-flash",
      "gemini-2.0-flash-001": "gemini-3.8-flash",
      "gemini-2.0-flash-exp": "gemini-3.8-flash",
      "gemini-2.5-flash": "gemini-3.8-flash",
      "gemini-1.5-flash": "gemini-3.8-flash",
      "gemini-1.5-pro": "gemini-3.1-pro-preview",
      "gemini-2.5-pro": "gemini-3.1-pro-preview",
    };
    return retired[raw] || raw;
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    tools: ToolFunctionDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMCompletionResult> {
    const useLive =
      Boolean(this.apiKey) &&
      this.apiKey !== "mock" &&
      !process.env.USE_MOCK_LLM;

    if (useLive) {
      try {
        return await this.callLiveAPI(messages, tools, options);
      } catch (err: any) {
        const status = err?.response?.status as number | undefined;
        const data = err?.response?.data;
        const nested =
          (Array.isArray(data) ? data[0]?.error?.message : null) ||
          data?.error?.message ||
          data?.message;
        const providerMessage = nested || err?.message;
        logger.warn(
          {
            err: providerMessage,
            status,
            model: this.resolveLiveModel(),
            baseURL: this.baseURL,
          },
          "Live LLM API call failed"
        );

        // Opt-in only: silent local fallback (tests / offline demos)
        if (process.env.ALLOW_LLM_FALLBACK === "1") {
          logger.warn("ALLOW_LLM_FALLBACK=1 — using local reasoning engine");
          return this.executeDeterministicAgent(messages, tools);
        }

        const hint =
          status === 404
            ? " Check LLM_MODEL (use gemini-3.8-flash)."
            : status === 503 || status === 429
              ? " Gemini is busy — retry in a moment."
              : "";
        throw new Error(
          `Gemini LLM unavailable (${status || "error"}): ${providerMessage}${hint}`
        );
      }
    }

    return this.executeDeterministicAgent(messages, tools);
  }

  private normalizeModelId(model: string): string {
    // Gemini OpenAI-compat accepts "gemini-2.5-flash" (not "models/gemini-2.5-flash")
    return model.replace(/^models\//, "").trim();
  }

  private async callLiveAPI(
    messages: ChatMessage[],
    tools: ToolFunctionDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMCompletionResult> {
    const model = this.resolveLiveModel();
    const formattedTools = tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const formattedMessages = messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool",
          content: m.content,
          tool_call_id: m.toolCallId,
        };
      }
      if (m.role === "assistant" && m.toolCalls) {
        const encodedMsg: Record<string, unknown> = {
          role: "assistant",
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => {
            const encoded: Record<string, unknown> = {
              id: tc.id,
              type: "function",
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            };
            // Gemini 3.x: must echo thought_signature / extra_content or tool turns 400
            if (tc.extra_content) {
              encoded.extra_content = tc.extra_content;
            } else if (tc.thought_signature) {
              encoded.extra_content = {
                google: { thought_signature: tc.thought_signature },
              };
            }
            return encoded;
          }),
        };
        if (m.extra_content) {
          encodedMsg.extra_content = m.extra_content;
        }
        return encodedMsg;
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    const base = this.baseURL.replace(/\/$/, "");
    const isGeminiHost = /generativelanguage\.googleapis\.com/i.test(base);
    const payload: Record<string, unknown> = {
      model,
      messages: formattedMessages,
      tools: formattedTools.length > 0 ? formattedTools : undefined,
      tool_choice: formattedTools.length > 0 ? "auto" : undefined,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 1000,
    };
    // Reduce Gemini-3 "thinking" friction for tool loops when supported by OpenAI-compat.
    if (isGeminiHost) {
      payload.reasoning_effort = process.env.LLM_REASONING_EFFORT || "low";
    }

    const maxAttempts = 3;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.post(`${base}/chat/completions`, payload, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 45000,
        });

        const choice = response.data.choices[0];
        const rawToolCalls = choice.message.tool_calls || [];
        const toolCalls: ToolCall[] = rawToolCalls.map((tc: any) => {
          const thoughtSignature =
            tc.thought_signature ||
            tc.extra_content?.google?.thought_signature ||
            tc.function?.thought_signature;
          const extra =
            tc.extra_content ||
            (thoughtSignature
              ? { google: { thought_signature: thoughtSignature } }
              : undefined);
          return {
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.function.name,
              arguments:
                typeof tc.function.arguments === "string"
                  ? tc.function.arguments
                  : JSON.stringify(tc.function.arguments ?? {}),
            },
            ...(extra ? { extra_content: extra } : {}),
            ...(thoughtSignature ? { thought_signature: thoughtSignature } : {}),
          };
        });

        return {
          message: {
            role: "assistant",
            content: choice.message.content,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            ...(choice.message.extra_content
              ? { extra_content: choice.message.extra_content }
              : {}),
          },
          finishReason: choice.finish_reason === "tool_calls" ? "tool_calls" : "stop",
          usage: response.data.usage
            ? {
                promptTokens: response.data.usage.prompt_tokens,
                completionTokens: response.data.usage.completion_tokens,
                totalTokens: response.data.usage.total_tokens,
              }
            : undefined,
        };
      } catch (err: any) {
        lastErr = err;
        const status = err?.response?.status;
        const data = err?.response?.data;
        const providerMessage =
          (Array.isArray(data) ? data[0]?.error?.message : null) ||
          data?.error?.message ||
          data?.message ||
          err?.message;
        const retryable = status === 429 || status === 503;
        // Do not retry thought_signature / validation 400s
        if (!retryable || attempt === maxAttempts) {
          if (status === 400) {
            logger.warn(
              { providerMessage, model, attempt },
              "[LLM] Gemini rejected request (likely tool/signature)"
            );
          }
          break;
        }
        const delayMs = attempt * 1500;
        logger.warn(
          { status, attempt, model, delayMs, providerMessage },
          "[LLM] Transient Gemini error — retrying"
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastErr;
  }

  /**
   * Deterministic local reasoning engine for offline/test environments.
   * Matches natural-language queries to tool calls or formulates final responses from tool results.
   */
  private executeDeterministicAgent(
    messages: ChatMessage[],
    tools: ToolFunctionDefinition[]
  ): LLMCompletionResult {
    const lastMessage = messages[messages.length - 1];

    // 1. If last message is a TOOL result, synthesize natural-language response
    if (lastMessage.role === "tool") {
      const toolMessages = messages.filter((m) => m.role === "tool");
      let synthesis = "";

      for (const tm of toolMessages) {
        try {
          const parsed = JSON.parse(tm.content);
          if (parsed.summaryText) {
            synthesis += (synthesis ? "\n" : "") + parsed.summaryText;
          } else if (typeof parsed === "object") {
            const keys = Object.keys(parsed);
            const keyDesc = keys
              .map((k) => `${k}: ${typeof parsed[k] === "object" ? JSON.stringify(parsed[k]) : parsed[k]}`)
              .join(", ");
            synthesis += (synthesis ? "\n" : "") + `Data summary: ${keyDesc}`;
          }
        } catch {
          synthesis += (synthesis ? "\n" : "") + tm.content;
        }
      }

      return {
        message: {
          role: "assistant",
          content: synthesis || "Here is the requested data based on your authorized institute records.",
        },
        finishReason: "stop",
      };
    }

    // 2. Process user message
    const userMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const lowerQuery = userMessage.toLowerCase().trim();

    // Check for general knowledge / unrelated questions
    const generalKeywords = [
      "what is python",
      "who is",
      "tell me a joke",
      "weather in",
      "write a poem",
      "capital of",
      "how to code",
      "what is javascript",
      "recipe",
    ];
    if (generalKeywords.some((kw) => lowerQuery.includes(kw))) {
      return {
        message: {
          role: "assistant",
          content: "I can only answer questions about your institute's data and operations.",
        },
        finishReason: "stop",
      };
    }

    const toolCalls: ToolCall[] = [];

    // Multi-condition check: Attendance below threshold AND pending fees
    if (
      (lowerQuery.includes("attendance") && lowerQuery.includes("fee")) ||
      (lowerQuery.includes("attendance") && lowerQuery.includes("due"))
    ) {
      const thresholdMatch = lowerQuery.match(/(\d+)\s*%/);
      const threshold = thresholdMatch ? parseInt(thresholdMatch[1], 10) : 75;

      toolCalls.push({
        id: `call_${Date.now()}_1`,
        type: "function",
        function: {
          name: "get_low_attendance_students",
          arguments: JSON.stringify({ threshold }),
        },
      });
      toolCalls.push({
        id: `call_${Date.now()}_2`,
        type: "function",
        function: {
          name: "get_overdue_fees",
          arguments: JSON.stringify({}),
        },
      });
    }
    // Attendance queries
    else if (lowerQuery.includes("attendance") && (lowerQuery.includes("below") || lowerQuery.includes("low") || lowerQuery.includes("<"))) {
      const thresholdMatch = lowerQuery.match(/(\d+)\s*%/);
      const threshold = thresholdMatch ? parseInt(thresholdMatch[1], 10) : 75;

      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_low_attendance_students",
          arguments: JSON.stringify({ threshold }),
        },
      });
    } else if (lowerQuery.includes("attendance")) {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_attendance_summary",
          arguments: JSON.stringify({}),
        },
      });
    }
    // Counsellor performance
    else if (
      lowerQuery.includes("counsellor") ||
      lowerQuery.includes("counselor") ||
      (lowerQuery.includes("converted") && lowerQuery.includes("lead"))
    ) {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_counsellor_performance",
          arguments: JSON.stringify({ period: "month" }),
        },
      });
    }
    // Lead follow-ups
    else if (lowerQuery.includes("follow-up") || lowerQuery.includes("follow up") || lowerQuery.includes("followup")) {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_lead_followups",
          arguments: JSON.stringify({}),
        },
      });
    }
    // Leads summary
    else if (lowerQuery.includes("lead")) {
      const period = lowerQuery.includes("week") ? "week" : lowerQuery.includes("today") ? "today" : "month";
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_lead_summary",
          arguments: JSON.stringify({ period }),
        },
      });
    }
    // Fees & Payments
    else if (
      lowerQuery.includes("fee") &&
      (lowerQuery.includes("pending") || lowerQuery.includes("overdue") || lowerQuery.includes("due") || lowerQuery.includes("defaulter"))
    ) {
      if (lowerQuery.includes("which student") || lowerQuery.includes("who")) {
        toolCalls.push({
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name: "get_overdue_fees",
            arguments: JSON.stringify({}),
          },
        });
      } else {
        toolCalls.push({
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name: "get_fee_summary",
            arguments: JSON.stringify({}),
          },
        });
      }
    } else if (lowerQuery.includes("fee") || lowerQuery.includes("payment") || lowerQuery.includes("revenue")) {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_fee_summary",
          arguments: JSON.stringify({}),
        },
      });
    }
    // Admissions
    else if (lowerQuery.includes("admission")) {
      const period = lowerQuery.includes("week") ? "week" : lowerQuery.includes("month") ? "month" : "all";
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_admission_summary",
          arguments: JSON.stringify({ period }),
        },
      });
    }
    // Course & Batch
    else if (lowerQuery.includes("course")) {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_course_summary",
          arguments: JSON.stringify({}),
        },
      });
    } else if (lowerQuery.includes("batch")) {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_batch_summary",
          arguments: JSON.stringify({}),
        },
      });
    }
    // Branch / Operations overview
    else if (
      lowerQuery.includes("branch") ||
      lowerQuery.includes("overview") ||
      lowerQuery.includes("today's operation") ||
      lowerQuery.includes("performance")
    ) {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_branch_summary",
          arguments: JSON.stringify({}),
        },
      });
    }
    // Students summary / count (Default student query)
    else if (lowerQuery.includes("student") || /\b(details?|profile)\b/.test(lowerQuery)) {
      const phoneMatch = lowerQuery.match(/(?:\+?\d[\d\s-]{7,}\d)/);
      const detailIntent =
        /\b(detail|details|profile|info|information|show|tell)\b/.test(lowerQuery) ||
        Boolean(phoneMatch);

      if (detailIntent || phoneMatch) {
        let query = phoneMatch ? phoneMatch[0].replace(/\s+/g, "") : "";
        if (!query) {
          const forMatch = lowerQuery.match(
            /(?:details?|profile|info|information|about|for|of)\s+(?:student\s+)?(.+)$/i
          );
          query = (forMatch?.[1] || "")
            .replace(/\b(student|details?|profile|please|show|me|the)\b/gi, "")
            .trim();
        }
        if (query.length >= 2) {
          toolCalls.push({
            id: `call_${Date.now()}`,
            type: "function",
            function: {
              name: "get_student_details",
              arguments: JSON.stringify({ query }),
            },
          });
        } else if (lowerQuery.includes("search") || lowerQuery.includes("find")) {
          const nameMatch = lowerQuery.replace(/search|find|student/g, "").trim();
          toolCalls.push({
            id: `call_${Date.now()}`,
            type: "function",
            function: {
              name: "search_students",
              arguments: JSON.stringify({ query: nameMatch || "A" }),
            },
          });
        } else {
          toolCalls.push({
            id: `call_${Date.now()}`,
            type: "function",
            function: {
              name: "get_student_summary",
              arguments: JSON.stringify({}),
            },
          });
        }
      } else if (lowerQuery.includes("search") || lowerQuery.includes("find")) {
        const nameMatch = lowerQuery.replace(/search|find|student/g, "").trim();
        toolCalls.push({
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name: "search_students",
            arguments: JSON.stringify({ query: nameMatch || "A" }),
          },
        });
      } else {
        toolCalls.push({
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name: "get_student_summary",
            arguments: JSON.stringify({}),
          },
        });
      }
    }
    // Fallback: Branch Summary
    else {
      toolCalls.push({
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: "get_branch_summary",
          arguments: JSON.stringify({}),
        },
      });
    }

    return {
      message: {
        role: "assistant",
        content: null,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      finishReason: toolCalls.length > 0 ? "tool_calls" : "stop",
    };
  }
}

export const llmClient = new UniversalLLMClient();

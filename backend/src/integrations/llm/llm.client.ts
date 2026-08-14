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

  constructor() {
    this.apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    this.baseURL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    this.model = process.env.LLM_MODEL || "gpt-4o-mini";
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    tools: ToolFunctionDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMCompletionResult> {
    // If live API key is configured, use live LLM endpoint
    if (this.apiKey && this.apiKey !== "mock" && !process.env.USE_MOCK_LLM) {
      try {
        return await this.callLiveAPI(messages, tools, options);
      } catch (err: any) {
        logger.warn({ err: err.message }, "Live LLM API call failed, falling back to local reasoning engine");
      }
    }

    // Default: High-performance deterministic tool selector & response synthesizer
    return this.executeDeterministicAgent(messages, tools);
  }

  private async callLiveAPI(
    messages: ChatMessage[],
    tools: ToolFunctionDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMCompletionResult> {
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
        return {
          role: "assistant",
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: formattedMessages,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? "auto" : undefined,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const choice = response.data.choices[0];
    const toolCalls: ToolCall[] = (choice.message.tool_calls || []).map((tc: any) => ({
      id: tc.id,
      type: "function",
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    return {
      message: {
        role: "assistant",
        content: choice.message.content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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
    else if (lowerQuery.includes("student")) {
      if (lowerQuery.includes("search") || lowerQuery.includes("find")) {
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

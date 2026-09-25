export interface ToolFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
  /** Provider-specific fields to echo (Gemini thought signatures, etc.) */
  extra_content?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
  /**
   * Gemini 3+ OpenAI-compat requires echoing thought signatures on later turns.
   * Preserve provider extra_content (e.g. google.thought_signature) verbatim.
   */
  extra_content?: Record<string, unknown>;
  thought_signature?: string;
}

export interface LLMCompletionResult {
  message: {
    role: "assistant";
    content: string | null;
    toolCalls?: ToolCall[];
    extra_content?: Record<string, unknown>;
  };
  finishReason: "stop" | "tool_calls" | "length" | "error";
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generateChatCompletion(
    messages: ChatMessage[],
    tools: ToolFunctionDefinition[],
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<LLMCompletionResult>;
}

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
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface LLMCompletionResult {
  message: {
    role: "assistant";
    content: string | null;
    toolCalls?: ToolCall[];
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

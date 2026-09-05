import { UniversalLLMClient } from "./llm.client";
import type {
  ChatMessage,
  ToolFunctionDefinition,
  LLMCompletionResult,
} from "./llm.types";
import { resolveAiCredentials } from "../../modules/integrations/integration.service";

/**
 * Central AI gateway — all modules should call this instead of constructing
 * LLM clients with ad-hoc credentials. Decrypts institute Integration secrets
 * in memory only; falls back to env LLM_API_KEY / OPENAI_API_KEY.
 */
export class AIGatewayService {
  async generateChatCompletion(
    instituteId: string,
    messages: ChatMessage[],
    tools: ToolFunctionDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMCompletionResult> {
    const creds = await resolveAiCredentials(instituteId);
    if (!creds.isEnabled) {
      const client = new UniversalLLMClient();
      return client.generateChatCompletion(messages, tools, options);
    }

    const client = new UniversalLLMClient({
      apiKey: creds.apiKey || undefined,
      baseURL: creds.baseUrl,
      model: creds.model,
    });
    return client.generateChatCompletion(messages, tools, options);
  }
}

export const aiGateway = new AIGatewayService();

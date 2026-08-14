import type { AuthUser } from "../auth/auth.types";
import { AISecurityScopeService } from "./security/ai-scope.service";
import { AIAgentRepository } from "./ai-agent.repository";
import { AI_TOOL_DEFINITIONS, executeAITool } from "./tools";
import { llmClient } from "../../integrations/llm/llm.client";
import { buildSystemPrompt } from "../../integrations/llm/system-prompt";
import type { ChatMessage } from "../../integrations/llm/llm.types";
import type { AIChatRequestDTO, AIChatResponseDTO } from "./ai-agent.types";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { logger } from "../../config/logger";

export const AIAgentService = {
  /**
   * Process a natural language question with authorized tool execution.
   */
  async processChatMessage(
    currentUser: AuthUser,
    dto: AIChatRequestDTO
  ): Promise<AIChatResponseDTO> {
    const startTime = Date.now();

    // 1. Build immutable server-side auth context (enforces role & branch isolation)
    const authContext = AISecurityScopeService.buildAuthContext(currentUser);

    // 2. Fetch Institute and Branch details for contextual system prompt
    const [institute, branch] = await Promise.all([
      prisma.institute.findUnique({
        where: { id: authContext.instituteId },
        select: { name: true },
      }),
      authContext.branchId
        ? prisma.branch.findUnique({
            where: { id: authContext.branchId },
            select: { name: true },
          })
        : null,
    ]);

    const instituteName = institute?.name || "Aadya Institute";
    const branchName = branch?.name || (authContext.isAdmin ? "All Branches (Institute-wide)" : undefined);

    // 3. Resolve or create conversation
    let conversationId = dto.conversationId;
    if (conversationId) {
      const existing = await AIAgentRepository.findConversationById(
        conversationId,
        authContext.instituteId,
        authContext.userId
      );
      if (!existing) {
        throw new AppError("Conversation not found or unauthorized", 404);
      }
    } else {
      const title = dto.message.slice(0, 40);
      const newConv = await AIAgentRepository.createConversation(
        authContext.instituteId,
        authContext.userId,
        title
      );
      conversationId = newConv.id;
    }

    // 4. Save User Message
    await AIAgentRepository.createMessage(conversationId, "user", dto.message);

    // 5. Build System Prompt & Load History
    const systemPromptContent = buildSystemPrompt({
      instituteName,
      userName: (currentUser as any).name || (authContext.isAdmin ? "Super Admin" : "Center Manager"),
      role: authContext.isAdmin ? "ADMIN" : "CENTER_MANAGER",
      branchName,
      currentDate: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    const recentDbMessages = await AIAgentRepository.getRecentMessages(conversationId, 10);

    const memoryMessages: ChatMessage[] = [
      { role: "system", content: systemPromptContent },
      ...recentDbMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system" | "tool",
        content: m.content,
        toolName: m.toolName || undefined,
        toolCallId: m.toolCallId || undefined,
      })),
    ];

    const toolsUsed: string[] = [];
    let assistantFinalMessage = "";
    let loopCount = 0;
    const MAX_LOOPS = 5;

    // 6. Tool-Calling Multi-Turn Agent Loop
    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const llmResult = await llmClient.generateChatCompletion(
        memoryMessages,
        AI_TOOL_DEFINITIONS,
        { temperature: 0.1 }
      );

      const assistantMsg = llmResult.message;

      // Case A: LLM requested tool execution
      if (assistantMsg.toolCalls && assistantMsg.toolCalls.length > 0) {
        // Record assistant intent message with tool calls
        memoryMessages.push({
          role: "assistant",
          content: assistantMsg.content || "",
          toolCalls: assistantMsg.toolCalls,
        });

        // Execute each tool call securely
        for (const tc of assistantMsg.toolCalls) {
          const toolName = tc.function.name;
          toolsUsed.push(toolName);

          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments || "{}");
          } catch {
            parsedArgs = {};
          }

          logger.info(
            {
              userId: authContext.userId,
              toolName,
              args: parsedArgs,
              branchId: authContext.branchId,
            },
            "[AI Data Agent] Executing authorized tool"
          );

          try {
            const toolResult = await executeAITool(toolName, parsedArgs, authContext);
            const toolContentStr = JSON.stringify(toolResult.data);

            // Record tool result in DB for audit trail
            await AIAgentRepository.createMessage(
              conversationId,
              "tool",
              toolContentStr,
              toolName,
              tc.id,
              parsedArgs,
              toolResult.data
            );

            memoryMessages.push({
              role: "tool",
              content: toolContentStr,
              toolCallId: tc.id,
              name: toolName,
            });
          } catch (toolErr: any) {
            const errorMsg = JSON.stringify({ error: toolErr.message || "Tool execution failed" });
            memoryMessages.push({
              role: "tool",
              content: errorMsg,
              toolCallId: tc.id,
              name: toolName,
            });
          }
        }
      }
      // Case B: Final Assistant Response
      else if (assistantMsg.content) {
        assistantFinalMessage = assistantMsg.content;
        break;
      } else {
        assistantFinalMessage = "I processed your request with the authorized institute records.";
        break;
      }
    }

    if (!assistantFinalMessage) {
      assistantFinalMessage = "The operation completed based on your institute's data records.";
    }

    // 7. Save Assistant final response
    const savedAssistantMsg = await AIAgentRepository.createMessage(
      conversationId,
      "assistant",
      assistantFinalMessage
    );

    const durationMs = Date.now() - startTime;
    logger.info(
      {
        userId: authContext.userId,
        conversationId,
        toolsUsed,
        durationMs,
      },
      "[AI Data Agent] Query completed successfully"
    );

    return {
      conversationId,
      message: assistantFinalMessage,
      toolsUsed: Array.from(new Set(toolsUsed)),
      createdAt: savedAssistantMsg.createdAt.toISOString(),
    };
  },

  async getUserConversations(currentUser: AuthUser) {
    const authContext = AISecurityScopeService.buildAuthContext(currentUser);
    return AIAgentRepository.findUserConversations(authContext.instituteId, authContext.userId);
  },

  async getConversationById(id: string, currentUser: AuthUser) {
    const authContext = AISecurityScopeService.buildAuthContext(currentUser);
    const conv = await AIAgentRepository.findConversationById(id, authContext.instituteId, authContext.userId);
    if (!conv) {
      throw new AppError("Conversation not found", 404);
    }
    return conv;
  },

  async deleteConversation(id: string, currentUser: AuthUser) {
    const authContext = AISecurityScopeService.buildAuthContext(currentUser);
    const deleted = await AIAgentRepository.deleteConversation(id, authContext.instituteId, authContext.userId);
    if (!deleted) {
      throw new AppError("Conversation not found", 404);
    }
    return { id };
  },
};

import { api } from "./api";

export interface AIChatRequest {
  message: string;
  conversationId?: string;
}

export interface AIChatResponse {
  conversationId: string;
  message: string;
  toolsUsed: string[];
  createdAt: string;
}

export interface AIConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface AIMessage {
  id: string;
  role: string;
  content: string;
  toolName?: string | null;
  createdAt: string;
}

export interface AIConversationDetail extends AIConversation {
  messages: AIMessage[];
}

export const aiAgentApi = {
  /**
   * Send a chat message to the AI agent (creates or continues a conversation).
   */
  chat: async (payload: AIChatRequest): Promise<AIChatResponse> => {
    const res = await api.post<{ success: boolean; data: AIChatResponse }>(
      "/ai/chat",
      payload
    );
    return res.data.data;
  },

  /**
   * List all past conversations for the current user.
   */
  listConversations: async (): Promise<AIConversation[]> => {
    const res = await api.get<{ success: boolean; data: AIConversation[] }>(
      "/ai/conversations"
    );
    return res.data.data;
  },

  /**
   * Get a specific conversation with full message history.
   */
  getConversation: async (id: string): Promise<AIConversationDetail> => {
    const res = await api.get<{ success: boolean; data: AIConversationDetail }>(
      `/ai/conversations/${id}`
    );
    return res.data.data;
  },

  /**
   * Delete a conversation thread.
   */
  deleteConversation: async (id: string): Promise<void> => {
    await api.delete(`/ai/conversations/${id}`);
  },
};

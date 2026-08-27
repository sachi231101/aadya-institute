import { api } from "./api";
import type {
  Conversation,
  Message,
  MessagesResponse,
  SendMessagePayload,
  CreateDirectChatPayload,
  MarkReadResponse,
} from "../types/chat.types";

export const chatApi = {
  /**
   * List all conversations for the authenticated user
   */
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get<{ success: boolean; data: Conversation[] }>("/chat/conversations");
    return response.data.data;
  },

  /**
   * Get a conversation by ID
   */
  getConversation: async (id: string): Promise<Conversation> => {
    const response = await api.get<{ success: boolean; data: Conversation }>(`/chat/conversations/${id}`);
    return response.data.data;
  },

  /**
   * Create or retrieve an existing 1-on-1 DIRECT chat
   */
  createDirectChat: async (payload: CreateDirectChatPayload): Promise<Conversation> => {
    const response = await api.post<{ success: boolean; data: Conversation }>("/chat/conversations/direct", payload);
    return response.data.data;
  },

  /**
   * Get paginated messages for a conversation
   */
  getMessages: async (conversationId: string, page = 1, limit = 50): Promise<MessagesResponse> => {
    const response = await api.get<{
      success: boolean;
      data: Message[] | { data: Message[]; pagination?: MessagesResponse["pagination"] };
      pagination?: MessagesResponse["pagination"];
    }>(`/chat/conversations/${conversationId}/messages`, { params: { page, limit } });

    const rawData = response.data?.data;
    if (Array.isArray(rawData)) {
      return {
        data: rawData,
        pagination: response.data?.pagination || {
          total: rawData.length,
          page,
          limit,
          totalPages: Math.ceil(rawData.length / limit) || 1,
        },
      };
    }

    if (rawData && typeof rawData === "object" && Array.isArray((rawData as { data?: Message[] }).data)) {
      const nested = rawData as { data: Message[]; pagination?: MessagesResponse["pagination"] };
      return {
        data: nested.data,
        pagination: nested.pagination || {
          total: nested.data.length,
          page,
          limit,
          totalPages: Math.ceil(nested.data.length / limit) || 1,
        },
      };
    }

    return {
      data: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
    };
  },

  /**
   * Send a message to a conversation
   */
  sendMessage: async (conversationId: string, payload: SendMessagePayload): Promise<Message> => {
    const response = await api.post<{ success: boolean; data: Message }>(
      `/chat/conversations/${conversationId}/messages`,
      payload
    );
    return response.data.data;
  },

  /**
   * Mark all unread messages in a conversation as read
   */
  markConversationRead: async (conversationId: string): Promise<MarkReadResponse> => {
    const response = await api.patch<{ success: boolean; data: { readCount: number } }>(
      `/chat/conversations/${conversationId}/read`
    );
    return {
      success: response.data.success,
      readCount: response.data.data?.readCount ?? 0,
    };
  },
};

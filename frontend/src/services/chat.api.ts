import { api } from "./api";
import type {
  Conversation,
  Message,
  MessagesResponse,
  SendMessagePayload,
  CreateDirectChatPayload,
  MarkReadResponse,
} from "../types/chat.types";

const toIsoString = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const normalizeMessage = (raw: Record<string, unknown>): Message => {
  const senderRaw = raw.sender as Record<string, unknown> | undefined;
  const senderName = typeof raw.senderName === "string" ? raw.senderName : undefined;

  return {
    id: String(raw.id),
    conversationId: String(raw.conversationId || ""),
    senderId: String(raw.senderId),
    content: String(raw.content || ""),
    readAt: raw.readAt ? toIsoString(raw.readAt) : null,
    createdAt: toIsoString(raw.createdAt),
    sender: senderRaw
      ? {
          id: String(senderRaw.id),
          name: String(senderRaw.name || "Staff Member"),
          email: (senderRaw.email as string | null | undefined) ?? null,
          roles: Array.isArray(senderRaw.roles) ? (senderRaw.roles as string[]) : undefined,
        }
      : senderName
      ? { id: String(raw.senderId), name: senderName }
      : undefined,
  };
};

const normalizeConversation = (raw: Record<string, unknown>): Conversation => {
  const branchRaw = raw.branch as Record<string, unknown> | null | undefined;
  const membersRaw = Array.isArray(raw.members) ? raw.members : [];
  const lastMessageRaw = raw.lastMessage as Record<string, unknown> | null | undefined;
  const otherParticipant = raw.otherParticipant as Record<string, unknown> | null | undefined;

  const members = membersRaw.map((member) => {
    const m = member as Record<string, unknown>;
    const userRaw = m.user as Record<string, unknown> | undefined;
    return {
      id: String(m.id),
      conversationId: String(m.conversationId || raw.id),
      userId: String(m.userId),
      joinedAt: toIsoString(m.joinedAt),
      lastReadAt: m.lastReadAt ? toIsoString(m.lastReadAt) : null,
      user: userRaw
        ? {
            id: String(userRaw.id),
            name: String(userRaw.name || "Staff Member"),
            email: (userRaw.email as string | null | undefined) ?? null,
            roles: Array.isArray(userRaw.roles) ? (userRaw.roles as string[]) : undefined,
          }
        : undefined,
    };
  });

  if (members.length === 0 && otherParticipant) {
    members.push({
      id: `member-${otherParticipant.id}`,
      conversationId: String(raw.id),
      userId: String(otherParticipant.id),
      joinedAt: toIsoString(raw.createdAt),
      lastReadAt: null,
      user: {
        id: String(otherParticipant.id),
        name: String(otherParticipant.name || "Staff Member"),
        email: (otherParticipant.email as string | null | undefined) ?? null,
        roles: Array.isArray(otherParticipant.roles) ? (otherParticipant.roles as string[]) : undefined,
      },
    });
  }

  return {
    id: String(raw.id),
    instituteId: String(raw.instituteId),
    branchId: raw.branchId ? String(raw.branchId) : null,
    type: raw.type as Conversation["type"],
    title: raw.title ? String(raw.title) : null,
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
    members,
    unreadCount: typeof raw.unreadCount === "number" ? raw.unreadCount : 0,
    branch: branchRaw
      ? {
          id: String(branchRaw.id),
          name: String(branchRaw.name),
          code: String(branchRaw.code || ""),
        }
      : raw.branchName
      ? {
          id: raw.branchId ? String(raw.branchId) : "branch",
          name: String(raw.branchName),
          code: "",
        }
      : null,
    lastMessage: lastMessageRaw ? normalizeMessage(lastMessageRaw) : null,
  };
};

export const chatApi = {
  /**
   * List all conversations for the authenticated user
   */
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get<{ success: boolean; data: Record<string, unknown>[] }>("/chat/conversations");
    return (response.data.data || []).map((item) => normalizeConversation(item));
  },

  /**
   * Get a conversation by ID
   */
  getConversation: async (id: string): Promise<Conversation> => {
    const response = await api.get<{ success: boolean; data: Record<string, unknown> }>(`/chat/conversations/${id}`);
    return normalizeConversation(response.data.data);
  },

  /**
   * Create or retrieve an existing 1-on-1 DIRECT chat
   */
  createDirectChat: async (payload: CreateDirectChatPayload): Promise<Conversation> => {
    const response = await api.post<{ success: boolean; data: Record<string, unknown> }>("/chat/conversations/direct", payload);
    return normalizeConversation(response.data.data);
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
        data: rawData.map((item) => normalizeMessage(item as Record<string, unknown>)),
        pagination: response.data?.pagination || {
          total: rawData.length,
          page,
          limit,
          totalPages: Math.ceil(rawData.length / limit) || 1,
        },
      };
    }

    if (rawData && typeof rawData === "object" && Array.isArray((rawData as { data?: Message[] }).data)) {
      const nested = rawData as { data: Record<string, unknown>[]; pagination?: MessagesResponse["pagination"] };
      return {
        data: nested.data.map((item) => normalizeMessage(item)),
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
    const response = await api.post<{ success: boolean; data: Record<string, unknown> }>(
      `/chat/conversations/${conversationId}/messages`,
      payload
    );
    return normalizeMessage(response.data.data);
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

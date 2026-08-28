import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../services/chat.api";
import type {
  Conversation,
  MessagesResponse,
  CreateDirectChatPayload,
} from "../types/chat.types";
import { useAuthStore } from "../store/auth.store";
import { useChatStore } from "../store/chat.store";

export const CHAT_QUERY_KEYS = {
  conversations: ["chat", "conversations"] as const,
  conversation: (id: string) => ["chat", "conversation", id] as const,
  messages: (conversationId: string, page = 1) => ["chat", "messages", conversationId, page] as const,
  allMessagesForConv: (conversationId: string) => ["chat", "messages", conversationId] as const,
};

const ALLOWED_STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF"];

export const useGetConversations = () => {
  const { user, token } = useAuthStore();
  const isSocketConnected = useChatStore((s) => s.isSocketConnected);
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAllowed = Boolean(
    token && userRoles.some((r) => ALLOWED_STAFF_ROLES.includes(r)) && !userRoles.includes("STUDENT")
  );

  return useQuery<Conversation[]>({
    queryKey: CHAT_QUERY_KEYS.conversations,
    queryFn: () => chatApi.getConversations(),
    enabled: isAllowed,
    refetchInterval: isSocketConnected ? false : 1000 * 20,
    staleTime: 1000 * 10,
  });
};

export const useGetConversation = (conversationId: string | null) => {
  const { token } = useAuthStore();

  return useQuery<Conversation>({
    queryKey: conversationId ? CHAT_QUERY_KEYS.conversation(conversationId) : ["chat", "conversation", "none"],
    queryFn: () => chatApi.getConversation(conversationId!),
    enabled: Boolean(token && conversationId),
  });
};

export const useGetMessages = (conversationId: string | null, page = 1, limit = 50) => {
  const { token } = useAuthStore();
  const isSocketConnected = useChatStore((s) => s.isSocketConnected);

  return useQuery<MessagesResponse>({
    queryKey: conversationId ? CHAT_QUERY_KEYS.messages(conversationId, page) : ["chat", "messages", "none", page],
    queryFn: () => chatApi.getMessages(conversationId!, page, limit),
    enabled: Boolean(token && conversationId),
    refetchInterval: isSocketConnected ? false : 1000 * 10,
    staleTime: 1000 * 5,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      chatApi.sendMessage(conversationId, { content }),
    onSuccess: (newMessage, { conversationId }) => {
      // 1. Optimistically append message to current page cache
      queryClient.setQueriesData<MessagesResponse>(
        { queryKey: CHAT_QUERY_KEYS.allMessagesForConv(conversationId) },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.data)) {
            return {
              data: [newMessage],
              pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
            };
          }
          const exists = oldData.data.some((m) => m.id === newMessage.id);
          if (exists) return oldData;

          const prevTotal = oldData.pagination?.total ?? oldData.data.length;
          return {
            ...oldData,
            data: [...oldData.data, newMessage],
            pagination: {
              page: oldData.pagination?.page ?? 1,
              limit: oldData.pagination?.limit ?? 50,
              totalPages: oldData.pagination?.totalPages ?? 1,
              total: prevTotal + 1,
            },
          };
        }
      );

      // 2. Update last message in conversations list
      queryClient.setQueryData<Conversation[]>(CHAT_QUERY_KEYS.conversations, (oldConversations) => {
        if (!oldConversations) return oldConversations;
        return oldConversations.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: newMessage,
              updatedAt: newMessage.createdAt,
            };
          }
          return conv;
        });
      });
    },
  });
};

export const useCreateDirectChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDirectChatPayload) => chatApi.createDirectChat(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations });
    },
  });
};

export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => chatApi.markConversationRead(conversationId),
    onSuccess: (_, conversationId) => {
      // Set unread count to 0 in conversation list cache
      queryClient.setQueryData<Conversation[]>(CHAT_QUERY_KEYS.conversations, (old) => {
        if (!old) return old;
        return old.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      });
    },
  });
};

export const useTotalUnreadChatCount = () => {
  const { data: conversations } = useGetConversations();
  if (!conversations) return 0;
  return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
};

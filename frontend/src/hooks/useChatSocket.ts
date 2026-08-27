import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import { useChatStore } from "../store/chat.store";
import { CHAT_QUERY_KEYS } from "./useChat";
import type { Message, Conversation, MessagesResponse, WsChatPayload } from "../types/chat.types";
import { chatApi } from "../services/chat.api";

const ALLOWED_STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF"];

export const useChatSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { token, user } = useAuthStore();
  const { isOpen, activeConversationId } = useChatStore();

  // Keep references to active state for event handler callbacks
  const activeStateRef = useRef({ isOpen, activeConversationId, currentUserId: user?.id });
  useEffect(() => {
    activeStateRef.current = { isOpen, activeConversationId, currentUserId: user?.id };
  }, [isOpen, activeConversationId, user?.id]);

  useEffect(() => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const isAllowed = Boolean(
      token && userRoles.some((r) => ALLOWED_STAFF_ROLES.includes(r)) && !userRoles.includes("STUDENT")
    );

    if (!isAllowed || !token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    let isUnmounted = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 2000;

    const connect = () => {
      if (isUnmounted) return;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
        // Parse host to build WS URL
        const parsed = new URL(apiUrl, window.location.href);
        const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${parsed.host}/ws/chat?token=${encodeURIComponent(token)}`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          reconnectDelay = 2000; // Reset backoff on success
          if (!isUnmounted) setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as WsChatPayload;
            if (payload.event === "message:new") {
              const newMessage = payload.data as Message;
              const { isOpen: drawerOpen, activeConversationId: currentConvId, currentUserId } =
                activeStateRef.current;

              const isCurrentOpenConv = drawerOpen && currentConvId === newMessage.conversationId;
              const isSender = currentUserId === newMessage.senderId;

              // 1. Update message cache for this conversation (deduping)
              queryClient.setQueriesData<MessagesResponse>(
                { queryKey: ["chat", "messages", newMessage.conversationId] },
                (oldData) => {
                  if (!oldData || !Array.isArray(oldData.data)) {
                    return {
                      data: [newMessage],
                      pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
                    };
                  }
                  const alreadyExists = oldData.data.some((m) => m.id === newMessage.id);
                  if (alreadyExists) return oldData;

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

              // 2. Update conversation list cache (lastMessage & unreadCount)
              queryClient.setQueryData<Conversation[]>(CHAT_QUERY_KEYS.conversations, (oldConversations) => {
                if (!oldConversations) return oldConversations;
                return oldConversations.map((conv) => {
                  if (conv.id === newMessage.conversationId) {
                    const updatedUnread = isCurrentOpenConv || isSender
                      ? 0
                      : (conv.unreadCount || 0) + 1;
                    return {
                      ...conv,
                      lastMessage: newMessage,
                      unreadCount: updatedUnread,
                      updatedAt: newMessage.createdAt,
                    };
                  }
                  return conv;
                });
              });

              // 3. If currently actively viewing this conversation, mark as read on backend
              if (isCurrentOpenConv && !isSender) {
                chatApi.markConversationRead(newMessage.conversationId).catch(() => {});
              }
            } else if (payload.event === "message:read") {
              const { conversationId } = (payload.data as { conversationId?: string }) || {};
              if (conversationId) {
                queryClient.setQueriesData<MessagesResponse>(
                  { queryKey: ["chat", "messages", conversationId] },
                  (oldData) => {
                    if (!oldData) return oldData;
                    const nowStr = new Date().toISOString();
                    return {
                      ...oldData,
                      data: oldData.data.map((m) => ({
                        ...m,
                        readAt: m.readAt || nowStr,
                      })),
                    };
                  }
                );
              }
            }
          } catch {
            // Ignore non-JSON or malformed messages
          }
        };

        socket.onclose = (e) => {
          socketRef.current = null;
          if (!isUnmounted) setIsConnected(false);
          // Normal closures or unauthorized codes (e.g. 4003) do not reconnect
          if (!isUnmounted && e.code !== 4003 && e.code !== 1000) {
            reconnectTimeout = setTimeout(() => {
              reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
              connect();
            }, reconnectDelay);
          }
        };

        socket.onerror = () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };
      } catch {
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connect, reconnectDelay);
        }
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close(1000, "Client unmounted");
        socketRef.current = null;
      }
    };
  }, [token, user?.id, user?.roles, user?.role, queryClient]);

  return { isConnected };
};

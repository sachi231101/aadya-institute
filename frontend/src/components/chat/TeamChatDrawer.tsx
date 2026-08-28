import React, { useEffect, useState, useTransition } from "react";
import { useAuthStore } from "../../store/auth.store";
import { useChatStore } from "../../store/chat.store";
import {
  useGetConversations,
  useGetMessages,
  useSendMessage,
  useMarkConversationRead,
} from "../../hooks/useChat";
import { ChatHeader } from "./ChatHeader";
import { ConversationList } from "./ConversationList";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { Conversation } from "../../types/chat.types";

const ALLOWED_STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF"];

export const TeamChatDrawer: React.FC = () => {
  const { user } = useAuthStore();
  const { isOpen, activeConversationId, closeChat, setActiveConversationId } = useChatStore();
  const [, startTransition] = useTransition();

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAllowed = userRoles.some((r) => ALLOWED_STAFF_ROLES.includes(r)) && !userRoles.includes("STUDENT");

  // Mobile / compact navigation state: when true on small screens or when user clicks Back, show conversation list
  const [showConversationList, setShowConversationList] = useState(false);

  // Queries & Mutations
  const {
    data: conversations = [],
    isLoading: isConversationsLoading,
  } = useGetConversations();

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useGetMessages(activeConversationId, 1, 50);

  const sendMessageMutation = useSendMessage();
  const markReadMutation = useMarkConversationRead();

  // Default to Branch Team Chat if no active conversation is selected yet
  useEffect(() => {
    if (isOpen && !activeConversationId && conversations.length > 0) {
      const teamChat = conversations.find((c) => c.type === "TEAM") || conversations[0];
      if (teamChat) {
        startTransition(() => {
          setActiveConversationId(teamChat.id);
          setShowConversationList(false);
        });
      }
    }
  }, [isOpen, activeConversationId, conversations, setActiveConversationId]);

  // Mark conversation as read whenever active conversation opens
  useEffect(() => {
    if (isOpen && activeConversationId) {
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv && (conv.unreadCount || 0) > 0) {
        markReadMutation.mutate(activeConversationId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeConversationId]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeChat]);

  if (!isAllowed) {
    return null;
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setShowConversationList(false);
    if ((conversation.unreadCount || 0) > 0) {
      markReadMutation.mutate(conversation.id);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;
    await sendMessageMutation.mutateAsync({
      conversationId: activeConversationId,
      content,
    });
  };

  return (
    <>
      {/* ─── Backdrop (Click outside to close) ────────────────────────── */}
      {isOpen && (
        <div
          onClick={closeChat}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
          aria-hidden="true"
        />
      )}

      {/* ─── Slide-over Drawer Panel ─────────────────────────────────── */}
      <aside
        role="dialog"
        aria-label="Team Chat Drawer"
        aria-modal="true"
        className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-full sm:w-[390px] md:w-[410px] bg-background border-l border-border/80 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Chat Header */}
        <ChatHeader
          activeConversation={showConversationList ? null : activeConversation}
          showBack={!showConversationList && conversations.length > 1}
          onBack={() => setShowConversationList(true)}
          onClose={closeChat}
        />

        {/* Body: Either Conversation List OR Active Conversation Messages */}
        {showConversationList || !activeConversationId ? (
          <ConversationList
            conversations={conversations}
            isLoading={isConversationsLoading}
            selectedId={activeConversationId}
            onSelect={handleSelectConversation}
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Conversation Messages */}
            <MessageList
              messages={Array.isArray(messagesData) ? messagesData : messagesData?.data || []}
              isLoading={isMessagesLoading}
              isError={isMessagesError}
              onRetry={() => refetchMessages()}
            />

            {/* Input Bar */}
            <MessageInput
              onSendMessage={handleSendMessage}
              isSending={sendMessageMutation.isPending}
            />
          </div>
        )}
      </aside>
    </>
  );
};

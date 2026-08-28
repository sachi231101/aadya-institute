export type ConversationType = "TEAM" | "DIRECT";

export interface CreateDirectChatDTO {
  recipientUserId: string;
}

export interface SendMessageDTO {
  content: string;
}

export interface QueryMessagesDTO {
  page?: number;
  limit?: number;
}

export interface ConversationSummaryDTO {
  id: string;
  type: ConversationType;
  title?: string | null;
  instituteId: string;
  branchId?: string | null;
  branchName?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  otherParticipant?: {
    id: string;
    name: string;
    email?: string | null;
    roles?: string[];
  } | null;
  members?: Array<{
    id: string;
    conversationId: string;
    userId: string;
    joinedAt: Date;
    lastReadAt: Date | null;
    user?: {
      id: string;
      name: string;
      email?: string | null;
      roles?: string[];
    };
  }>;
  lastMessage?: {
    id: string;
    conversationId: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
    readAt?: Date | null;
    sender?: {
      id: string;
      name: string;
    };
  } | null;
  unreadCount: number;
}

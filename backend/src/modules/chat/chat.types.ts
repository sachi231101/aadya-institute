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
  createdAt: Date;
  updatedAt: Date;
  otherParticipant?: {
    id: string;
    name: string;
    email?: string | null;
    roles?: string[];
  } | null;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
    readAt?: Date | null;
  } | null;
  unreadCount: number;
}

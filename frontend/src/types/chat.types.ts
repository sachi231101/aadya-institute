export type ConversationType = "TEAM" | "DIRECT";

export interface ChatUserSummary {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  roles?: string[];
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user?: ChatUserSummary;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender?: ChatUserSummary;
}

export interface ConversationBranchSummary {
  id: string;
  name: string;
  code: string;
}

export interface Conversation {
  id: string;
  instituteId: string;
  branchId: string | null;
  type: ConversationType;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  lastMessage?: Message | null;
  unreadCount?: number;
  branch?: ConversationBranchSummary | null;
}

export interface SendMessagePayload {
  content: string;
}

export interface CreateDirectChatPayload {
  recipientUserId: string;
}

export interface MessagesPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MessagesResponse {
  data: Message[];
  pagination: MessagesPagination;
}

export interface MarkReadResponse {
  success: boolean;
  readCount: number;
}

export type WsChatEvent = "authenticated" | "message:new" | "message:read" | "error";

export interface WsChatPayload<T = unknown> {
  event: WsChatEvent;
  data: T;
  timestamp: string;
}

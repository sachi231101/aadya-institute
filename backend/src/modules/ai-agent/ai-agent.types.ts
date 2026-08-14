export interface AIChatRequestDTO {
  message: string;
  conversationId?: string;
}

export interface AIChatResponseDTO {
  conversationId: string;
  message: string;
  toolsUsed: string[];
  createdAt: string;
}

export interface AIConversationDTO {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface AIMessageDTO {
  id: string;
  role: string;
  content: string;
  toolName?: string | null;
  createdAt: Date;
}

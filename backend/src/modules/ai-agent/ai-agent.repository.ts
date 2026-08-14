import { prisma } from "../../config/database";

export const AIAgentRepository = {
  async createConversation(instituteId: string, userId: string, title?: string) {
    return prisma.aIConversation.create({
      data: {
        instituteId,
        userId,
        title: title || "New Conversation",
      },
    });
  },

  async findConversationById(id: string, instituteId: string, userId: string) {
    return prisma.aIConversation.findFirst({
      where: {
        id,
        instituteId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  async findUserConversations(instituteId: string, userId: string) {
    const list = await prisma.aIConversation.findMany({
      where: {
        instituteId,
        userId,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });

    return list.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }));
  },

  async createMessage(
    conversationId: string,
    role: "user" | "assistant" | "system" | "tool",
    content: string,
    toolName?: string | null,
    toolCallId?: string | null,
    toolArgs?: any,
    toolResult?: any
  ) {
    const [msg] = await Promise.all([
      prisma.aIMessage.create({
        data: {
          conversationId,
          role,
          content,
          toolName: toolName || null,
          toolCallId: toolCallId || null,
          toolArgs: toolArgs || undefined,
          toolResult: toolResult || undefined,
        },
      }),
      prisma.aIConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return msg;
  },

  async getRecentMessages(conversationId: string, limit: number = 10) {
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return messages.reverse();
  },

  async deleteConversation(id: string, instituteId: string, userId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id, instituteId, userId },
    });

    if (!conversation) return null;

    return prisma.aIConversation.delete({
      where: { id },
    });
  },
};

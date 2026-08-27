import { prisma } from "../../config/database";
import type { ConversationType } from "./chat.types";

export const findUserConversations = async (
  userId: string,
  instituteId: string
) => {
  return prisma.conversation.findMany({
    where: {
      instituteId,
      members: {
        some: { userId },
      },
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userRoles: { include: { role: { select: { name: true } } } },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const findBranchTeamConversation = async (
  instituteId: string,
  branchId: string
) => {
  return prisma.conversation.findFirst({
    where: {
      instituteId,
      branchId,
      type: "TEAM",
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
};

export const findExistingDirectConversation = async (
  userId1: string,
  userId2: string,
  instituteId: string
) => {
  return prisma.conversation.findFirst({
    where: {
      instituteId,
      type: "DIRECT",
      AND: [
        { members: { some: { userId: userId1 } } },
        { members: { some: { userId: userId2 } } },
      ],
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userRoles: { include: { role: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
};

export const createConversation = async (data: {
  instituteId: string;
  branchId?: string | null;
  type: ConversationType;
  title?: string | null;
  memberUserIds: string[];
}) => {
  return prisma.conversation.create({
    data: {
      instituteId: data.instituteId,
      branchId: data.branchId || null,
      type: data.type,
      title: data.title,
      members: {
        create: data.memberUserIds.map((userId) => ({ userId })),
      },
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userRoles: { include: { role: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
};

export const addMember = async (conversationId: string, userId: string) => {
  return prisma.conversationMember.upsert({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    update: {},
    create: { conversationId, userId },
  });
};

export const findConversationById = async (id: string) => {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userRoles: { include: { role: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
};

export const findMembership = async (conversationId: string, userId: string) => {
  return prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
};

export const createMessage = async (data: {
  conversationId: string;
  senderId: string;
  content: string;
}) => {
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            userRoles: { include: { role: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return message;
};

export const findMessages = async (
  conversationId: string,
  skip: number,
  take: number
) => {
  // Query descending to get the newest messages up to `take`, then return in chronological order
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          userRoles: { include: { role: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  // Reverse to maintain chronological order for the client
  return messages.reverse();
};

export const countMessages = async (conversationId: string) => {
  return prisma.message.count({
    where: { conversationId },
  });
};

export const countUnreadMessages = async (
  conversationId: string,
  userId: string
) => {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
  });
};

export const markConversationMessagesAsRead = async (
  conversationId: string,
  readerUserId: string
) => {
  const now = new Date();
  await prisma.$transaction([
    prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: readerUserId },
        readAt: null,
      },
      data: { readAt: now },
    }),
    prisma.conversationMember.updateMany({
      where: { conversationId, userId: readerUserId },
      data: { lastReadAt: now },
    }),
  ]);

  return { conversationId, readerUserId, readAt: now };
};

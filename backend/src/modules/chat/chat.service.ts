import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { buildMeta } from "../../utils/pagination";
import { broadcastToConversation } from "../../websocket/ws.server";
import * as repo from "./chat.repository";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateDirectChatDTO,
  SendMessageDTO,
  QueryMessagesDTO,
  ConversationSummaryDTO,
} from "./chat.types";

const ALLOWED_STAFF_ROLES = ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF"];

/**
 * Validates that the user is an authorized internal employee (not a student)
 */
const assertInternalStaff = (user: AuthUser): void => {
  const roles = user.roles || [];
  const isInternal = roles.some((r) => ALLOWED_STAFF_ROLES.includes(r));
  if (!isInternal || roles.includes("STUDENT") && !roles.some((r) => ["ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"].includes(r))) {
    throw new AppError("Students are not authorized to access internal team chat", 403);
  }
};

/**
 * Ensures that the branch TEAM conversation exists and user is a member
 */
export const getOrCreateBranchTeamChat = async (
  instituteId: string,
  branchId: string,
  userId: string
) => {
  let teamConv = await repo.findBranchTeamConversation(instituteId, branchId);

  if (!teamConv) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    const title = branch ? `${branch.name} Team` : "Branch Team";

    teamConv = await repo.createConversation({
      instituteId,
      branchId,
      type: "TEAM",
      title,
      memberUserIds: [userId],
    });
  } else {
    // Ensure user is added to the branch team conversation
    const isMember = teamConv.members.some((m) => m.userId === userId);
    if (!isMember) {
      await repo.addMember(teamConv.id, userId);
    }
  }

  return teamConv;
};

/**
 * Retrieves all conversations for current user (Branch Team Chat + Direct Chats)
 */
export const getUserConversations = async (
  currentUser: AuthUser
): Promise<ConversationSummaryDTO[]> => {
  assertInternalStaff(currentUser);
  const userId = currentUser.id || currentUser.userId!;

  // If user is attached to a branch, ensure they are in their branch's team chat
  if (currentUser.branchId) {
    await getOrCreateBranchTeamChat(currentUser.instituteId, currentUser.branchId, userId);
  } else if (currentUser.roles.includes("ADMIN")) {
    // Admins without a fixed branch can access all branch team channels in their institute
    const branches = await prisma.branch.findMany({
      where: { instituteId: currentUser.instituteId, status: "ACTIVE" },
      select: { id: true },
    });
    for (const branch of branches) {
      await getOrCreateBranchTeamChat(currentUser.instituteId, branch.id, userId);
    }
  }

  const rawConversations = await repo.findUserConversations(userId, currentUser.instituteId);

  const summaries: ConversationSummaryDTO[] = [];

  for (const conv of rawConversations) {
    const lastMsg = conv.messages[0] || null;
    const unreadCount = await repo.countUnreadMessages(conv.id, userId);

    let otherParticipant = null;
    if (conv.type === "DIRECT") {
      const otherMember = conv.members.find((m) => m.userId !== userId);
      if (otherMember?.user) {
        otherParticipant = {
          id: otherMember.user.id,
          name: otherMember.user.name,
          email: otherMember.user.email,
          roles: otherMember.user.userRoles.map((ur) => ur.role.name),
        };
      }
    }

    summaries.push({
      id: conv.id,
      type: conv.type as any,
      title: conv.title || (conv.type === "TEAM" ? conv.branch?.name ? `${conv.branch.name} Team` : "Team Chat" : otherParticipant?.name || "Direct Chat"),
      instituteId: conv.instituteId,
      branchId: conv.branchId,
      branchName: conv.branch?.name,
      branch: conv.branch
        ? { id: conv.branch.id, name: conv.branch.name, code: conv.branch.code }
        : null,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      otherParticipant,
      members: conv.members.map((m) => ({
        id: m.id,
        conversationId: conv.id,
        userId: m.userId,
        joinedAt: m.joinedAt,
        lastReadAt: m.lastReadAt,
        user: m.user
          ? {
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
              roles: m.user.userRoles?.map((ur) => ur.role.name) || [],
            }
          : undefined,
      })),
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            conversationId: conv.id,
            content: lastMsg.content,
            senderId: lastMsg.senderId,
            senderName: lastMsg.sender.name,
            createdAt: lastMsg.createdAt,
            readAt: lastMsg.readAt,
            sender: {
              id: lastMsg.sender.id,
              name: lastMsg.sender.name,
            },
          }
        : null,
      unreadCount,
    });
  }

  return summaries;
};

/**
 * Retrieves a single conversation by ID with strict tenant, branch, and membership authorization
 */
export const getConversationById = async (
  currentUser: AuthUser,
  conversationId: string
) => {
  assertInternalStaff(currentUser);
  const userId = currentUser.id || currentUser.userId!;

  const conv = await repo.findConversationById(conversationId);
  if (!conv || conv.instituteId !== currentUser.instituteId) {
    throw new AppError("Conversation not found", 404);
  }

  // Branch isolation for TEAM chats: non-ADMIN must belong to the branch
  if (
    conv.type === "TEAM" &&
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    conv.branchId &&
    conv.branchId !== currentUser.branchId
  ) {
    throw new AppError("You do not have access to this branch's team conversation", 403);
  }

  // Check membership
  const isMember = conv.members.some((m) => m.userId === userId);
  if (!isMember) {
    // If it's a team chat of user's authorized branch, auto-join
    if (conv.type === "TEAM" && (currentUser.roles.includes("ADMIN") || conv.branchId === currentUser.branchId)) {
      await repo.addMember(conv.id, userId);
    } else {
      throw new AppError("You are not a member of this conversation", 403);
    }
  }

  return conv;
};

/**
 * Creates or retrieves an existing 1-on-1 DIRECT chat between internal employees
 */
export const createDirectChat = async (
  currentUser: AuthUser,
  dto: CreateDirectChatDTO
) => {
  assertInternalStaff(currentUser);
  const currentUserId = currentUser.id || currentUser.userId!;
  const { recipientUserId } = dto;

  if (currentUserId === recipientUserId) {
    throw new AppError("You cannot start a direct chat with yourself", 400);
  }

  // Find recipient user
  const recipient = await prisma.user.findUnique({
    where: { id: recipientUserId },
    include: {
      userRoles: { include: { role: true } },
      branch: true,
    },
  });

  if (!recipient || recipient.instituteId !== currentUser.instituteId) {
    throw new AppError("Recipient user not found", 404);
  }

  // Verify recipient is an internal staff member (NOT a student)
  const recipientRoles = recipient.userRoles.map((ur) => ur.role.name);
  const isRecipientStaff = recipientRoles.some((r) => ALLOWED_STAFF_ROLES.includes(r));
  if (!isRecipientStaff || recipientRoles.includes("STUDENT")) {
    throw new AppError("Direct chat can only be started with internal staff members", 400);
  }

  // Check branch isolation for non-ADMIN users if branch restriction applies
  if (
    !currentUser.roles.includes("ADMIN") &&
    !currentUser.roles.includes("CENTER_MANAGER") &&
    currentUser.branchId &&
    recipient.branchId &&
    recipient.branchId !== currentUser.branchId
  ) {
    throw new AppError("Recipient belongs to a different branch", 403);
  }

  // Check if DIRECT conversation already exists (Idempotency)
  const existing = await repo.findExistingDirectConversation(
    currentUserId,
    recipientUserId,
    currentUser.instituteId
  );

  if (existing) {
    return existing;
  }

  // Create new DIRECT conversation
  const newConversation = await repo.createConversation({
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId || recipient.branchId || null,
    type: "DIRECT",
    title: null,
    memberUserIds: [currentUserId, recipientUserId],
  });

  return newConversation;
};

/**
 * Retrieves paginated messages for an authorized conversation in chronological order
 */
export const getMessages = async (
  currentUser: AuthUser,
  conversationId: string,
  query: QueryMessagesDTO
) => {
  await getConversationById(currentUser, conversationId);

  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    repo.findMessages(conversationId, skip, limit),
    repo.countMessages(conversationId),
  ]);

  return {
    data: messages,
    meta: buildMeta(total, page, limit),
  };
};

/**
 * Sends a plain text message to an authorized conversation and dispatches WebSocket event
 */
export const sendMessage = async (
  currentUser: AuthUser,
  conversationId: string,
  dto: SendMessageDTO
) => {
  await getConversationById(currentUser, conversationId);
  const userId = currentUser.id || currentUser.userId!;

  // Persist message to PostgreSQL (source of truth)
  const message = await repo.createMessage({
    conversationId,
    senderId: userId,
    content: dto.content,
  });

  // Broadcast real-time event via WebSocket (non-blocking)
  setImmediate(() => {
    broadcastToConversation(conversationId, "message:new", message);
  });

  return message;
};

/**
 * Marks unread messages in a conversation as read and broadcasts read status
 */
export const markConversationRead = async (
  currentUser: AuthUser,
  conversationId: string
) => {
  await getConversationById(currentUser, conversationId);
  const userId = currentUser.id || currentUser.userId!;

  const result = await repo.markConversationMessagesAsRead(conversationId, userId);

  // Broadcast real-time read event via WebSocket
  setImmediate(() => {
    broadcastToConversation(conversationId, "message:read", {
      conversationId,
      userId,
      readAt: result.readAt,
    });
  });

  return { success: true, ...result };
};

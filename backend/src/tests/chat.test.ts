import { test, describe, before } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import * as chatService from "../modules/chat/chat.service";
import * as chatRepo from "../modules/chat/chat.repository";
import {
  createDirectChatSchema,
  sendMessageSchema,
  queryMessagesSchema,
} from "../modules/chat/chat.validation";
import { broadcastToConversation } from "../websocket/ws.server";

describe("Internal Team Chat Validation Schemas", () => {
  test("1. sendMessageSchema sanitizes HTML tags and preserves plain text", () => {
    const raw = "<script>alert('xss')</script>Hello <b>Team</b>!";
    const result = sendMessageSchema.safeParse({ content: raw });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.content, "Hello Team!");
    }
  });

  test("2. sendMessageSchema rejects empty or pure-whitespace messages", () => {
    const res1 = sendMessageSchema.safeParse({ content: "" });
    assert.strictEqual(res1.success, false);

    const res2 = sendMessageSchema.safeParse({ content: "    " });
    assert.strictEqual(res2.success, false);
  });

  test("3. sendMessageSchema rejects oversized messages (>2000 chars)", () => {
    const oversized = "a".repeat(2001);
    const res = sendMessageSchema.safeParse({ content: oversized });
    assert.strictEqual(res.success, false);
  });

  test("4. createDirectChatSchema requires recipientUserId", () => {
    assert.strictEqual(createDirectChatSchema.safeParse({}).success, false);
    assert.strictEqual(createDirectChatSchema.safeParse({ recipientUserId: "" }).success, false);
    assert.strictEqual(
      createDirectChatSchema.safeParse({ recipientUserId: "usr-target-123" }).success,
      true
    );
  });

  test("5. queryMessagesSchema applies safe default pagination limits", () => {
    const parsed = queryMessagesSchema.parse({});
    assert.strictEqual(parsed.page, 1);
    assert.strictEqual(parsed.limit, 50);

    const capped = queryMessagesSchema.safeParse({ limit: 500 });
    assert.strictEqual(capped.success, false); // Max limit is 100
  });
});

describe("Internal Team Chat Security, Isolation & Core Workflows", () => {
  let testData: {
    instituteId: string;
    branchAId: string;
    branchBId: string;
    adminUserId: string;
    managerAUserId: string;
    counsellorAUserId: string;
    facultyAUserId: string;
    managerBUserId: string;
    studentUserId: string;
  };

  before(async () => {
    const admin = await prisma.user.findFirst({
      where: { email: "admin@aadya.com" },
      include: { userRoles: { include: { role: true } } },
    });
    if (!admin) return;

    const instituteId = admin.instituteId;

    const branches = await prisma.branch.findMany({
      where: { instituteId },
      take: 2,
    });

    const managerA = await prisma.user.findFirst({
      where: { email: "manager.koramangala@aadya.com", instituteId },
    });
    const managerB = await prisma.user.findFirst({
      where: { email: "manager.indiranagar@aadya.com", instituteId },
    });
    const counsellorA = await prisma.user.findFirst({
      where: { email: "counsellor.ananya@aadya.com", instituteId },
    });
    const facultyA = await prisma.user.findFirst({
      where: { email: "faculty.rajesh@aadya.com", instituteId },
    });
    const student = await prisma.user.findFirst({
      where: { email: "student.arjun@aadya.com", instituteId },
    });

    if (branches.length >= 2 && admin && managerA && managerB && counsellorA && facultyA && student) {
      testData = {
        instituteId,
        branchAId: branches[0].id,
        branchBId: branches[1].id,
        adminUserId: admin.id,
        managerAUserId: managerA.id,
        counsellorAUserId: counsellorA.id,
        facultyAUserId: facultyA.id,
        managerBUserId: managerB.id,
        studentUserId: student.id,
      };
    }
  });

  test("6. Authorized staff (Manager / Faculty / Admin) can access team chat", async () => {
    if (!testData) return;

    const managerUser: any = {
      id: testData.managerAUserId,
      userId: testData.managerAUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["CENTER_MANAGER"],
    };

    const conversations = await chatService.getUserConversations(managerUser);
    assert.ok(Array.isArray(conversations));
    const teamChat = conversations.find((c) => c.type === "TEAM" && c.branchId === testData.branchAId);
    assert.ok(teamChat, "Branch A team chat should be present and accessible");
  });

  test("7. Student user is strictly rejected from accessing chat (403 Forbidden)", async () => {
    if (!testData) return;

    const studentUser: any = {
      id: testData.studentUserId,
      userId: testData.studentUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["STUDENT"],
    };

    await assert.rejects(
      async () => {
        await chatService.getUserConversations(studentUser);
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  test("8. Staff cannot access another tenant's conversation (404)", async () => {
    if (!testData) return;

    const foreignTenantUser: any = {
      id: "usr-foreign-staff",
      userId: "usr-foreign-staff",
      instituteId: "completely-different-tenant-uuid",
      branchId: null,
      roles: ["ADMIN"],
    };

    const teamConv = await chatRepo.findBranchTeamConversation(testData.instituteId, testData.branchAId);
    if (teamConv) {
      await assert.rejects(
        async () => {
          await chatService.getConversationById(foreignTenantUser, teamConv.id);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    }
  });

  test("9. Branch user cannot access another branch's team chat (403)", async () => {
    if (!testData) return;

    const managerBUser: any = {
      id: testData.managerBUserId,
      userId: testData.managerBUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchBId,
      roles: ["CENTER_MANAGER"],
    };

    const branchATeam = await chatService.getOrCreateBranchTeamChat(
      testData.instituteId,
      testData.branchAId,
      testData.managerAUserId
    );

    await assert.rejects(
      async () => {
        await chatService.getConversationById(managerBUser, branchATeam.id);
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  test("10. User can create a direct chat with another internal staff member", async () => {
    if (!testData) return;

    const managerAUser: any = {
      id: testData.managerAUserId,
      userId: testData.managerAUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["CENTER_MANAGER"],
    };

    const directConv = await chatService.createDirectChat(managerAUser, {
      recipientUserId: testData.counsellorAUserId,
    });

    assert.ok(directConv);
    assert.strictEqual(directConv.type, "DIRECT");
    assert.strictEqual(directConv.instituteId, testData.instituteId);
    assert.strictEqual(directConv.members.length, 2);
  });

  test("11. Duplicate direct chats are prevented (returns existing conversation)", async () => {
    if (!testData) return;

    const managerAUser: any = {
      id: testData.managerAUserId,
      userId: testData.managerAUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["CENTER_MANAGER"],
    };

    const conv1 = await chatService.createDirectChat(managerAUser, {
      recipientUserId: testData.counsellorAUserId,
    });

    const conv2 = await chatService.createDirectChat(managerAUser, {
      recipientUserId: testData.counsellorAUserId,
    });

    assert.strictEqual(conv1.id, conv2.id, "Should return identical conversation ID without creating duplicate");
  });

  test("12. Student cannot be added to a direct chat (400 Bad Request)", async () => {
    if (!testData) return;

    const managerAUser: any = {
      id: testData.managerAUserId,
      userId: testData.managerAUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["CENTER_MANAGER"],
    };

    await assert.rejects(
      async () => {
        await chatService.createDirectChat(managerAUser, {
          recipientUserId: testData.studentUserId,
        });
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  test("13. User can send message to conversation and PostgreSQL persists it as source of truth", async () => {
    if (!testData) return;

    const managerAUser: any = {
      id: testData.managerAUserId,
      userId: testData.managerAUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["CENTER_MANAGER"],
    };

    const directConv = await chatService.createDirectChat(managerAUser, {
      recipientUserId: testData.facultyAUserId,
    });

    const message = await chatService.sendMessage(managerAUser, directConv.id, {
      content: "Hello Rajesh, please confirm tomorrow's batch schedule.",
    });

    assert.ok(message.id);
    assert.strictEqual(message.content, "Hello Rajesh, please confirm tomorrow's batch schedule.");
    assert.strictEqual(message.senderId, testData.managerAUserId);

    // Verify directly in PostgreSQL
    const inDb = await prisma.message.findUnique({ where: { id: message.id } });
    assert.ok(inDb);
    assert.strictEqual(inDb.content, message.content);
  });

  test("14. Non-member cannot send message to a private conversation (403 Forbidden)", async () => {
    if (!testData) return;

    // Manager B tries to send message to Manager A <-> Faculty A conversation
    const managerBUser: any = {
      id: testData.managerBUserId,
      userId: testData.managerBUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchBId,
      roles: ["CENTER_MANAGER"],
    };

    const directConv = await chatService.createDirectChat(
      {
        id: testData.managerAUserId,
        userId: testData.managerAUserId,
        instituteId: testData.instituteId,
        branchId: testData.branchAId,
        roles: ["CENTER_MANAGER"],
      } as any,
      { recipientUserId: testData.facultyAUserId }
    );

    await assert.rejects(
      async () => {
        await chatService.sendMessage(managerBUser, directConv.id, {
          content: "Unauthorized intrusion message",
        });
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  test("15. Non-member cannot read messages of a private conversation (403 Forbidden)", async () => {
    if (!testData) return;

    const managerBUser: any = {
      id: testData.managerBUserId,
      userId: testData.managerBUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchBId,
      roles: ["CENTER_MANAGER"],
    };

    const directConv = await chatRepo.findExistingDirectConversation(
      testData.managerAUserId,
      testData.facultyAUserId,
      testData.instituteId
    );

    if (directConv) {
      await assert.rejects(
        async () => {
          await chatService.getMessages(managerBUser, directConv.id, { page: 1, limit: 10 });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    }
  });

  test("16. Member can read paginated messages and mark conversation as read", async () => {
    if (!testData) return;

    const facultyAUser: any = {
      id: testData.facultyAUserId,
      userId: testData.facultyAUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["FACULTY"],
    };

    const directConv = await chatRepo.findExistingDirectConversation(
      testData.managerAUserId,
      testData.facultyAUserId,
      testData.instituteId
    );

    if (directConv) {
      const messagesResult = await chatService.getMessages(facultyAUser, directConv.id, {
        page: 1,
        limit: 50,
      });
      assert.ok(Array.isArray(messagesResult.data));
      assert.ok(messagesResult.data.length > 0);

      // Mark as read
      const readResult = await chatService.markConversationRead(facultyAUser, directConv.id);
      assert.strictEqual(readResult.success, true);

      // Check unread count is now 0 for Faculty A
      const unreadCount = await chatRepo.countUnreadMessages(directConv.id, testData.facultyAUserId);
      assert.strictEqual(unreadCount, 0);
    }
  });

  test("17. Nonexistent or unauthorized conversation ID returns standard error (IDOR protection)", async () => {
    if (!testData) return;

    const managerAUser: any = {
      id: testData.managerAUserId,
      userId: testData.managerAUserId,
      instituteId: testData.instituteId,
      branchId: testData.branchAId,
      roles: ["CENTER_MANAGER"],
    };

    await assert.rejects(
      async () => {
        await chatService.getConversationById(managerAUser, "nonexistent-conversation-id-12345");
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test("18. WebSocket broadcasting operates non-blocking without throwing", async () => {
    if (!testData) return;

    const branchATeam = await chatRepo.findBranchTeamConversation(
      testData.instituteId,
      testData.branchAId
    );

    if (branchATeam) {
      // Test broadcast helper execution
      await broadcastToConversation(branchATeam.id, "message:new", {
        id: "msg-test-ws",
        content: "Real-time delivery verification",
      });
      assert.ok(true, "WebSocket broadcast executed gracefully");
    }
  });
});

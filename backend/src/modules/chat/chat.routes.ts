import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createDirectChatSchema,
  sendMessageSchema,
  queryMessagesSchema,
} from "./chat.validation";
import {
  listConversations,
  getConversation,
  createDirectChat,
  listMessages,
  sendMessage,
  markConversationRead,
} from "./chat.controller";

const router = Router();

// Only internal staff roles can access team chat (Students are rejected with 403)
router.use(
  authMiddleware,
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY", "STAFF")
);

router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.post("/conversations/direct", validate(createDirectChatSchema), createDirectChat);
router.get("/conversations/:id/messages", validate(queryMessagesSchema, "query"), listMessages);
router.post("/conversations/:id/messages", validate(sendMessageSchema), sendMessage);
router.patch("/conversations/:id/read", markConversationRead);

export default router;

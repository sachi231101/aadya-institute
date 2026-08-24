import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  chatRequestSchema,
  conversationParamSchema,
} from "./ai-agent.validation";
import {
  chatWithAIAgent,
  listConversations,
  getConversation,
  deleteConversation,
} from "./ai-agent.controller";

const router = Router();

// Protect all AI routes: requires authenticated JWT and either ADMIN or CENTER_MANAGER role
router.use(authMiddleware);
router.use(requireRole("ADMIN", "CENTER_MANAGER"));

// POST /api/v1/ai/chat — Ask a question to the AI Institute Data Agent
router.post(
  "/chat",
  validate(chatRequestSchema, "body"),
  chatWithAIAgent
);

// GET /api/v1/ai/conversations — List past user conversations
router.get(
  "/conversations",
  listConversations
);

// GET /api/v1/ai/conversations/:id — Get details & message history for a conversation
router.get(
  "/conversations/:id",
  validate(conversationParamSchema, "params"),
  getConversation
);

// DELETE /api/v1/ai/conversations/:id — Delete a conversation thread
router.delete(
  "/conversations/:id",
  validate(conversationParamSchema, "params"),
  deleteConversation
);

export default router;

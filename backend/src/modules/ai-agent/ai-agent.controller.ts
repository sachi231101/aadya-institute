import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { AIAgentService } from "./ai-agent.service";
import { sendSuccess } from "../../utils/response";
import type { AuthUser } from "../auth/auth.types";

export const chatWithAIAgent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as unknown as AuthUser;
    const result = await AIAgentService.processChatMessage(currentUser, req.body);
    sendSuccess(res, result, 200, "AI query processed successfully");
  } catch (err) {
    next(err);
  }
};

export const listConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as unknown as AuthUser;
    const result = await AIAgentService.getUserConversations(currentUser);
    sendSuccess(res, result, 200, "Conversations retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as unknown as AuthUser;
    const result = await AIAgentService.getConversationById(req.params.id, currentUser);
    sendSuccess(res, result, 200, "Conversation retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user as unknown as AuthUser;
    const result = await AIAgentService.deleteConversation(req.params.id, currentUser);
    sendSuccess(res, result, 200, "Conversation deleted successfully");
  } catch (err) {
    next(err);
  }
};

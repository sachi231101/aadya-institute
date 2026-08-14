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
    sendSuccess(res, "AI query processed successfully", result);
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
    sendSuccess(res, "Conversations retrieved successfully", result);
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
    sendSuccess(res, "Conversation retrieved successfully", result);
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
    sendSuccess(res, "Conversation deleted successfully", result);
  } catch (err) {
    next(err);
  }
};

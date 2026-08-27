import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/response";
import type { AuthUser } from "../auth/auth.types";
import * as service from "./chat.service";
import type { QueryMessagesDTO } from "./chat.types";

export const listConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getUserConversations(req.user as unknown as AuthUser);
    sendSuccess(res, result, 200, "Conversations retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getConversationById(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, result, 200, "Conversation retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createDirectChat = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.createDirectChat(
      req.user as unknown as AuthUser,
      req.body
    );
    sendSuccess(res, result, 201, "Direct conversation ready");
  } catch (error) {
    next(error);
  }
};

export const listMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.getMessages(
      req.user as unknown as AuthUser,
      req.params.id as string,
      req.query as unknown as QueryMessagesDTO
    );
    sendSuccess(res, result.data, 200, "Messages retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.sendMessage(
      req.user as unknown as AuthUser,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, result, 201, "Message sent successfully");
  } catch (error) {
    next(error);
  }
};

export const markConversationRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.markConversationRead(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, result, 200, "Conversation marked as read");
  } catch (error) {
    next(error);
  }
};

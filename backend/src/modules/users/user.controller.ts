import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import {
  listUsersService,
  getUserService,
  createUserService,
  updateUserService,
  updateUserStatusService,
  updateWhatsappPreferenceService,
  deleteUserService,
} from "./user.service";
import type { AuthUser } from "../auth/auth.types";

export const listUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { users, meta } = await listUsersService(
      req.user as unknown as AuthUser,
      req.query as any
    );
    sendPaginated(res, users, meta);
  } catch (err) {
    next(err);
  }
};

export const getUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getUserService(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await createUserService(
      req.user as unknown as AuthUser,
      req.body
    );
    sendSuccess(res, user, 201, "User created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await updateUserService(
      req.user as unknown as AuthUser,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, user, 200, "User updated successfully");
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await updateUserStatusService(
      req.user as unknown as AuthUser,
      req.params.id as string,
      req.body
    );
    sendSuccess(res, user, 200, "User status updated");
  } catch (err) {
    next(err);
  }
};

export const updateWhatsappPreference = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await updateWhatsappPreferenceService(
      req.user as unknown as AuthUser,
      req.body
    );
    sendSuccess(res, user, 200, "WhatsApp preference updated");
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await deleteUserService(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, result, 200, "User deleted successfully");
  } catch (err) {
    next(err);
  }
};

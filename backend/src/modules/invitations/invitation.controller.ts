import type { Response, NextFunction, Request } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import type { AuthUser } from "../auth/auth.types";
import {
  createInvitationService,
  listInvitationsService,
  revokeInvitationService,
  getInvitationByTokenService,
  acceptInvitationService,
} from "./invitation.service";

export const createInvitation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invitation = await createInvitationService(
      req.user as unknown as AuthUser,
      req.body
    );
    sendSuccess(res, invitation, 201, "Invitation created successfully");
  } catch (err) {
    next(err);
  }
};

export const listInvitations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invitations, meta } = await listInvitationsService(
      req.user as unknown as AuthUser,
      req.query as any
    );
    sendPaginated(res, invitations, meta);
  } catch (err) {
    next(err);
  }
};

export const revokeInvitation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invitation = await revokeInvitationService(
      req.user as unknown as AuthUser,
      req.params.id as string
    );
    sendSuccess(res, invitation, 200, "Invitation revoked successfully");
  } catch (err) {
    next(err);
  }
};

export const getInvitationByToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getInvitationByTokenService(req.params.token as string);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await acceptInvitationService(req.body);
    sendSuccess(res, user, 200, "Invitation accepted successfully");
  } catch (err) {
    next(err);
  }
};

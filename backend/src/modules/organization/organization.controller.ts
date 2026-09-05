import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { toAuthUser } from "../../utils/auth-user.util";
import { sendSuccess } from "../../utils/response";
import * as service from "./organization.service";

export const getContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.getOrganizationContext(toAuthUser(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

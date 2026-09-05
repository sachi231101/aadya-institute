import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { toAuthUser } from "../../utils/auth-user.util";
import { sendSuccess } from "../../utils/response";
import * as service from "./institute.service";

export const getAll = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.getAllInstitutes(toAuthUser(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const getById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.getInstituteById(req.params.id as string, toAuthUser(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const create = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.createInstitute(req.body, toAuthUser(req));
    sendSuccess(res, data, 201, "Institute created");
  } catch (err) {
    next(err);
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.updateInstitute(
      req.params.id as string,
      req.body,
      toAuthUser(req)
    );
    sendSuccess(res, data, 200, "Institute updated");
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await service.deleteInstitute(req.params.id as string, toAuthUser(req));
    sendSuccess(res, null, 200, "Institute deleted");
  } catch (err) {
    next(err);
  }
};

export const getOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.getOrganization(toAuthUser(req));
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const updateOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await service.updateOrganization(toAuthUser(req), req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    sendSuccess(res, data, 200, "Organization updated");
  } catch (err) {
    next(err);
  }
};

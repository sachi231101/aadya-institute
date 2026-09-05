import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import type { AuthUser } from "../auth/auth.types";
import * as securityService from "./security.service";

const toAuthUser = (req: AuthenticatedRequest): AuthUser => ({
  id: req.user!.userId,
  name: "",
  email: null,
  phone: null,
  instituteId: req.user!.instituteId,
  branchId: req.user!.branchId,
  allowedBranchIds: req.user!.allowedBranchIds,
  roles: req.user!.roles ?? [],
  permissions: [],
});

const requestMeta = (req: AuthenticatedRequest) => ({
  ipAddress: req.ip || (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || null,
  userAgent: (req.headers["user-agent"] as string) || null,
});

export const getPolicy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const policy = await securityService.getSecurityPolicyService(toAuthUser(req));
    sendSuccess(res, policy);
  } catch (err) {
    next(err);
  }
};

/** Password rules only — available to any authenticated user creating accounts. */
export const getPasswordRequirements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const policy = await securityService.getSecurityPolicyService(toAuthUser(req));
    sendSuccess(res, {
      minPasswordLength: policy.minPasswordLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireNumber: policy.requireNumber,
      requireSpecialChar: policy.requireSpecialChar,
    });
  } catch (err) {
    next(err);
  }
};

export const updatePolicy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const policy = await securityService.updateSecurityPolicyService(
      toAuthUser(req),
      req.body,
      requestMeta(req)
    );
    sendSuccess(res, policy, 200, "Security policy updated");
  } catch (err) {
    next(err);
  }
};

export const listLoginHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items, meta } = await securityService.listLoginHistoryService(
      toAuthUser(req),
      req.query as any
    );
    sendPaginated(res, items, meta);
  } catch (err) {
    next(err);
  }
};

export const listSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentRefresh =
      (req.headers["x-refresh-token"] as string) ||
      (req.query.refreshToken as string) ||
      null;
    const sessions = await securityService.listSessionsService(
      toAuthUser(req),
      currentRefresh
    );
    sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await securityService.revokeSessionService(
      toAuthUser(req),
      req.params.id as string,
      requestMeta(req)
    );
    sendSuccess(res, result, 200, "Session revoked");
  } catch (err) {
    next(err);
  }
};

export const logoutOtherSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const keepCurrent =
      req.body?.keepCurrent ||
      req.body?.refreshToken ||
      (req.headers["x-refresh-token"] as string) ||
      null;
    const result = await securityService.logoutOtherSessionsService(
      toAuthUser(req),
      keepCurrent,
      requestMeta(req)
    );
    sendSuccess(res, result, 200, "Other sessions revoked");
  } catch (err) {
    next(err);
  }
};

export const listAllowedIps = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ips = await securityService.listAllowedIpsService(toAuthUser(req));
    sendSuccess(res, ips);
  } catch (err) {
    next(err);
  }
};

export const addAllowedIp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ip = await securityService.addAllowedIpService(
      toAuthUser(req),
      req.body,
      requestMeta(req)
    );
    sendSuccess(res, ip, 201, "Allowed IP added");
  } catch (err) {
    next(err);
  }
};

export const removeAllowedIp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await securityService.deleteAllowedIpService(
      toAuthUser(req),
      req.params.id as string,
      requestMeta(req)
    );
    sendSuccess(res, result, 200, "Allowed IP removed");
  } catch (err) {
    next(err);
  }
};

export const listAlerts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { items, meta } = await securityService.listAlertsService(
      toAuthUser(req),
      req.query as any
    );
    sendPaginated(res, items, meta);
  } catch (err) {
    next(err);
  }
};

export const resolveAlert = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const alert = await securityService.resolveAlertService(
      toAuthUser(req),
      req.params.id as string
    );
    sendSuccess(res, alert, 200, "Alert resolved");
  } catch (err) {
    next(err);
  }
};

import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { AiCallingService } from "./ai-calling.service";
import type {
  CreateAgentInput,
  UpdateAgentInput,
  UpdateInstituteConfigInput,
  UpdatePlatformSettingsInput,
  UsageQuery,
} from "./ai-calling.validation";

export const getConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = toAuthUser(req);
    const data = await AiCallingService.getInstituteConfig(user.instituteId);
    sendSuccess(res, data, 200, "AI Calling config retrieved");
  } catch (err) {
    next(err);
  }
};

export const updateConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = toAuthUser(req);
    const data = await AiCallingService.updateInstituteConfig(
      user.instituteId,
      req.body as UpdateInstituteConfigInput
    );
    sendSuccess(res, data, 200, "AI Calling config updated");
  } catch (err) {
    next(err);
  }
};

export const getUsage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = toAuthUser(req);
    const data = await AiCallingService.getUsage(
      user.instituteId,
      req.query as unknown as UsageQuery
    );
    sendSuccess(res, data, 200, "AI Calling usage retrieved");
  } catch (err) {
    next(err);
  }
};

export const listAgents = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.listActiveAgents();
    sendSuccess(res, data, 200, "AI Calling agents retrieved");
  } catch (err) {
    next(err);
  }
};

export const getCallLog = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = toAuthUser(req);
    const data = await AiCallingService.getCallLogById(
      String(req.params.id),
      user.instituteId
    );
    sendSuccess(res, data, 200, "Call log retrieved");
  } catch (err) {
    next(err);
  }
};

export const getPlatform = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.getPlatformSettings();
    sendSuccess(res, data, 200, "Platform AI Calling settings retrieved");
  } catch (err) {
    next(err);
  }
};

export const updatePlatform = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.updatePlatformSettings(
      req.body as UpdatePlatformSettingsInput
    );
    sendSuccess(res, data, 200, "Platform AI Calling settings updated");
  } catch (err) {
    next(err);
  }
};

export const listPlatformAgents = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.listPlatformAgents();
    sendSuccess(res, data, 200, "Platform agents retrieved");
  } catch (err) {
    next(err);
  }
};

export const createPlatformAgent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.createPlatformAgent(
      req.body as CreateAgentInput
    );
    sendSuccess(res, data, 201, "Agent created");
  } catch (err) {
    next(err);
  }
};

export const updatePlatformAgent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.updatePlatformAgent(
      String(req.params.id),
      req.body as UpdateAgentInput
    );
    sendSuccess(res, data, 200, "Agent updated");
  } catch (err) {
    next(err);
  }
};

export const deletePlatformAgent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.deletePlatformAgent(String(req.params.id));
    sendSuccess(res, data, 200, "Agent deleted");
  } catch (err) {
    next(err);
  }
};

export const getInstituteConfigAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.getInstituteConfigAsSuperAdmin(
      String(req.params.instituteId)
    );
    sendSuccess(res, data, 200, "Institute AI Calling config retrieved");
  } catch (err) {
    next(err);
  }
};

export const updateInstituteConfigAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await AiCallingService.updateInstituteConfigAsSuperAdmin(
      String(req.params.instituteId),
      req.body as UpdateInstituteConfigInput
    );
    sendSuccess(res, data, 200, "Institute AI Calling config updated");
  } catch (err) {
    next(err);
  }
};

import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import type { AuthUser } from "../auth/auth.types";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { LeadService } from "./lead.service";
import type { QueryCallHistoryDTO } from "./lead.types";

export const createLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await LeadService.createLead(req.user as unknown as AuthUser, req.body);
    sendSuccess(res, lead, 201, "Lead created successfully");
  } catch (err) {
    next(err);
  }
};

export const getLeads = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { leads, meta } = await LeadService.getLeads(req.user as unknown as AuthUser, req.query as any);
    sendPaginated(res, leads, meta, "Leads retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getLeadById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await LeadService.getLeadById(req.params.id as string, req.user as unknown as AuthUser);
    sendSuccess(res, lead, 200, "Lead retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const updateLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await LeadService.updateLead(req.params.id as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, lead, 200, "Lead updated successfully");
  } catch (err) {
    next(err);
  }
};

export const assignLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await LeadService.assignLead(req.params.id as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, result, 200, "Lead assigned successfully");
  } catch (err) {
    next(err);
  }
};

export const changeLeadStage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await LeadService.changeStage(req.params.id as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, lead, 200, "Lead stage updated successfully");
  } catch (err) {
    next(err);
  }
};

export const markLeadLost = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await LeadService.markLost(req.params.id as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, lead, 200, "Lead marked as lost");
  } catch (err) {
    next(err);
  }
};

export const convertLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await LeadService.convertLead(req.params.id as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, result, 200, "Lead converted to student and admission successfully");
  } catch (err) {
    next(err);
  }
};

export const createApplicationFromLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const application = await LeadService.createApplicationFromLead(
      req.params.id as string,
      req.user as unknown as AuthUser,
      req.body
    );
    sendSuccess(res, application, 201, "Application created from lead successfully");
  } catch (err) {
    next(err);
  }
};

export const createFollowUp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const followUp = await LeadService.createFollowUp(req.params.id as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, followUp, 201, "Follow-up scheduled successfully");
  } catch (err) {
    next(err);
  }
};

export const updateFollowUp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const followUp = await LeadService.updateFollowUp(req.params.followUpId as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, followUp, 200, "Follow-up updated successfully");
  } catch (err) {
    next(err);
  }
};

export const getLeadFollowUps = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const followUps = await LeadService.getLeadFollowUps(req.params.id as string, req.user as unknown as AuthUser);
    sendSuccess(res, followUps, 200, "Follow-ups retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const addActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const activity = await LeadService.addActivity(req.params.id as string, req.user as unknown as AuthUser, req.body);
    sendSuccess(res, activity, 201, "Activity added successfully");
  } catch (err) {
    next(err);
  }
};

export const getLeadHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const history = await LeadService.getLeadHistory(req.params.id as string, req.user as unknown as AuthUser);
    sendSuccess(res, history, 200, "Lead history retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getDashboardSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await LeadService.getDashboardSummary(req.user as unknown as AuthUser);
    sendSuccess(res, summary, 200, "Dashboard summary retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getCounsellorPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branchId =
      typeof req.query.branchId === "string" && req.query.branchId.trim()
        ? req.query.branchId.trim()
        : undefined;
    const stats = await LeadService.getCounsellorPerformance(
      req.user as unknown as AuthUser,
      branchId
    );
    sendSuccess(res, stats, 200, "Counsellor performance retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getFollowUpDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dashboard = await LeadService.getFollowUpDashboard(req.user as unknown as AuthUser);
    sendSuccess(res, dashboard, 200, "Follow-up dashboard retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const getCallHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { callLogs, meta } = await LeadService.getCallHistory(
      req.user as unknown as AuthUser,
      req.query as QueryCallHistoryDTO
    );
    sendPaginated(res, callLogs, meta, "Call history retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const triggerLeadCall = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await LeadService.triggerLeadCall(req.params.id as string, req.user as unknown as AuthUser);
    sendSuccess(res, result, 200, "AI call initiated successfully");
  } catch (err) {
    next(err);
  }
};

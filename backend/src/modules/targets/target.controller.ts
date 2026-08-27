import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { TargetService } from "./target.service";
import { sendSuccess, sendPaginated } from "../../utils/response";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateTargetPlanDTO,
  UpdateTargetPlanDTO,
  CreateTargetDTO,
  UpdateTargetDTO,
  QueryTargetsDTO,
  QueryIncentivesDTO,
  ApproveIncentiveDTO,
  RejectIncentiveDTO,
} from "./target.types";

export const TargetController = {
  // ─── Target Plans ──────────────────────────────────────────────────────────

  async getTargetPlans(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plans = await TargetService.getTargetPlans(
        req.user as unknown as AuthUser,
        req.query.status as any
      );
      sendSuccess(res, plans, 200, "Target plans retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  async getTargetPlanById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await TargetService.getTargetPlanById(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, plan, 200, "Target plan retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  async createTargetPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await TargetService.createTargetPlan(
        req.user as unknown as AuthUser,
        req.body as CreateTargetPlanDTO
      );
      sendSuccess(res, plan, 201, "Target plan created successfully");
    } catch (err) {
      next(err);
    }
  },

  async updateTargetPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await TargetService.updateTargetPlan(
        req.user as unknown as AuthUser,
        req.params.id as string,
        req.body as UpdateTargetPlanDTO
      );
      sendSuccess(res, plan, 200, "Target plan updated successfully");
    } catch (err) {
      next(err);
    }
  },

  async publishTargetPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await TargetService.publishTargetPlan(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, plan, 200, "Target plan published successfully");
    } catch (err) {
      next(err);
    }
  },

  async activateTargetPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await TargetService.activateTargetPlan(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, plan, 200, "Target plan activated successfully");
    } catch (err) {
      next(err);
    }
  },

  async lockTargetPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await TargetService.lockTargetPlan(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, plan, 200, "Target plan locked successfully");
    } catch (err) {
      next(err);
    }
  },

  // ─── Targets ───────────────────────────────────────────────────────────────

  async getTargets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TargetService.getTargets(
        req.user as unknown as AuthUser,
        req.query as unknown as QueryTargetsDTO
      );
      sendPaginated(
        res,
        result.data,
        {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        "Targets retrieved successfully"
      );
    } catch (err) {
      next(err);
    }
  },

  async getTargetById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const target = await TargetService.getTargetById(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, target, 200, "Target retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  async createTarget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const target = await TargetService.createTarget(
        req.user as unknown as AuthUser,
        req.body as CreateTargetDTO
      );
      sendSuccess(res, target, 201, "Target created successfully");
    } catch (err) {
      next(err);
    }
  },

  async updateTarget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const target = await TargetService.updateTarget(
        req.user as unknown as AuthUser,
        req.params.id as string,
        req.body as UpdateTargetDTO
      );
      sendSuccess(res, target, 200, "Target updated successfully");
    } catch (err) {
      next(err);
    }
  },

  async deleteTarget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TargetService.deleteTarget(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, result, 200, "Target deleted successfully");
    } catch (err) {
      next(err);
    }
  },

  async recalculateTarget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const progress = await TargetService.recalculateTarget(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, progress, 200, "Target progress recalculated successfully");
    } catch (err) {
      next(err);
    }
  },

  // ─── Counselor Self-Service ────────────────────────────────────────────────

  async getMyCurrentTargets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TargetService.getMyCurrentTargets(
        req.user as unknown as AuthUser
      );
      sendSuccess(res, result, 200, "Current targets retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  async getMyPerformanceHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TargetService.getMyPerformanceHistory(
        req.user as unknown as AuthUser
      );
      sendSuccess(res, result, 200, "Performance history retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  // ─── Performance & Leaderboards ────────────────────────────────────────────

  async getPerformanceSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const summary = await TargetService.getPerformanceSummary(
        req.user as unknown as AuthUser,
        req.query.branchId as string | undefined
      );
      sendSuccess(res, summary, 200, "Performance summary retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  async getLeaderboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const leaderboard = await TargetService.getLeaderboard(
        req.user as unknown as AuthUser,
        req.query.branchId as string | undefined
      );
      sendSuccess(res, leaderboard, 200, "Leaderboard retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  // ─── Incentives & Approvals ────────────────────────────────────────────────

  async getIncentives(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TargetService.getIncentives(
        req.user as unknown as AuthUser,
        req.query as unknown as QueryIncentivesDTO
      );
      sendPaginated(
        res,
        result.data,
        {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        "Incentives retrieved successfully"
      );
    } catch (err) {
      next(err);
    }
  },

  async getIncentiveById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const incentive = await TargetService.getIncentiveById(
        req.user as unknown as AuthUser,
        req.params.id as string
      );
      sendSuccess(res, incentive, 200, "Incentive retrieved successfully");
    } catch (err) {
      next(err);
    }
  },

  async approveIncentive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const incentive = await TargetService.approveIncentive(
        req.user as unknown as AuthUser,
        req.params.id as string,
        req.body as ApproveIncentiveDTO
      );
      sendSuccess(res, incentive, 200, "Incentive approved successfully");
    } catch (err) {
      next(err);
    }
  },

  async rejectIncentive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const incentive = await TargetService.rejectIncentive(
        req.user as unknown as AuthUser,
        req.params.id as string,
        req.body as RejectIncentiveDTO
      );
      sendSuccess(res, incentive, 200, "Incentive rejected successfully");
    } catch (err) {
      next(err);
    }
  },
};

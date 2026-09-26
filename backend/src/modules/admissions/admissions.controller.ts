import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { AdmissionsService } from "./admissions.service";
import { toAuthUser } from "../../utils/auth-user.util";
import { resolveEffectiveBranchId } from "../../utils/branch-isolation.util";
import {
  createApplicationSchema,
  updateApplicationSchema,
  queryApplicationsSchema,
  createApplicationActivitySchema,
  createAdmissionSchema,
  updateAdmissionSchema,
  queryAdmissionsSchema,
  admissionStaffOptionsQuerySchema,
} from "./admissions.validation";
import type { ApplicationStatus, FeeStatus, AdmissionStatus } from "./admissions.types";

export const AdmissionsController = {
  async getStaffOptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const { branchId } = admissionStaffOptionsQuerySchema.parse(req.query);
      const data = await AdmissionsService.listStaffOptions(user, branchId);
      res.json({
        success: true,
        message: "Admission staff options fetched successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async getApplications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const parsedQuery = queryApplicationsSchema.parse(req.query);
      const branchId = resolveEffectiveBranchId(user);
      const result = await AdmissionsService.getApplications(user.instituteId, {
        ...parsedQuery,
        feeStatus: parsedQuery.feeStatus as FeeStatus | "ALL" | undefined,
        status: parsedQuery.status as ApplicationStatus | "ALL" | undefined,
        branchId,
      });
      res.json({
        success: true,
        message: "Applications fetched successfully",
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getApplicationById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const id = req.params.id as string;
      const data = await AdmissionsService.getApplicationById(id, user.instituteId, user);
      res.json({
        success: true,
        message: "Application fetched successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async createApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const dto = createApplicationSchema.parse(req.body);
      const data = await AdmissionsService.createApplication(user, dto);
      res.status(201).json({
        success: true,
        message: "Application created successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const id = req.params.id as string;
      const dto = updateApplicationSchema.parse(req.body);
      const data = await AdmissionsService.updateApplication(id, user, dto);
      res.json({
        success: true,
        message: "Application updated successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const id = req.params.id as string;
      await AdmissionsService.deleteApplication(id, user);
      res.json({
        success: true,
        message: "Application deleted successfully",
        data: { id },
      });
    } catch (err) {
      next(err);
    }
  },

  async getApplicationActivities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const id = req.params.id as string;
      const data = await AdmissionsService.getApplicationActivities(id, user);
      res.json({
        success: true,
        message: "Application activities fetched successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async createApplicationActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const id = req.params.id as string;
      const dto = createApplicationActivitySchema.parse(req.body);
      const data = await AdmissionsService.createApplicationActivity(id, user, dto);
      res.status(201).json({
        success: true,
        message: "Note added successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // ─── ADMISSIONS ────────────────────────────────────────────────────────────
  async getAdmissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const parsedQuery = queryAdmissionsSchema.parse(req.query);
      const result = await AdmissionsService.getAdmissions(user, {
        ...parsedQuery,
        status: parsedQuery.status as AdmissionStatus | "ALL" | undefined,
      });
      res.json({
        success: true,
        message: "Admissions fetched successfully",
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getAdmissionById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = toAuthUser(req);
      const id = req.params.id as string;
      const data = await AdmissionsService.getAdmissionById(id, user);
      res.json({
        success: true,
        message: "Admission fetched successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async createAdmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const branchId = req.user!.branchId || undefined;
      const dto = createAdmissionSchema.parse(req.body);
      const data = await AdmissionsService.createAdmission(instituteId, branchId, dto, {
        roles: req.user!.roles || [],
        userId: req.user!.userId,
        currentUser: toAuthUser(req),
      });
      res.status(201).json({
        success: true,
        message: "Admission created successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAdmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const dto = updateAdmissionSchema.parse(req.body);
      const data = await AdmissionsService.updateAdmission(id, toAuthUser(req), dto);
      res.json({
        success: true,
        message: "Admission updated successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteAdmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await AdmissionsService.deleteAdmission(id, toAuthUser(req));
      res.json({
        success: true,
        message: "Admission deleted successfully",
        data: { id },
      });
    } catch (err) {
      next(err);
    }
  },
};

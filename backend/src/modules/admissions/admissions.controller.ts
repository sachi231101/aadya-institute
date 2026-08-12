import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { AdmissionsService } from "./admissions.service";
import {
  createEnquirySchema,
  updateEnquirySchema,
  queryEnquiriesSchema,
  createApplicationSchema,
  updateApplicationSchema,
  queryApplicationsSchema,
  createAdmissionSchema,
  updateAdmissionSchema,
  queryAdmissionsSchema,
  convertEnquirySchema,
  convertApplicationSchema,
} from "./admissions.validation";
import type { EnquirySource, EnquiryStatus, ApplicationStatus, FeeStatus, AdmissionStatus } from "./admissions.types";

export const AdmissionsController = {
  // ─── ENQUIRIES ─────────────────────────────────────────────────────────────
  async getEnquiries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const parsedQuery = queryEnquiriesSchema.parse(req.query);
      const result = await AdmissionsService.getEnquiries(instituteId, {
        ...parsedQuery,
        source: parsedQuery.source as EnquirySource | "ALL" | undefined,
        status: parsedQuery.status as EnquiryStatus | "ALL" | undefined,
      });
      res.json({
        success: true,
        message: "Enquiries fetched successfully",
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

  async getEnquiryById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const data = await AdmissionsService.getEnquiryById(id, instituteId);
      res.json({
        success: true,
        message: "Enquiry fetched successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async createEnquiry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const branchId = req.user!.branchId || undefined;
      const dto = createEnquirySchema.parse(req.body);
      const data = await AdmissionsService.createEnquiry(instituteId, branchId, dto);
      res.status(201).json({
        success: true,
        message: "Enquiry created successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateEnquiry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const dto = updateEnquirySchema.parse(req.body);
      const data = await AdmissionsService.updateEnquiry(id, instituteId, dto);
      res.json({
        success: true,
        message: "Enquiry updated successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteEnquiry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      await AdmissionsService.deleteEnquiry(id, instituteId);
      res.json({
        success: true,
        message: "Enquiry deleted successfully",
        data: { id },
      });
    } catch (err) {
      next(err);
    }
  },

  async convertEnquiryToApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const dto = convertEnquirySchema.parse(req.body);
      const data = await AdmissionsService.convertEnquiryToApplication(id, instituteId, dto);
      res.status(201).json({
        success: true,
        message: "Enquiry converted to application successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async getApplications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const parsedQuery = queryApplicationsSchema.parse(req.query);
      const result = await AdmissionsService.getApplications(instituteId, {
        ...parsedQuery,
        feeStatus: parsedQuery.feeStatus as FeeStatus | "ALL" | undefined,
        status: parsedQuery.status as ApplicationStatus | "ALL" | undefined,
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
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const data = await AdmissionsService.getApplicationById(id, instituteId);
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
      const instituteId = req.user!.instituteId;
      const branchId = req.user!.branchId || undefined;
      const dto = createApplicationSchema.parse(req.body);
      const data = await AdmissionsService.createApplication(instituteId, branchId, dto);
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
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const dto = updateApplicationSchema.parse(req.body);
      const data = await AdmissionsService.updateApplication(id, instituteId, dto);
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
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      await AdmissionsService.deleteApplication(id, instituteId);
      res.json({
        success: true,
        message: "Application deleted successfully",
        data: { id },
      });
    } catch (err) {
      next(err);
    }
  },

  async convertApplicationToAdmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const dto = convertApplicationSchema.parse(req.body);
      const data = await AdmissionsService.convertApplicationToAdmission(id, instituteId, dto);
      res.status(201).json({
        success: true,
        message: "Application converted to admission successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // ─── ADMISSIONS ────────────────────────────────────────────────────────────
  async getAdmissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const instituteId = req.user!.instituteId;
      const parsedQuery = queryAdmissionsSchema.parse(req.query);
      const result = await AdmissionsService.getAdmissions(instituteId, {
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
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const data = await AdmissionsService.getAdmissionById(id, instituteId);
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
      const data = await AdmissionsService.createAdmission(instituteId, branchId, dto);
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
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      const dto = updateAdmissionSchema.parse(req.body);
      const data = await AdmissionsService.updateAdmission(id, instituteId, dto);
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
      const instituteId = req.user!.instituteId;
      const id = req.params.id as string;
      await AdmissionsService.deleteAdmission(id, instituteId);
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

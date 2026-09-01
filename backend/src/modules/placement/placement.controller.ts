import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { PlacementService } from "./placement.service";

const paginated = (
  handler: (user: ReturnType<typeof toAuthUser>, query: Record<string, unknown>) => Promise<{ data: unknown[]; meta: unknown }>
) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await handler(toAuthUser(req), req.query as Record<string, unknown>);
      sendPaginated(res, result.data, result.meta as never, "Records retrieved successfully");
    } catch (err) {
      next(err);
    }
  };

export const listCompanies = paginated((user, query) =>
  PlacementService.listCompanies(user, query as never)
);
export const listJobs = paginated((user, query) => PlacementService.listJobs(user, query as never));
export const listApplications = paginated((user, query) =>
  PlacementService.listApplications(user, query as never)
);
export const listInterviews = paginated((user, query) =>
  PlacementService.listInterviews(user, query as never)
);
export const listPlacements = paginated((user, query) =>
  PlacementService.listPlacements(user, query as never)
);
export const getEligibleStudents = paginated((user, query) =>
  PlacementService.getEligibleStudents(user, query as never)
);

export const getCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.getCompany(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Company retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.createCompany(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Company created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.updateCompany(toAuthUser(req), String(req.params.id), req.body);
    sendSuccess(res, data, 200, "Company updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await PlacementService.deleteCompany(toAuthUser(req), String(req.params.id));
    sendSuccess(res, null, 200, "Company deactivated successfully");
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.getJob(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Job retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.createJob(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Job created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.updateJob(toAuthUser(req), String(req.params.id), req.body);
    sendSuccess(res, data, 200, "Job updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await PlacementService.deleteJob(toAuthUser(req), String(req.params.id));
    sendSuccess(res, null, 200, "Job deactivated successfully");
  } catch (err) {
    next(err);
  }
};

export const getApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.getApplication(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Application retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.createApplication(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Application created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.updateApplication(toAuthUser(req), String(req.params.id), req.body);
    sendSuccess(res, data, 200, "Application updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await PlacementService.deleteApplication(toAuthUser(req), String(req.params.id));
    sendSuccess(res, null, 200, "Application deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const getInterview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.getInterview(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Interview retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createInterview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.createInterview(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Interview scheduled successfully");
  } catch (err) {
    next(err);
  }
};

export const updateInterview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.updateInterview(toAuthUser(req), String(req.params.id), req.body);
    sendSuccess(res, data, 200, "Interview updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deleteInterview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await PlacementService.deleteInterview(toAuthUser(req), String(req.params.id));
    sendSuccess(res, null, 200, "Interview deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const getPlacement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.getPlacement(toAuthUser(req), String(req.params.id));
    sendSuccess(res, data, 200, "Placement record retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createPlacement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.createPlacement(toAuthUser(req), req.body);
    sendSuccess(res, data, 201, "Placement record created successfully");
  } catch (err) {
    next(err);
  }
};

export const updatePlacement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await PlacementService.updatePlacement(toAuthUser(req), String(req.params.id), req.body);
    sendSuccess(res, data, 200, "Placement record updated successfully");
  } catch (err) {
    next(err);
  }
};

export const deletePlacement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await PlacementService.deletePlacement(toAuthUser(req), String(req.params.id));
    sendSuccess(res, null, 200, "Placement record deleted successfully");
  } catch (err) {
    next(err);
  }
};

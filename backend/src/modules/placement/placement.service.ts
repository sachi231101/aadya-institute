import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import { PlacementRepository } from "./placement.repository";
import { prisma } from "../../config/database";
import type {
  ListCompaniesQuery,
  ListJobsQuery,
  ListApplicationsQuery,
  ListInterviewsQuery,
  ListPlacementsQuery,
  EligibleStudentsQuery,
} from "./placement.validation";
import type { z } from "zod";
import type {
  createCompanySchema,
  updateCompanySchema,
  createJobSchema,
  updateJobSchema,
  createApplicationSchema,
  updateApplicationSchema,
  createInterviewSchema,
  updateInterviewSchema,
  createPlacementSchema,
  updatePlacementSchema,
} from "./placement.validation";

type CreateCompanyInput = z.infer<typeof createCompanySchema>;
type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
type CreateJobInput = z.infer<typeof createJobSchema>;
type UpdateJobInput = z.infer<typeof updateJobSchema>;
type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
type CreatePlacementInput = z.infer<typeof createPlacementSchema>;
type UpdatePlacementInput = z.infer<typeof updatePlacementSchema>;

export const PlacementService = {
  async listCompanies(currentUser: AuthUser, query: ListCompaniesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await PlacementRepository.findCompanies(currentUser.instituteId, {
      search: query.search,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async getCompany(currentUser: AuthUser, id: string) {
    const company = await PlacementRepository.findCompanyById(id, currentUser.instituteId);
    if (!company) throw new AppError("Company not found", 404);
    return company;
  },

  async createCompany(currentUser: AuthUser, input: CreateCompanyInput) {
    return PlacementRepository.createCompany({
      institute: { connect: { id: currentUser.instituteId } },
      name: input.name,
      industry: input.industry,
      website: input.website || undefined,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail || undefined,
      contactPhone: input.contactPhone,
      address: input.address,
    });
  },

  async updateCompany(currentUser: AuthUser, id: string, input: UpdateCompanyInput) {
    await PlacementService.getCompany(currentUser, id);
    return PlacementRepository.updateCompany(id, currentUser.instituteId, input);
  },

  async deleteCompany(currentUser: AuthUser, id: string) {
    await PlacementService.getCompany(currentUser, id);
    await PlacementRepository.deleteCompany(id, currentUser.instituteId);
  },

  async listJobs(currentUser: AuthUser, query: ListJobsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await PlacementRepository.findJobs(currentUser.instituteId, {
      companyId: query.companyId,
      search: query.search,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async getJob(currentUser: AuthUser, id: string) {
    const job = await PlacementRepository.findJobById(id, currentUser.instituteId);
    if (!job) throw new AppError("Job not found", 404);
    return job;
  },

  async createJob(currentUser: AuthUser, input: CreateJobInput) {
    await PlacementService.getCompany(currentUser, input.companyId);
    return PlacementRepository.createJob({
      institute: { connect: { id: currentUser.instituteId } },
      company: { connect: { id: input.companyId } },
      title: input.title,
      description: input.description,
      location: input.location,
      salaryRange: input.salaryRange,
      openings: input.openings,
      eligibility: input.eligibility as import("@prisma/client").Prisma.InputJsonValue,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    });
  },

  async updateJob(currentUser: AuthUser, id: string, input: UpdateJobInput) {
    await PlacementService.getJob(currentUser, id);
    return PlacementRepository.updateJob(id, currentUser.instituteId, {
      title: input.title,
      description: input.description,
      location: input.location,
      salaryRange: input.salaryRange,
      openings: input.openings,
      eligibility: input.eligibility as import("@prisma/client").Prisma.InputJsonValue | undefined,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      ...(input.companyId ? { company: { connect: { id: input.companyId } } } : {}),
    });
  },

  async deleteJob(currentUser: AuthUser, id: string) {
    await PlacementService.getJob(currentUser, id);
    await PlacementRepository.deleteJob(id, currentUser.instituteId);
  },

  async listApplications(currentUser: AuthUser, query: ListApplicationsQuery) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await PlacementRepository.findApplications(scope.instituteId, {
      branchId: scope.branchId,
      jobId: query.jobId,
      studentId: query.studentId,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async getApplication(currentUser: AuthUser, id: string) {
    const app = await PlacementRepository.findApplicationById(id, currentUser.instituteId);
    if (!app) throw new AppError("Application not found", 404);
    if (app.branchId && !hasBranchAccess(currentUser, app.branchId)) {
      throw new AppError("Access denied", 403);
    }
    return app;
  },

  async createApplication(currentUser: AuthUser, input: CreateApplicationInput) {
    const scope = getBranchScopeFilter(currentUser, input.branchId);
    const job = await PlacementService.getJob(currentUser, input.jobId);
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, instituteId: scope.instituteId },
    });
    if (!student) throw new AppError("Student not found", 404);
    if (scope.branchId && student.branchId !== scope.branchId) {
      throw new AppError("Student not in your branch", 403);
    }

    return PlacementRepository.createApplication({
      institute: { connect: { id: scope.instituteId } },
      branch: { connect: { id: student.branchId } },
      job: { connect: { id: job.id } },
      student: { connect: { id: student.id } },
      notes: input.notes,
    });
  },

  async updateApplication(currentUser: AuthUser, id: string, input: UpdateApplicationInput) {
    await PlacementService.getApplication(currentUser, id);
    return PlacementRepository.updateApplication(id, currentUser.instituteId, input);
  },

  async deleteApplication(currentUser: AuthUser, id: string) {
    await PlacementService.getApplication(currentUser, id);
    await PlacementRepository.deleteApplication(id, currentUser.instituteId);
  },

  async listInterviews(currentUser: AuthUser, query: ListInterviewsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let applicationIds: string[] | undefined;
    if (!query.applicationId) {
      const apps = await prisma.placementApplication.findMany({
        where: { instituteId: currentUser.instituteId },
        select: { id: true },
      });
      applicationIds = apps.map((a) => a.id);
    }

    const { total, data } = await PlacementRepository.findInterviews({
      applicationId: query.applicationId,
      applicationIds: query.applicationId ? undefined : applicationIds,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, meta: buildMeta(total, page, limit) };
  },

  async getInterview(currentUser: AuthUser, id: string) {
    const interview = await PlacementRepository.findInterviewById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    const app = await PlacementService.getApplication(currentUser, interview.applicationId);
    return { ...interview, application: app };
  },

  async createInterview(currentUser: AuthUser, input: CreateInterviewInput) {
    await PlacementService.getApplication(currentUser, input.applicationId);
    const interview = await PlacementRepository.createInterview({
      application: { connect: { id: input.applicationId } },
      scheduledAt: input.scheduledAt,
      mode: input.mode,
      location: input.location,
      interviewer: input.interviewer,
    });
    await PlacementRepository.updateApplication(input.applicationId, currentUser.instituteId, {
      status: "INTERVIEW_SCHEDULED",
    });
    return interview;
  },

  async updateInterview(currentUser: AuthUser, id: string, input: UpdateInterviewInput) {
    await PlacementService.getInterview(currentUser, id);
    return PlacementRepository.updateInterview(id, input);
  },

  async deleteInterview(currentUser: AuthUser, id: string) {
    await PlacementService.getInterview(currentUser, id);
    await PlacementRepository.deleteInterview(id);
  },

  async listPlacements(currentUser: AuthUser, query: ListPlacementsQuery) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await PlacementRepository.findPlacements(scope.instituteId, {
      branchId: scope.branchId,
      studentId: query.studentId,
      companyId: query.companyId,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async getPlacement(currentUser: AuthUser, id: string) {
    const record = await PlacementRepository.findPlacementById(id, currentUser.instituteId);
    if (!record) throw new AppError("Placement record not found", 404);
    if (record.branchId && !hasBranchAccess(currentUser, record.branchId)) {
      throw new AppError("Access denied", 403);
    }
    return record;
  },

  async createPlacement(currentUser: AuthUser, input: CreatePlacementInput) {
    const scope = getBranchScopeFilter(currentUser, input.branchId);
    await PlacementService.getCompany(currentUser, input.companyId);
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, instituteId: scope.instituteId },
    });
    if (!student) throw new AppError("Student not found", 404);

    return PlacementRepository.createPlacement({
      institute: { connect: { id: scope.instituteId } },
      branch: { connect: { id: student.branchId } },
      student: { connect: { id: student.id } },
      company: { connect: { id: input.companyId } },
      ...(input.jobId ? { job: { connect: { id: input.jobId } } } : {}),
      applicationId: input.applicationId,
      package: input.package,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
      status: input.status,
      notes: input.notes,
    });
  },

  async updatePlacement(currentUser: AuthUser, id: string, input: UpdatePlacementInput) {
    await PlacementService.getPlacement(currentUser, id);
    return PlacementRepository.updatePlacement(id, currentUser.instituteId, {
      ...input,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
      ...(input.companyId ? { company: { connect: { id: input.companyId } } } : {}),
      ...(input.jobId ? { job: { connect: { id: input.jobId } } } : {}),
      ...(input.studentId ? { student: { connect: { id: input.studentId } } } : {}),
    });
  },

  async deletePlacement(currentUser: AuthUser, id: string) {
    await PlacementService.getPlacement(currentUser, id);
    await PlacementRepository.deletePlacement(id, currentUser.instituteId);
  },

  async getEligibleStudents(currentUser: AuthUser, query: EligibleStudentsQuery) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await PlacementRepository.findEligibleStudents(scope.instituteId, {
      branchId: scope.branchId,
      courseId: query.courseId,
      minAttendance: query.minAttendance ?? 75,
      search: query.search,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },
};

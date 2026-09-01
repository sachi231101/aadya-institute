import { z } from "zod";

const paginationSchema = {
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
};

export const listCompaniesQuerySchema = z.object({
  ...paginationSchema,
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(1).trim(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
});

export const listJobsQuerySchema = z.object({
  ...paginationSchema,
  companyId: z.string().optional(),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]).optional(),
});

export const createJobSchema = z.object({
  companyId: z.string().min(1),
  title: z.string().min(1).trim(),
  description: z.string().optional(),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
  openings: z.coerce.number().int().positive().optional().default(1),
  eligibility: z.record(z.string(), z.unknown()).optional(),
  deadline: z.string().datetime().optional().or(z.string().optional()),
});

export const updateJobSchema = createJobSchema.partial();

export const listApplicationsQuerySchema = z.object({
  ...paginationSchema,
  branchId: z.string().optional(),
  jobId: z.string().optional(),
  studentId: z.string().optional(),
  status: z
    .enum([
      "APPLIED",
      "SHORTLISTED",
      "INTERVIEW_SCHEDULED",
      "SELECTED",
      "REJECTED",
      "WITHDRAWN",
    ])
    .optional(),
});

export const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  studentId: z.string().min(1),
  branchId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateApplicationSchema = z.object({
  status: z
    .enum([
      "APPLIED",
      "SHORTLISTED",
      "INTERVIEW_SCHEDULED",
      "SELECTED",
      "REJECTED",
      "WITHDRAWN",
    ])
    .optional(),
  notes: z.string().optional(),
});

export const listInterviewsQuerySchema = z.object({
  ...paginationSchema,
  applicationId: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
});

export const createInterviewSchema = z.object({
  applicationId: z.string().min(1),
  scheduledAt: z.string().or(z.date()).transform((v) => new Date(v)),
  mode: z.string().optional(),
  location: z.string().optional(),
  interviewer: z.string().optional(),
});

export const updateInterviewSchema = z.object({
  scheduledAt: z.string().or(z.date()).transform((v) => new Date(v)).optional(),
  mode: z.string().optional(),
  location: z.string().optional(),
  interviewer: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  feedback: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const listPlacementsQuerySchema = z.object({
  ...paginationSchema,
  branchId: z.string().optional(),
  studentId: z.string().optional(),
  companyId: z.string().optional(),
  status: z.enum(["OFFERED", "JOINED", "DECLINED"]).optional(),
});

export const createPlacementSchema = z.object({
  studentId: z.string().min(1),
  companyId: z.string().min(1),
  jobId: z.string().optional(),
  applicationId: z.string().optional(),
  branchId: z.string().optional(),
  package: z.string().optional(),
  joiningDate: z.string().optional(),
  status: z.enum(["OFFERED", "JOINED", "DECLINED"]).optional().default("OFFERED"),
  notes: z.string().optional(),
});

export const updatePlacementSchema = createPlacementSchema.partial();

export const eligibleStudentsQuerySchema = z.object({
  ...paginationSchema,
  branchId: z.string().optional(),
  courseId: z.string().optional(),
  minAttendance: z.coerce.number().min(0).max(100).optional().default(75),
  search: z.string().trim().optional(),
});

export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type ListInterviewsQuery = z.infer<typeof listInterviewsQuerySchema>;
export type ListPlacementsQuery = z.infer<typeof listPlacementsQuerySchema>;
export type EligibleStudentsQuery = z.infer<typeof eligibleStudentsQuerySchema>;

import { prisma } from "../../config/database";
import type { Prisma, Status } from "@prisma/client";

export const PlacementRepository = {
  // ─── Companies ─────────────────────────────────────────────────────────────
  async findCompanies(instituteId: string, params: {
    search?: string;
    status?: Status;
    skip: number;
    take: number;
  }) {
    const where: Prisma.PlacementCompanyWhereInput = {
      instituteId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { industry: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.placementCompany.count({ where }),
      prisma.placementCompany.findMany({
        where,
        include: { _count: { select: { jobs: true, records: true } } },
        orderBy: { name: "asc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async findCompanyById(id: string, instituteId: string) {
    return prisma.placementCompany.findFirst({
      where: { id, instituteId },
      include: { jobs: { where: { status: "ACTIVE" }, take: 10 } },
    });
  },

  async createCompany(data: Prisma.PlacementCompanyCreateInput) {
    return prisma.placementCompany.create({ data });
  },

  async updateCompany(id: string, instituteId: string, data: Prisma.PlacementCompanyUpdateInput) {
    await prisma.placementCompany.updateMany({ where: { id, instituteId }, data });
    return PlacementRepository.findCompanyById(id, instituteId);
  },

  async deleteCompany(id: string, instituteId: string) {
    return prisma.placementCompany.updateMany({
      where: { id, instituteId },
      data: { status: "INACTIVE" },
    });
  },

  // ─── Jobs ────────────────────────────────────────────────────────────────────
  async findJobs(instituteId: string, params: {
    companyId?: string;
    search?: string;
    status?: Status;
    skip: number;
    take: number;
  }) {
    const where: Prisma.PlacementJobWhereInput = {
      instituteId,
      ...(params.companyId ? { companyId: params.companyId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: "insensitive" } },
              { location: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.placementJob.count({ where }),
      prisma.placementJob.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async findJobById(id: string, instituteId: string) {
    return prisma.placementJob.findFirst({
      where: { id, instituteId },
      include: { company: true },
    });
  },

  async createJob(data: Prisma.PlacementJobCreateInput) {
    return prisma.placementJob.create({ data, include: { company: true } });
  },

  async updateJob(id: string, instituteId: string, data: Prisma.PlacementJobUpdateInput) {
    await prisma.placementJob.updateMany({ where: { id, instituteId }, data });
    return PlacementRepository.findJobById(id, instituteId);
  },

  async deleteJob(id: string, instituteId: string) {
    return prisma.placementJob.updateMany({
      where: { id, instituteId },
      data: { status: "INACTIVE" },
    });
  },

  // ─── Applications ──────────────────────────────────────────────────────────
  async findApplications(instituteId: string, params: {
    branchId?: string;
    jobId?: string;
    studentId?: string;
    status?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.PlacementApplicationWhereInput = {
      instituteId,
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.jobId ? { jobId: params.jobId } : {}),
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.status ? { status: params.status as never } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.placementApplication.count({ where }),
      prisma.placementApplication.findMany({
        where,
        include: {
          job: { include: { company: { select: { id: true, name: true } } } },
          student: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async findApplicationById(id: string, instituteId: string) {
    return prisma.placementApplication.findFirst({
      where: { id, instituteId },
      include: {
        job: { include: { company: true } },
        student: { include: { user: { select: { id: true, name: true } } } },
        interviews: true,
      },
    });
  },

  async createApplication(data: Prisma.PlacementApplicationCreateInput) {
    return prisma.placementApplication.create({
      data,
      include: {
        job: { include: { company: true } },
        student: { include: { user: { select: { id: true, name: true } } } },
      },
    });
  },

  async updateApplication(id: string, instituteId: string, data: Prisma.PlacementApplicationUpdateInput) {
    await prisma.placementApplication.updateMany({ where: { id, instituteId }, data });
    return PlacementRepository.findApplicationById(id, instituteId);
  },

  async deleteApplication(id: string, instituteId: string) {
    return prisma.placementApplication.deleteMany({ where: { id, instituteId } });
  },

  // ─── Interviews ──────────────────────────────────────────────────────────────
  async findInterviews(params: {
    applicationIds?: string[];
    applicationId?: string;
    status?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.PlacementInterviewWhereInput = {
      ...(params.applicationId ? { applicationId: params.applicationId } : {}),
      ...(params.applicationIds?.length
        ? { applicationId: { in: params.applicationIds } }
        : {}),
      ...(params.status ? { status: params.status as never } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.placementInterview.count({ where }),
      prisma.placementInterview.findMany({
        where,
        include: {
          application: {
            include: {
              student: { include: { user: { select: { id: true, name: true } } } },
              job: { include: { company: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async findInterviewById(id: string) {
    return prisma.placementInterview.findUnique({
      where: { id },
      include: { application: true },
    });
  },

  async createInterview(data: Prisma.PlacementInterviewCreateInput) {
    return prisma.placementInterview.create({ data });
  },

  async updateInterview(id: string, data: Prisma.PlacementInterviewUpdateInput) {
    return prisma.placementInterview.update({ where: { id }, data });
  },

  async deleteInterview(id: string) {
    return prisma.placementInterview.delete({ where: { id } });
  },

  // ─── Placements ──────────────────────────────────────────────────────────────
  async findPlacements(instituteId: string, params: {
    branchId?: string;
    studentId?: string;
    companyId?: string;
    status?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.PlacementRecordWhereInput = {
      instituteId,
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.companyId ? { companyId: params.companyId } : {}),
      ...(params.status ? { status: params.status as never } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.placementRecord.count({ where }),
      prisma.placementRecord.findMany({
        where,
        include: {
          student: { include: { user: { select: { id: true, name: true } } } },
          company: { select: { id: true, name: true } },
          job: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async findPlacementById(id: string, instituteId: string) {
    return prisma.placementRecord.findFirst({
      where: { id, instituteId },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        company: true,
        job: true,
      },
    });
  },

  async createPlacement(data: Prisma.PlacementRecordCreateInput) {
    return prisma.placementRecord.create({
      data,
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        company: true,
        job: true,
      },
    });
  },

  async updatePlacement(id: string, instituteId: string, data: Prisma.PlacementRecordUpdateInput) {
    await prisma.placementRecord.updateMany({ where: { id, instituteId }, data });
    return PlacementRepository.findPlacementById(id, instituteId);
  },

  async deletePlacement(id: string, instituteId: string) {
    return prisma.placementRecord.deleteMany({ where: { id, instituteId } });
  },

  async findEligibleStudents(instituteId: string, params: {
    branchId?: string;
    courseId?: string;
    minAttendance: number;
    search?: string;
    skip: number;
    take: number;
  }) {
    const students = await prisma.student.findMany({
      where: {
        instituteId,
        status: "ACTIVE",
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.search
          ? {
              OR: [
                { studentCode: { contains: params.search, mode: "insensitive" } },
                { user: { name: { contains: params.search, mode: "insensitive" } } },
              ],
            }
          : {}),
        ...(params.courseId
          ? { admissions: { some: { courseId: params.courseId, status: { in: ["ACTIVE", "CONFIRMED", "COMPLETED"] } } } }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        branch: { select: { id: true, name: true } },
        admissions: { include: { course: { select: { id: true, name: true } } }, take: 1 },
        studentAttendances: { select: { status: true } },
        placementRecords: { where: { status: "JOINED" }, take: 1 },
      },
    });

    const eligible = students
      .filter((s) => s.placementRecords.length === 0)
      .map((s) => {
        const total = s.studentAttendances.length;
        const present = s.studentAttendances.filter((a) => a.status === "PRESENT").length;
        const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;
        return {
          id: s.id,
          studentCode: s.studentCode,
          name: s.user?.name || s.studentCode,
          email: s.user?.email,
          phone: s.user?.phone,
          branch: s.branch,
          courseName: s.admissions[0]?.course?.name || "Unassigned",
          attendancePercentage: attendancePct,
        };
      })
      .filter((s) => s.attendancePercentage >= params.minAttendance);

    const total = eligible.length;
    const data = eligible.slice(params.skip, params.skip + params.take);
    return { total, data };
  },
};

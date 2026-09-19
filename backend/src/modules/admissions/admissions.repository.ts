import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import type {
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  QueryAdmissionsDTO,
  CreateApplicationActivityDTO,
} from "./admissions.types";
import { provisionAdmission } from "./admission-provision.service";

const applicationInclude = {
  course: { select: { id: true, name: true, code: true } },
  lead: { select: { id: true, name: true, source: true } },
  paymentModeMaster: { select: { id: true, name: true, code: true } },
  payment: {
    select: {
      id: true,
      receiptNo: true,
      amount: true,
      status: true,
      transactionRef: true,
      date: true,
    },
  },
} as const;

export const AdmissionsRepository = {
  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async findApplications(instituteId: string, params: QueryApplicationsDTO) {
    const { search, feeStatus, status, courseId, branchId, page = 1, limit = 20 } = params;

    const where: Prisma.ApplicationWhereInput = {
      instituteId,
      ...(branchId ? { branchId } : {}),
      ...(feeStatus && feeStatus !== "ALL" ? { feeStatus: feeStatus as any } : {}),
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(courseId && courseId !== "ALL" ? { courseId } : {}),
      ...(search
        ? {
            OR: [
              { applicantName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { applicationNo: { contains: search, mode: "insensitive" } },
              { course: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: applicationInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  async findApplicationById(id: string, instituteId: string) {
    return prisma.application.findFirst({
      where: { id, instituteId },
      include: {
        ...applicationInclude,
        lead: { select: { id: true, name: true, source: true, phoneNumber: true } },
        admissions: { select: { id: true, admissionNo: true, status: true }, orderBy: { createdAt: "desc" } },
        activities: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
  },

  async createApplication(
    instituteId: string,
    branchId: string,
    applicationNo: string,
    dto: CreateApplicationDTO
  ) {
    const isPaid = dto.feeStatus === "PAID";
    return prisma.application.create({
      data: {
        instituteId,
        branchId,
        applicationNo,
        leadId: dto.leadId || null,
        applicantName: dto.applicantName,
        email: dto.email || null,
        phone: dto.phone,
        courseId: dto.courseId,
        feeStatus: dto.feeStatus || "PENDING",
        applicationFee: isPaid && dto.applicationFee != null ? dto.applicationFee : null,
        paymentModeMasterId: isPaid ? dto.paymentModeMasterId || null : null,
        paymentRef: isPaid ? dto.paymentRef || null : null,
        feePaidAt: isPaid ? new Date() : null,
        status: dto.status || "SUBMITTED",
        notes: dto.notes || null,
      },
      include: applicationInclude,
    });
  },

  async updateApplication(id: string, instituteId: string, dto: UpdateApplicationDTO) {
    const data: Prisma.ApplicationUpdateManyMutationInput = {
      ...(dto.applicantName !== undefined ? { applicantName: dto.applicantName } : {}),
      ...(dto.email !== undefined ? { email: dto.email || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };

    if (dto.feeStatus === "PENDING") {
      data.feeStatus = "PENDING";
      data.applicationFee = null;
      data.paymentModeMasterId = null;
      data.paymentRef = null;
      data.feePaidAt = null;
      data.paymentId = null;
    } else if (dto.feeStatus === "PAID") {
      data.feeStatus = "PAID";
      if (dto.applicationFee !== undefined) data.applicationFee = dto.applicationFee;
      if (dto.paymentModeMasterId !== undefined) {
        data.paymentModeMasterId = dto.paymentModeMasterId;
      }
      if (dto.paymentRef !== undefined) data.paymentRef = dto.paymentRef;
      data.feePaidAt = new Date();
    } else {
      if (dto.applicationFee !== undefined) data.applicationFee = dto.applicationFee;
      if (dto.paymentModeMasterId !== undefined) {
        data.paymentModeMasterId = dto.paymentModeMasterId;
      }
      if (dto.paymentRef !== undefined) data.paymentRef = dto.paymentRef;
    }

    return prisma.application.updateMany({
      where: { id, instituteId },
      data,
    });
  },

  async deleteApplication(id: string, instituteId: string) {
    return prisma.application.deleteMany({
      where: { id, instituteId },
    });
  },

  async findApplicationActivities(applicationId: string) {
    return prisma.applicationActivity.findMany({
      where: { applicationId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async createApplicationActivity(
    applicationId: string,
    userId: string | undefined,
    dto: CreateApplicationActivityDTO
  ) {
    return prisma.applicationActivity.create({
      data: {
        applicationId,
        userId: userId || null,
        type: dto.type || "NOTE_ADDED",
        title: dto.title || "Note added",
        description: dto.description,
        metadata: (dto.metadata as Prisma.InputJsonValue) || undefined,
      },
      include: { user: { select: { id: true, name: true } } },
    });
  },

  // ─── ADMISSIONS ────────────────────────────────────────────────────────────
  async findAdmissions(
    instituteId: string,
    params: QueryAdmissionsDTO,
    branchId?: string
  ) {
    const { search, courseId, status, batchId, page = 1, limit = 50 } = params;

    const where: Prisma.AdmissionWhereInput = {
      instituteId,
      ...(branchId ? { branchId } : {}),
      ...(courseId && courseId !== "ALL" ? { courseId } : {}),
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(batchId && batchId !== "ALL" ? { batchId } : {}),
      ...(search
        ? {
            OR: [
              { studentName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { admissionNo: { contains: search, mode: "insensitive" } },
              { course: { name: { contains: search, mode: "insensitive" } } },
              { batch: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true } },
          student: { select: { id: true, studentCode: true } },
          application: { select: { id: true, applicationNo: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findAdmissionById(id: string, instituteId: string, branchId?: string) {
    return prisma.admission.findFirst({
      where: {
        id,
        instituteId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        course: { select: { id: true, name: true, code: true, fee: true } },
        batch: { select: { id: true, name: true, code: true, timeSlot: true, schedulePattern: true } },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        application: { select: { id: true, applicationNo: true, status: true, feeStatus: true } },
        branch: { select: { id: true, name: true, code: true } },
        payments: { orderBy: { date: "desc" } },
        pendingFees: { orderBy: { dueDate: "asc" } },
      },
    });
  },

  async createAdmission(
    instituteId: string,
    branchId: string,
    admissionNo: string,
    dto: CreateAdmissionDTO,
    currentUserId?: string
  ) {
    return provisionAdmission({
      instituteId,
      branchId,
      admissionNo,
      dto,
      currentUserId,
    });
  },

  async updateAdmission(id: string, instituteId: string, dto: UpdateAdmissionDTO) {
    return prisma.admission.updateMany({
      where: { id, instituteId },
      data: {
        ...(dto.studentName !== undefined ? { studentName: dto.studentName } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.batchId !== undefined ? { batchId: dto.batchId || null } : {}),
        ...(dto.feePlan !== undefined ? { feePlan: dto.feePlan } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.termsAcceptance !== undefined
          ? {
              termsAcceptance: dto.termsAcceptance as unknown as Prisma.InputJsonValue,
              termsAcceptedAt: new Date(),
            }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  },

  async deleteAdmission(id: string, instituteId: string) {
    return prisma.admission.deleteMany({
      where: { id, instituteId },
    });
  },
};

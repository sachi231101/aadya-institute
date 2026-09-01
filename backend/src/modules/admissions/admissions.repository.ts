import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import type { 
  CreateEnquiryDTO, 
  UpdateEnquiryDTO, 
  QueryEnquiriesDTO,
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  QueryAdmissionsDTO
} from "./admissions.types";
import { SequenceService } from "../masters/sequence.service";
import { provisionAdmission } from "./admission-provision.service";

export const AdmissionsRepository = {
  // ─── ENQUIRIES ─────────────────────────────────────────────────────────────
  async findEnquiries(instituteId: string, params: QueryEnquiriesDTO) {
    const { search, source, status, courseId, page = 1, limit = 50 } = params;

    const where: Prisma.EnquiryWhereInput = {
      instituteId,
      ...(source && source !== "ALL" ? { source: source as any } : {}),
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(courseId && courseId !== "ALL" ? { courseId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { enquiryNo: { contains: search, mode: "insensitive" } },
              { course: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findEnquiryById(id: string, instituteId: string) {
    return prisma.enquiry.findFirst({
      where: { id, instituteId },
      include: {
        course: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        applications: true,
      },
    });
  },

  async createEnquiry(instituteId: string, branchId: string | undefined, enquiryNo: string, dto: CreateEnquiryDTO) {
    return prisma.enquiry.create({
      data: {
        instituteId,
        branchId,
        enquiryNo,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone,
        courseId: dto.courseId,
        source: dto.source || "WEBSITE",
        status: dto.status || "NEW",
        counselorNotes: dto.counselorNotes || null,
        assignedToId: dto.assignedToId || null,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async updateEnquiry(id: string, instituteId: string, dto: UpdateEnquiryDTO) {
    return prisma.enquiry.updateMany({
      where: { id, instituteId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.counselorNotes !== undefined ? { counselorNotes: dto.counselorNotes } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
      },
    });
  },

  async deleteEnquiry(id: string, instituteId: string) {
    return prisma.enquiry.deleteMany({
      where: { id, instituteId },
    });
  },

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async findApplications(instituteId: string, params: QueryApplicationsDTO) {
    const { search, feeStatus, status, courseId, page = 1, limit = 50 } = params;

    const where: Prisma.ApplicationWhereInput = {
      instituteId,
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
        include: {
          course: { select: { id: true, name: true, code: true } },
          enquiry: { select: { id: true, enquiryNo: true, source: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findApplicationById(id: string, instituteId: string) {
    return prisma.application.findFirst({
      where: { id, instituteId },
      include: {
        course: { select: { id: true, name: true, code: true } },
        enquiry: true,
        admissions: true,
      },
    });
  },

  async createApplication(instituteId: string, branchId: string | undefined, applicationNo: string, dto: CreateApplicationDTO) {
    return prisma.application.create({
      data: {
        instituteId,
        branchId,
        applicationNo,
        enquiryId: dto.enquiryId || null,
        applicantName: dto.applicantName,
        email: dto.email || null,
        phone: dto.phone,
        courseId: dto.courseId,
        feeStatus: dto.feeStatus || "PENDING",
        status: dto.status || "SUBMITTED",
        notes: dto.notes || null,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
      },
    });
  },

  async updateApplication(id: string, instituteId: string, dto: UpdateApplicationDTO) {
    return prisma.application.updateMany({
      where: { id, instituteId },
      data: {
        ...(dto.applicantName !== undefined ? { applicantName: dto.applicantName } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.feeStatus !== undefined ? { feeStatus: dto.feeStatus } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  },

  async deleteApplication(id: string, instituteId: string) {
    return prisma.application.deleteMany({
      where: { id, instituteId },
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

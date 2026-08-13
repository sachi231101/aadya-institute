import { AdmissionsRepository } from "./admissions.repository";
import { prisma } from "../../config/database";
import type { 
  CreateEnquiryDTO, 
  UpdateEnquiryDTO, 
  QueryEnquiriesDTO,
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  QueryAdmissionsDTO,
  ConvertEnquiryDTO,
  ConvertApplicationDTO
} from "./admissions.types";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import { logger } from "../../config/logger";

const triggerAdmissionNotification = async (admissionId: string) => {
  try {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { course: true, student: true },
    });
    if (!admission) return;

    const studentId = admission.studentId ?? undefined;
    const idempotencyKey = buildIdempotencyKey.ADMISSION_CREATED(
      studentId ?? admission.id,
      admission.id
    );

    await triggerNotification({
      instituteId: admission.instituteId,
      studentId,
      event: NotificationEvent.ADMISSION_CREATED,
      idempotencyKey,
      templateParams: {
        student_name: admission.studentName ?? "Student",
        course_name: admission.course?.name ?? "Course",
        admission_no: admission.admissionNo ?? "ADM-001",
      },
      metadata: {
        admissionId: admission.id,
        admissionNo: admission.admissionNo,
        phone: admission.phone,
      },
    });
  } catch (err) {
    logger.error({ err, admissionId }, "[admissions] Failed to trigger admission notification");
  }
};

export const AdmissionsService = {
  // Helper for generating sequential numbers
  async generateNo(prefix: string): Promise<string> {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-2026-${randomDigits}${timestamp}`;
  },

  // ─── ENQUIRIES ─────────────────────────────────────────────────────────────
  async getEnquiries(instituteId: string, params: QueryEnquiriesDTO) {
    return AdmissionsRepository.findEnquiries(instituteId, params);
  },

  async getEnquiryById(id: string, instituteId: string) {
    const enquiry = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }
    return enquiry;
  },

  async createEnquiry(instituteId: string, branchId: string | undefined, dto: CreateEnquiryDTO) {
    const enquiryNo = await this.generateNo("ENQ");
    return AdmissionsRepository.createEnquiry(instituteId, branchId, enquiryNo, dto);
  },

  async updateEnquiry(id: string, instituteId: string, dto: UpdateEnquiryDTO) {
    const existing = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!existing) {
      throw new Error("Enquiry not found");
    }
    await AdmissionsRepository.updateEnquiry(id, instituteId, dto);
    return AdmissionsRepository.findEnquiryById(id, instituteId);
  },

  async deleteEnquiry(id: string, instituteId: string) {
    const existing = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!existing) {
      throw new Error("Enquiry not found");
    }
    await AdmissionsRepository.deleteEnquiry(id, instituteId);
    return { id };
  },

  async convertEnquiryToApplication(id: string, instituteId: string, dto: ConvertEnquiryDTO) {
    const enquiry = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }

    const applicationNo = await this.generateNo("APP");

    // Perform atomic transaction
    const application = await prisma.$transaction(async (tx) => {
      // 1. Update Enquiry status to CONVERTED
      await tx.enquiry.update({
        where: { id },
        data: { status: "CONVERTED" },
      });

      // 2. Create Application record
      return tx.application.create({
        data: {
          instituteId: enquiry.instituteId,
          branchId: enquiry.branchId,
          applicationNo,
          enquiryId: enquiry.id,
          applicantName: enquiry.name,
          email: enquiry.email,
          phone: enquiry.phone,
          courseId: enquiry.courseId,
          feeStatus: dto.feeStatus || "PAID",
          status: "SUBMITTED",
          notes: dto.notes || `Converted from Enquiry ${enquiry.enquiryNo || enquiry.id}`,
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
        },
      });
    });

    return application;
  },

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async getApplications(instituteId: string, params: QueryApplicationsDTO) {
    return AdmissionsRepository.findApplications(instituteId, params);
  },

  async getApplicationById(id: string, instituteId: string) {
    const app = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!app) {
      throw new Error("Application not found");
    }
    return app;
  },

  async createApplication(instituteId: string, branchId: string | undefined, dto: CreateApplicationDTO) {
    const applicationNo = await this.generateNo("APP");
    return AdmissionsRepository.createApplication(instituteId, branchId, applicationNo, dto);
  },

  async updateApplication(id: string, instituteId: string, dto: UpdateApplicationDTO) {
    const existing = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!existing) {
      throw new Error("Application not found");
    }
    await AdmissionsRepository.updateApplication(id, instituteId, dto);
    return AdmissionsRepository.findApplicationById(id, instituteId);
  },

  async deleteApplication(id: string, instituteId: string) {
    const existing = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!existing) {
      throw new Error("Application not found");
    }
    await AdmissionsRepository.deleteApplication(id, instituteId);
    return { id };
  },

  async convertApplicationToAdmission(id: string, instituteId: string, dto: ConvertApplicationDTO) {
    const app = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!app) {
      throw new Error("Application not found");
    }

    const admissionNo = await this.generateNo("ADM");

    // Perform atomic transaction
    const admission = await prisma.$transaction(async (tx) => {
      // 1. Update Application status to ADMITTED
      await tx.application.update({
        where: { id },
        data: { status: "ADMITTED" },
      });

      // 2. Create Admission record
      const newAdmission = await tx.admission.create({
        data: {
          instituteId: app.instituteId,
          branchId: app.branchId || (await tx.branch.findFirst({ where: { instituteId: app.instituteId } }))?.id || "",
          admissionNo,
          applicationId: app.id,
          studentName: app.applicantName,
          email: app.email,
          phone: app.phone,
          courseId: app.courseId,
          batchId: dto.batchId || null,
          feePlan: dto.feePlan || "INSTALLMENT",
          status: "CONFIRMED",
          notes: dto.notes || `Converted from Application ${app.applicationNo}`,
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true } },
        },
      });

      return newAdmission;
    });

    setImmediate(() => {
      triggerAdmissionNotification(admission.id);
    });

    return admission;
  },

  // ─── ADMISSIONS ────────────────────────────────────────────────────────────
  async getAdmissions(instituteId: string, params: QueryAdmissionsDTO) {
    return AdmissionsRepository.findAdmissions(instituteId, params);
  },

  async getAdmissionById(id: string, instituteId: string) {
    const adm = await AdmissionsRepository.findAdmissionById(id, instituteId);
    if (!adm) {
      throw new Error("Admission not found");
    }
    return adm;
  },

  async createAdmission(instituteId: string, userBranchId: string | undefined, dto: CreateAdmissionDTO) {
    // Determine branchId
    let branchId = userBranchId;
    if (!branchId) {
      const defaultBranch = await prisma.branch.findFirst({ where: { instituteId } });
      if (!defaultBranch) {
        throw new Error("No branch available for this institute");
      }
      branchId = defaultBranch.id;
    }

    const admissionNo = await this.generateNo("ADM");
    const admission = await AdmissionsRepository.createAdmission(instituteId, branchId, admissionNo, dto);

    setImmediate(() => {
      triggerAdmissionNotification(admission.id);
    });

    return admission;
  },

  async updateAdmission(id: string, instituteId: string, dto: UpdateAdmissionDTO) {
    const existing = await AdmissionsRepository.findAdmissionById(id, instituteId);
    if (!existing) {
      throw new Error("Admission not found");
    }
    await AdmissionsRepository.updateAdmission(id, instituteId, dto);
    return AdmissionsRepository.findAdmissionById(id, instituteId);
  },

  async deleteAdmission(id: string, instituteId: string) {
    const existing = await AdmissionsRepository.findAdmissionById(id, instituteId);
    if (!existing) {
      throw new Error("Admission not found");
    }
    await AdmissionsRepository.deleteAdmission(id, instituteId);
    return { id };
  },
};

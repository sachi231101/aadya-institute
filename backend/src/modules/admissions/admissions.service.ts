import { AdmissionsRepository } from "./admissions.repository";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import { sendStudentCredentialsWhatsAppService } from "../students/student.service";
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
import { SequenceService } from "../masters/sequence.service";
import { assertBranchRecordAccess } from "../../utils/branch-isolation.util";
import { assertActiveMaster } from "../masters/master.validator";

const resolveRequiredTermsAcceptance = async (
  instituteId: string,
  branchId: string,
  acceptance: CreateAdmissionDTO["termsAcceptance"]
) => {
  const activeTerms = await prisma.masterRecord.findMany({
    where: {
      instituteId,
      entityType: "termsconditions",
      status: "ACTIVE",
      OR: [{ branchId }, { branchId: null }],
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const acceptedIds = new Set((acceptance ?? []).map((item) => item.masterId));
  const activeIds = new Set(activeTerms.map((item) => item.id));
  if (
    acceptedIds.size !== activeIds.size ||
    [...activeIds].some((id) => !acceptedIds.has(id)) ||
    [...acceptedIds].some((id) => !activeIds.has(id))
  ) {
    throw new AppError("All active Terms & Conditions must be accepted", 400);
  }

  for (const term of activeTerms) {
    await assertActiveMaster({
      instituteId,
      branchId,
      entityType: "termsconditions",
      masterRecordId: term.id,
    });
  }

  return activeTerms.map((term) => ({ masterId: term.id, name: term.name }));
};

const triggerAdmissionNotification = async (admissionId: string) => {
  try {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { course: true, student: true },
    });
    if (!admission) return;

    const studentId = admission.studentId ?? undefined;
    const idempotencyKey = buildIdempotencyKey.STUDENT_WELCOME(
      studentId ?? admission.id,
      admission.id
    );

    await triggerNotification({
      instituteId: admission.instituteId,
      studentId,
      event: NotificationEvent.STUDENT_WELCOME,
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
  // Helper for generating sequential numbers (backward compatible helper)
  async generateNo(prefix: string): Promise<string> {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-2026-${randomDigits}${timestamp}`;
  },

  // ─── ENQUIRIES ─────────────────────────────────────────────────────────────
  async getEnquiries(instituteId: string, params: QueryEnquiriesDTO) {
    return AdmissionsRepository.findEnquiries(instituteId, params);
  },

  async getEnquiryById(id: string, instituteId: string, currentUser: AuthUser) {
    const enquiry = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }
    assertBranchRecordAccess(currentUser, enquiry.branchId);
    return enquiry;
  },

  async createEnquiry(instituteId: string, branchId: string | undefined, dto: CreateEnquiryDTO) {
    const enquiryNo = await SequenceService.getNextNumber(instituteId, "ENQUIRY");
    const enquiry = await AdmissionsRepository.createEnquiry(instituteId, branchId, enquiryNo, dto);

    if (dto.assignedToId) {
      const { syncLeadAssigneeFromEnquiry } = await import(
        "../leads/services/lead-enquiry-sync.service"
      );
      await syncLeadAssigneeFromEnquiry({
        instituteId,
        phone: dto.phone,
        counsellorId: dto.assignedToId,
      });
    }

    return enquiry;
  },

  async updateEnquiry(id: string, instituteId: string, dto: UpdateEnquiryDTO) {
    const existing = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!existing) {
      throw new Error("Enquiry not found");
    }
    await AdmissionsRepository.updateEnquiry(id, instituteId, dto);

    // Keep Lead.assignedCounsellorId in sync when enquiry assignee changes
    if (dto.assignedToId !== undefined) {
      const { syncLeadAssigneeFromEnquiry } = await import(
        "../leads/services/lead-enquiry-sync.service"
      );
      await syncLeadAssigneeFromEnquiry({
        instituteId,
        phone: existing.phone,
        counsellorId: dto.assignedToId || null,
      });
    }

    return AdmissionsRepository.findEnquiryById(id, instituteId);
  },

  async triggerEnquiryAiCall(
    id: string,
    instituteId: string,
    createdById: string
  ) {
    const enquiry = await AdmissionsRepository.findEnquiryById(id, instituteId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }

    const { normalizePhoneDigits } = await import(
      "../leads/services/lead-enquiry-sync.service"
    );
    const phone = normalizePhoneDigits(enquiry.phone);
    if (!phone) {
      throw new Error("Enquiry has no valid phone number");
    }

    const { ensureLeadFromEnquiry } = await import(
      "../leads/services/lead-enquiry-bridge.service"
    );
    const { lead: matchedLead, created: leadCreated } =
      await ensureLeadFromEnquiry({
        enquiry,
        createdById,
      });

    const { AiCallingService } = await import("../ai-calling/ai-calling.service");
    const dial = await AiCallingService.enqueueLeadCall({
      id: matchedLead.id,
      phoneNumber: matchedLead.phoneNumber,
      createdById: matchedLead.createdById,
      instituteId: matchedLead.instituteId,
      branchId: matchedLead.branchId,
      importJobId: matchedLead.importJobId,
    });

    const status = dial.queued
      ? "INITIATED"
      : dial.skipped === "telephony_unavailable"
        ? "FAILED"
        : dial.skipped || "SKIPPED";

    await AdmissionsRepository.updateEnquiry(id, instituteId, {
      counselorNotes: [
        enquiry.counselorNotes,
        `[AI Call ${status}] Queued ${new Date().toISOString()} callLog=${dial.callLogId || "n/a"}${
          leadCreated ? ` leadCreated=${matchedLead.id}` : ` leadId=${matchedLead.id}`
        }`,
      ]
        .filter(Boolean)
        .join("\n"),
      status: enquiry.status === "NEW" ? "IN_PROGRESS" : enquiry.status,
    });

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

    const applicationNo = await SequenceService.getNextNumber(instituteId, "APPLICATION");

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

  async getApplicationById(id: string, instituteId: string, currentUser: AuthUser) {
    const app = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!app) {
      throw new Error("Application not found");
    }
    assertBranchRecordAccess(currentUser, app.branchId);
    return app;
  },

  async createApplication(instituteId: string, branchId: string | undefined, dto: CreateApplicationDTO) {
    const applicationNo = await SequenceService.getNextNumber(instituteId, "APPLICATION");
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

  async convertApplicationToAdmission(
    id: string,
    instituteId: string,
    dto: ConvertApplicationDTO,
    currentUser?: AuthUser
  ) {
    const app = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!app) {
      throw new AppError("Application not found", 404);
    }

    if (
      currentUser &&
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      app.branchId &&
      app.branchId !== currentUser.branchId
    ) {
      throw new AppError("Application not found", 404);
    }

    const branchId =
      app.branchId ||
      currentUser?.branchId ||
      (await prisma.branch.findFirst({ where: { instituteId }, orderBy: { createdAt: "asc" } }))?.id;

    if (!branchId) {
      throw new AppError("No branch available for this institute", 400);
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId },
      select: { code: true },
    });

    const admissionNo = await SequenceService.getNextNumber(instituteId, "ADMISSION", {
      branchCode: branch?.code,
    });

    const status = dto.totalFee && dto.totalFee > 0 ? "CONFIRMED" : "PROVISIONAL";
    const termsAcceptance = await resolveRequiredTermsAcceptance(
      instituteId,
      branchId,
      dto.termsAcceptance
    );

    const admission = await AdmissionsRepository.createAdmission(
      instituteId,
      branchId,
      admissionNo,
      {
        studentName: app.applicantName,
        email: app.email || undefined,
        phone: app.phone,
        courseId: app.courseId,
        batchId: dto.batchId,
        applicationId: app.id,
        leadId: app.leadId || undefined,
        feePlan: dto.feePlan || "INSTALLMENT",
        status,
        notes: dto.notes || `Converted from Application ${app.applicationNo}`,
        totalFee: dto.totalFee,
        amountPaid: dto.amountPaid,
        installments: dto.installments,
        termsAcceptance,
      },
      currentUser?.userId
    );

    setImmediate(() => {
      triggerAdmissionNotification(admission.id);
    });

    return admission;
  },

  // ─── ADMISSIONS ────────────────────────────────────────────────────────────
  async getAdmissions(currentUser: AuthUser, params: QueryAdmissionsDTO) {
    const scope = getBranchScopeFilter(currentUser, params.branchId);
    return AdmissionsRepository.findAdmissions(scope.instituteId, params, scope.branchId);
  },

  async getAdmissionById(id: string, currentUser: AuthUser) {
    const scope = getBranchScopeFilter(currentUser);
    const adm = await AdmissionsRepository.findAdmissionById(
      id,
      scope.instituteId,
      scope.branchId
    );
    if (!adm) {
      throw new AppError("Admission not found", 404);
    }

    const documents = await prisma.document.findMany({
      where: {
        instituteId: scope.instituteId,
        entityType: "ADMISSION",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
    });

    return { ...adm, documents };
  },

  async createAdmission(
    instituteId: string,
    userBranchId: string | undefined,
    dto: CreateAdmissionDTO,
    options?: { roles?: string[]; userId?: string; currentUser?: AuthUser }
  ) {
    let branchId: string | undefined;

    if (dto.branchId) {
      const requestedBranch = await prisma.branch.findFirst({
        where: { id: dto.branchId, instituteId },
      });
      if (!requestedBranch) {
        throw new AppError("Selected branch not found for this institute", 400);
      }
      branchId = requestedBranch.id;
    } else if (userBranchId) {
      branchId = userBranchId;
    } else {
      const defaultBranch = await prisma.branch.findFirst({
        where: { instituteId },
        orderBy: { createdAt: "asc" },
      });
      if (!defaultBranch) {
        throw new AppError("No branch available for this institute", 400);
      }
      branchId = defaultBranch.id;
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, instituteId },
      select: { code: true },
    });

    const normalizedDto: CreateAdmissionDTO =
      (dto.status || "CONFIRMED") === "PENDING"
        ? dto
        : {
            ...dto,
            termsAcceptance: await resolveRequiredTermsAcceptance(
              instituteId,
              branchId,
              dto.termsAcceptance
            ),
          };

    const admissionNo = await SequenceService.getNextNumber(instituteId, "ADMISSION", {
      branchCode: branch?.code,
    });

    const admission = await AdmissionsRepository.createAdmission(
      instituteId,
      branchId,
      admissionNo,
      normalizedDto,
      options?.userId
    );

    setImmediate(() => {
      triggerAdmissionNotification(admission.id);
      if (dto.sendCredentials && admission.studentId && options?.currentUser) {
        sendStudentCredentialsWhatsAppService(admission.studentId, options.currentUser).catch(
          (err) => logger.error({ err, admissionId: admission.id }, "[admissions] Failed to send credentials")
        );
      }
    });

    return admission;
  },

  async updateAdmission(id: string, currentUser: AuthUser, dto: UpdateAdmissionDTO) {
    const existing = await AdmissionsRepository.findAdmissionById(id, currentUser.instituteId);
    if (!existing) {
      throw new AppError("Admission not found", 404);
    }
    if (!hasBranchAccess(currentUser, existing.branchId)) {
      throw new AppError("Admission not found", 404);
    }
    const normalizedDto: UpdateAdmissionDTO =
      dto.status && dto.status !== "PENDING"
        ? {
            ...dto,
            termsAcceptance: await resolveRequiredTermsAcceptance(
              currentUser.instituteId,
              existing.branchId,
              dto.termsAcceptance
            ),
          }
        : dto.status === "PENDING"
          ? { ...dto, termsAcceptance: undefined }
          : dto;
    await AdmissionsRepository.updateAdmission(id, currentUser.instituteId, normalizedDto);
    return this.getAdmissionById(id, currentUser);
  },

  async deleteAdmission(id: string, currentUser: AuthUser) {
    const existing = await AdmissionsRepository.findAdmissionById(id, currentUser.instituteId);
    if (!existing) {
      throw new AppError("Admission not found", 404);
    }
    if (!hasBranchAccess(currentUser, existing.branchId)) {
      throw new AppError("Admission not found", 404);
    }
    await AdmissionsRepository.deleteAdmission(id, currentUser.instituteId);
    return { id };
  },
};

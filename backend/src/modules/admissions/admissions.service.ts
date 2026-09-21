import { AdmissionsRepository } from "./admissions.repository";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import { sendStudentCredentialsWhatsAppService } from "../students/student.service";
import type {
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  QueryAdmissionsDTO,
  CreateApplicationActivityDTO,
} from "./admissions.types";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import { logger } from "../../config/logger";
import { SequenceService } from "../masters/sequence.service";
import { assertBranchRecordAccess } from "../../utils/branch-isolation.util";
import { assertActiveMaster } from "../masters/master.validator";
import * as studentAllocationService from "../students/student-allocation.service";
import {
  recordApplicationFeePayment,
  voidApplicationFeePayment,
} from "./application-fee-payment.service";
import { markLeadConverted } from "./admission-provision.service";

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

/** Resolve branch for application create: force user branch for non-admin; require explicit branch for admin. */
const resolveApplicationBranchId = async (
  currentUser: AuthUser,
  dtoBranchId?: string
): Promise<string> => {
  const isAdmin = currentUser.roles.includes("ADMIN");
  const needsForcedBranch =
    !isAdmin &&
    (currentUser.roles.includes("CENTER_MANAGER") ||
      currentUser.roles.includes("COUNSELLOR"));

  if (needsForcedBranch) {
    if (!currentUser.branchId) {
      throw new AppError("Your account has no branch assigned — cannot create application", 400);
    }
    return currentUser.branchId;
  }

  const branchId = dtoBranchId || currentUser.branchId;
  if (!branchId) {
    throw new AppError("Branch is required to create an application", 400);
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, instituteId: currentUser.instituteId },
    select: { id: true },
  });
  if (!branch) {
    throw new AppError("Selected branch not found for this institute", 400);
  }
  return branch.id;
};

export const AdmissionsService = {
  async generateNo(prefix: string): Promise<string> {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-2026-${randomDigits}${timestamp}`;
  },

  // ─── APPLICATIONS ──────────────────────────────────────────────────────────
  async getApplications(instituteId: string, params: QueryApplicationsDTO) {
    return AdmissionsRepository.findApplications(instituteId, params);
  },

  async getApplicationById(id: string, instituteId: string, currentUser: AuthUser) {
    const app = await AdmissionsRepository.findApplicationById(id, instituteId);
    if (!app) {
      throw new AppError("Application not found", 404);
    }
    assertBranchRecordAccess(currentUser, app.branchId);
    return app;
  },

  async createApplication(currentUser: AuthUser, dto: CreateApplicationDTO) {
    const branchId = await resolveApplicationBranchId(currentUser, dto.branchId);

    if (dto.feeStatus === "PAID") {
      if (dto.applicationFee == null || Number.isNaN(Number(dto.applicationFee))) {
        throw new AppError("Application fee amount is required when marked as paid", 400);
      }
      if (!dto.paymentModeMasterId) {
        throw new AppError("Payment mode is required when marked as paid", 400);
      }
      await assertActiveMaster({
        instituteId: currentUser.instituteId,
        entityType: "paymentmodes",
        masterRecordId: dto.paymentModeMasterId,
        branchId,
      });
    }

    const applicationNo = await SequenceService.getNextNumber(
      currentUser.instituteId,
      "APPLICATION"
    );
    const app = await AdmissionsRepository.createApplication(
      currentUser.instituteId,
      branchId,
      applicationNo,
      { ...dto, status: dto.status || "SUBMITTED" }
    );

    let receiptNo: string | undefined;
    let paymentId: string | undefined;
    if (dto.feeStatus === "PAID" && dto.paymentModeMasterId && dto.applicationFee != null) {
      const courseName =
        (
          await prisma.course.findFirst({
            where: { id: dto.courseId },
            select: { name: true },
          })
        )?.name || "Course";
      const recorded = await recordApplicationFeePayment({
        instituteId: currentUser.instituteId,
        branchId,
        applicationId: app.id,
        applicationNo,
        applicantName: dto.applicantName,
        courseName,
        amount: Number(dto.applicationFee),
        paymentModeMasterId: dto.paymentModeMasterId,
        paymentRef: dto.paymentRef,
        recordedById: currentUser.userId || currentUser.id,
      });
      receiptNo = recorded.receiptNo;
      paymentId = recorded.paymentId;
    }

    const feeDesc =
      dto.feeStatus === "PAID"
        ? ` Fee ₹${dto.applicationFee} paid${receiptNo ? ` (receipt ${receiptNo})` : ""}.`
        : "";
    await AdmissionsRepository.createApplicationActivity(app.id, currentUser.userId || currentUser.id, {
      type: "CREATED",
      title: "Application created",
      description: `Application ${applicationNo} created for ${dto.applicantName}.${feeDesc}`,
      metadata:
        dto.feeStatus === "PAID"
          ? {
              applicationFee: dto.applicationFee,
              paymentModeMasterId: dto.paymentModeMasterId,
              paymentRef: dto.paymentRef || null,
              paymentId: paymentId || null,
              receiptNo: receiptNo || null,
            }
          : undefined,
    });

    return AdmissionsRepository.findApplicationById(app.id, currentUser.instituteId);
  },

  async updateApplication(
    id: string,
    currentUser: AuthUser,
    dto: UpdateApplicationDTO
  ) {
    const existing = await AdmissionsRepository.findApplicationById(
      id,
      currentUser.instituteId
    );
    if (!existing) {
      throw new AppError("Application not found", 404);
    }
    assertBranchRecordAccess(currentUser, existing.branchId);

    if (dto.feeStatus === "PAID") {
      if (dto.applicationFee == null || Number.isNaN(Number(dto.applicationFee))) {
        throw new AppError("Application fee amount is required when marked as paid", 400);
      }
      if (!dto.paymentModeMasterId) {
        throw new AppError("Payment mode is required when marked as paid", 400);
      }
      await assertActiveMaster({
        instituteId: currentUser.instituteId,
        entityType: "paymentmodes",
        masterRecordId: dto.paymentModeMasterId,
        branchId: existing.branchId,
      });
    }

    if (dto.status === "REJECTED") {
      const reason = dto.rejectReason?.trim();
      if (!reason) {
        throw new AppError("Reject reason is required", 400);
      }
    }

    const { rejectReason, ...patch } = dto;

    let receiptNo: string | null = existing.payment?.receiptNo ?? null;
    let paymentId: string | null = existing.paymentId ?? null;

    if (dto.feeStatus === "PENDING") {
      await voidApplicationFeePayment(currentUser.instituteId, existing.paymentId);
      paymentId = null;
      receiptNo = null;
    }

    await AdmissionsRepository.updateApplication(id, currentUser.instituteId, patch);

    if (dto.feeStatus === "PAID" && dto.paymentModeMasterId && dto.applicationFee != null) {
      const courseName =
        existing.course?.name ||
        (
          await prisma.course.findFirst({
            where: { id: dto.courseId || existing.courseId },
            select: { name: true },
          })
        )?.name ||
        "Course";
      const recorded = await recordApplicationFeePayment({
        instituteId: currentUser.instituteId,
        branchId: existing.branchId,
        applicationId: id,
        applicationNo: existing.applicationNo,
        applicantName: dto.applicantName || existing.applicantName,
        courseName,
        amount: Number(dto.applicationFee),
        paymentModeMasterId: dto.paymentModeMasterId,
        paymentRef: dto.paymentRef,
        existingPaymentId: existing.paymentId,
        recordedById: currentUser.userId || currentUser.id,
      });
      receiptNo = recorded.receiptNo;
      paymentId = recorded.paymentId;
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      await AdmissionsRepository.createApplicationActivity(id, currentUser.userId || currentUser.id, {
        type: "STATUS_CHANGED",
        title: dto.status === "REJECTED" ? "Application rejected" : "Status changed",
        description:
          dto.status === "REJECTED"
            ? rejectReason!.trim()
            : `Status changed from ${existing.status} to ${dto.status}`,
        metadata: {
          from: existing.status,
          to: dto.status,
          ...(dto.status === "REJECTED" ? { rejectReason: rejectReason!.trim() } : {}),
        },
      });
    }
    if (dto.feeStatus !== undefined && dto.feeStatus !== existing.feeStatus) {
      const modeName =
        dto.feeStatus === "PAID" && dto.paymentModeMasterId
          ? (
              await prisma.masterRecord.findFirst({
                where: { id: dto.paymentModeMasterId },
                select: { name: true },
              })
            )?.name
          : null;
      await AdmissionsRepository.createApplicationActivity(id, currentUser.userId || currentUser.id, {
        type: "FEE_STATUS_CHANGED",
        title: "Fee status changed",
        description:
          dto.feeStatus === "PAID"
            ? `Marked paid ₹${dto.applicationFee}${modeName ? ` via ${modeName}` : ""}${
                dto.paymentRef ? ` (ref: ${dto.paymentRef})` : ""
              }${receiptNo ? ` · receipt ${receiptNo}` : ""}`
            : "Marked application fee as pending",
        metadata: {
          from: existing.feeStatus,
          to: dto.feeStatus,
          applicationFee: dto.applicationFee ?? null,
          paymentModeMasterId: dto.paymentModeMasterId ?? null,
          paymentModeName: modeName,
          paymentRef: dto.paymentRef ?? null,
          paymentId,
          receiptNo,
        },
      });
    }

    return AdmissionsRepository.findApplicationById(id, currentUser.instituteId);
  },

  async deleteApplication(id: string, currentUser: AuthUser) {
    const existing = await AdmissionsRepository.findApplicationById(
      id,
      currentUser.instituteId
    );
    if (!existing) {
      throw new AppError("Application not found", 404);
    }
    assertBranchRecordAccess(currentUser, existing.branchId);
    await AdmissionsRepository.deleteApplication(id, currentUser.instituteId);
    return { id };
  },

  async getApplicationActivities(id: string, currentUser: AuthUser) {
    const app = await AdmissionsRepository.findApplicationById(id, currentUser.instituteId);
    if (!app) {
      throw new AppError("Application not found", 404);
    }
    assertBranchRecordAccess(currentUser, app.branchId);
    return AdmissionsRepository.findApplicationActivities(id);
  },

  async createApplicationActivity(
    id: string,
    currentUser: AuthUser,
    dto: CreateApplicationActivityDTO
  ) {
    const app = await AdmissionsRepository.findApplicationById(id, currentUser.instituteId);
    if (!app) {
      throw new AppError("Application not found", 404);
    }
    assertBranchRecordAccess(currentUser, app.branchId);

    const activity = await AdmissionsRepository.createApplicationActivity(
      id,
      currentUser.userId || currentUser.id,
      {
        type: dto.type || "NOTE_ADDED",
        title: dto.title || "Note added",
        description: dto.description,
        metadata: dto.metadata,
      }
    );

    // Keep latest note as optional summary on Application.notes
    if ((dto.type || "NOTE_ADDED") === "NOTE_ADDED") {
      await AdmissionsRepository.updateApplication(id, currentUser.instituteId, {
        notes: dto.description,
      });
    }

    return activity;
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
    assertBranchRecordAccess(currentUser, adm.branchId, "Admission not found");

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
      if (normalizedDto.batchId && admission.studentId) {
        void studentAllocationService
          .triggerBatchAssignedNotification(admission.studentId, normalizedDto.batchId)
          .catch((err) =>
            logger.error(
              { err, admissionId: admission.id },
              "[admissions] Failed to trigger batch assigned notification"
            )
          );
      }
      if (dto.sendCredentials && admission.studentId && options?.currentUser) {
        sendStudentCredentialsWhatsAppService(admission.studentId, options.currentUser).catch(
          (err) =>
            logger.error(
              { err, admissionId: admission.id },
              "[admissions] Failed to send credentials"
            )
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

    const confirmingDraft =
      existing.status === "PENDING" &&
      Boolean(dto.status) &&
      dto.status !== "PENDING";

    if (confirmingDraft && existing.studentId) {
      const linkedLead =
        (await prisma.lead.findFirst({
          where: {
            instituteId: currentUser.instituteId,
            convertedAdmissionId: id,
          },
        })) ??
        (await prisma.lead.findFirst({
          where: {
            instituteId: currentUser.instituteId,
            status: "ACTIVE",
            convertedStudentId: existing.studentId,
          },
        }));

      if (linkedLead) {
        await prisma.$transaction(async (tx) => {
          await markLeadConverted(tx, {
            leadId: linkedLead.id,
            studentId: existing.studentId!,
            admissionId: id,
            courseId: dto.courseId || existing.courseId,
            currentUserId: currentUser.userId || currentUser.id,
            studentCode: existing.student?.studentCode ?? undefined,
            admissionNo: existing.admissionNo || id,
            courseName: existing.course?.name,
          });
        });
      }
    }

    const nextBatchId =
      dto.batchId !== undefined && dto.batchId.trim() !== "" ? dto.batchId.trim() : null;
    if (nextBatchId && existing.studentId && nextBatchId !== existing.batchId) {
      setImmediate(() => {
        void studentAllocationService
          .triggerBatchAssignedNotification(existing.studentId!, nextBatchId)
          .catch((err) =>
            logger.error(
              { err, admissionId: id },
              "[admissions] Failed to trigger batch assigned notification on update"
            )
          );
      });
    }

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

import { prisma } from "../../../config/database";
import { AppError } from "../../../middlewares/error.middleware";
import { triggerNotification } from "../../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../../whatsapp/whatsapp.constants";
import { logger } from "../../../config/logger";
import type { AuthUser } from "../../auth/auth.types";
import type { ConvertLeadDTO } from "../lead.types";
import { SequenceService } from "../../masters/sequence.service";
import { provisionAdmission } from "../../admissions/admission-provision.service";

export const LeadConversionService = {
  async convertLead(
    leadId: string,
    currentUser: AuthUser,
    dto: ConvertLeadDTO
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        branch: true,
        course: true,
      },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    if (lead.status === "CONVERTED" || lead.convertedStudentId) {
      throw new AppError("Lead has already been converted to a student", 400);
    }

    if (lead.status === "LOST" || lead.stage === "LOST") {
      throw new AppError("Cannot convert a lost lead", 400);
    }

    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    const courseId = dto.courseId || lead.courseId;
    if (!courseId) {
      throw new AppError("Course is required to convert this lead", 400);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new AppError("Selected course does not exist", 400);
    }

    const branchId = lead.branchId;
    const admissionNo = await SequenceService.getNextNumber(lead.instituteId, "ADMISSION", {
      branchCode: lead.branch?.code,
    });

    const hasFees = dto.totalFee && dto.totalFee > 0;
    const admissionStatus = hasFees ? "CONFIRMED" : "PROVISIONAL";

    const admission = await provisionAdmission({
      instituteId: lead.instituteId,
      branchId,
      admissionNo,
      dto: {
        studentName: lead.name,
        email: lead.email ?? undefined,
        phone: lead.phoneNumber,
        courseId,
        batchId: dto.batchId,
        leadId: lead.id,
        feePlan: dto.feePlan ?? "INSTALLMENT",
        status: admissionStatus,
        notes: dto.notes ?? `Converted from lead ${lead.id}`,
        totalFee: dto.totalFee,
        amountPaid: dto.amountPaid,
        paymentMethod: dto.paymentMethod,
        transactionRef: dto.transactionRef,
        installments: dto.installments,
      },
      currentUserId: currentUser.userId,
    });

    const student = admission.studentId
      ? await prisma.student.findUnique({ where: { id: admission.studentId } })
      : null;

    const updatedLead = await prisma.lead.findUnique({ where: { id: leadId } });

    const conversionResult = {
      lead: updatedLead,
      student,
      admission,
    };

    try {
      const idempotencyKey = buildIdempotencyKey.ADMISSION_CREATED(
        conversionResult.student?.id ?? admission.id,
        admission.id
      );

      await triggerNotification({
        instituteId: lead.instituteId,
        studentId: conversionResult.student?.id,
        event: NotificationEvent.ADMISSION_CREATED,
        idempotencyKey,
        templateParams: {
          student_name: lead.name,
          course_name: course.name,
          admission_no: admission.admissionNo ?? admissionNo,
        },
        metadata: {
          admissionId: admission.id,
          phone: lead.phoneNumber,
          leadId: lead.id,
        },
      });
    } catch (err) {
      logger.error({ err, leadId }, "[LeadConversionService] Failed to trigger admission notification");
    }

    return conversionResult;
  },
};

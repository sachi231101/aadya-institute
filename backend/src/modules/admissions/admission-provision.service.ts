import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { batchIncludesCourse } from "../../utils/batch-course.util";
import { hashPassword } from "../../utils/password";
import { SequenceService } from "../masters/sequence.service";
import { LeadActivityService } from "../leads/services/lead-activity.service";
import type { CreateAdmissionDTO } from "./admissions.types";
import {
  buildLegacyTuitionLines,
  provisionStudentFeesInTransaction,
  resolveTuitionFeeHead,
} from "../fees/fee-provision.service";
import type { FeeProvisionLine } from "../fees/fee.types";
import { toMoneyNumber } from "../fees/fee-money.util";

export interface ProvisionAdmissionInput extends CreateAdmissionDTO {
  leadId?: string;
  sourceMasterId?: string;
  statusMasterId?: string;
  paymentModeMasterId?: string;
  areaMasterId?: string;
  concessionHeadMasterId?: string;
}

export interface ProvisionAdmissionContext {
  instituteId: string;
  branchId: string;
  admissionNo: string;
  dto: ProvisionAdmissionInput;
  currentUserId?: string;
}

type TxClient = Prisma.TransactionClient;

const admissionInclude = {
  course: { select: { id: true, name: true, code: true } },
  batch: { select: { id: true, name: true, code: true } },
  student: { select: { id: true, studentCode: true } },
  payments: true,
  pendingFees: true,
} as const;

const extractNote = (notes: string | undefined, pattern: RegExp) => {
  if (!notes) return null;
  const match = notes.match(pattern);
  return match ? match[1].trim() : null;
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

async function ensureStudentUser(
  tx: TxClient,
  params: {
    instituteId: string;
    branchId: string;
    dto: ProvisionAdmissionInput;
    branchCode?: string;
  }
): Promise<string> {
  const { instituteId, branchId, dto } = params;
  const defaultStudentPasswordHash = await hashPassword("Aadya@123");

  if (dto.studentId) {
    const existingStudent = await tx.student.findUnique({
      where: { id: dto.studentId },
      include: { user: true },
    });
    if (!existingStudent) {
      throw new AppError("Student not found", 404);
    }
    if (existingStudent.instituteId !== instituteId) {
      throw new AppError("Student not found", 404);
    }

    await tx.student.update({
      where: { id: dto.studentId },
      data: {
        status: "ACTIVE",
        branchId,
        ...(dto.areaMasterId ? { areaMasterId: dto.areaMasterId } : {}),
      },
    });

    if (existingStudent.userId) {
      await tx.user.update({
        where: { id: existingStudent.userId },
        data: {
          name: dto.studentName,
          status: "ACTIVE",
          branchId,
        },
      });
      const studentRole = await tx.role.findUnique({ where: { name: "STUDENT" } });
      if (studentRole) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: existingStudent.userId, roleId: studentRole.id } },
          update: {},
          create: { userId: existingStudent.userId, roleId: studentRole.id },
        });
      }
    }

    return existingStudent.id;
  }

  const normalizedPhone = normalizePhone(dto.phone || "");
  if (normalizedPhone.length >= 10) {
    const usersWithPhone = await tx.user.findMany({
      where: { instituteId, phone: { not: null } },
      select: { phone: true },
    });
    const phoneTaken = usersWithPhone.some(
      (u) => normalizePhone(u.phone || "") === normalizedPhone
    );
    if (phoneTaken) {
      throw new AppError(
        "This phone number is already registered. Please enter a different phone number.",
        409
      );
    }
  }

  const extractedQual = extractNote(
    dto.notes,
    /(?:Highest Qualification|Qualification):\s*([^|\n]+)/i
  );
  const extractedDob = extractNote(dto.notes, /DOB:\s*([^|\n]+)/i);

  const studentCode = await SequenceService.getNextNumber(instituteId, "STUDENT", {
    branchCode: params.branchCode,
  });

  const newUser = await tx.user.create({
    data: {
      instituteId,
      branchId,
      name: dto.studentName,
      email: dto.email && dto.email.trim() !== "" ? dto.email.trim() : null,
      phone: normalizedPhone.length >= 10 ? normalizedPhone : dto.phone?.trim() || null,
      passwordHash: defaultStudentPasswordHash,
      status: "ACTIVE",
    },
  });

  const studentRole = await tx.role.findUnique({ where: { name: "STUDENT" } });
  if (studentRole) {
    await tx.userRole.create({
      data: { userId: newUser.id, roleId: studentRole.id },
    });
  }

  let parsedDob: Date | undefined;
  if (extractedDob) {
    const parsed = new Date(extractedDob);
    if (!Number.isNaN(parsed.getTime())) parsedDob = parsed;
  }

  const newStudent = await tx.student.create({
    data: {
      userId: newUser.id,
      instituteId,
      branchId,
      studentCode,
      qualification: extractedQual || null,
      dateOfBirth: parsedDob,
      status: "ACTIVE",
      ...(dto.areaMasterId ? { areaMasterId: dto.areaMasterId } : {}),
    },
  });

  return newStudent.id;
}

async function markLeadConverted(
  tx: TxClient,
  params: {
    leadId: string;
    studentId: string;
    admissionId: string;
    courseId: string;
    currentUserId?: string;
    studentCode?: string;
    admissionNo: string;
    courseName?: string;
  }
) {
  const lead = await tx.lead.findUnique({ where: { id: params.leadId } });
  if (!lead) return;

  if (lead.status === "CONVERTED" && lead.convertedAdmissionId) {
    return;
  }

  await tx.lead.update({
    where: { id: params.leadId },
    data: {
      stage: "CONVERTED",
      status: "CONVERTED",
      convertedAt: new Date(),
      convertedStudentId: params.studentId,
      convertedAdmissionId: params.admissionId,
      courseId: params.courseId,
    },
  });

  if (params.currentUserId) {
    await LeadActivityService.logActivity(
      params.leadId,
      "CONVERTED",
      `Lead converted to Student (${params.studentCode ?? params.studentId}) and Admission (${params.admissionNo})`,
      {
        userId: params.currentUserId,
        description: `Converted for course ${params.courseName ?? params.courseId}. Admission No: ${params.admissionNo}`,
        metadata: {
          studentId: params.studentId,
          studentCode: params.studentCode,
          admissionId: params.admissionId,
          admissionNo: params.admissionNo,
          courseId: params.courseId,
        },
        tx,
      }
    );
  }
}

export async function provisionAdmissionInTransaction(
  tx: TxClient,
  context: ProvisionAdmissionContext
) {
  const { instituteId, branchId, admissionNo, dto, currentUserId } = context;

  const branch = await tx.branch.findFirst({
    where: { id: branchId, instituteId },
    select: { code: true },
  });
  if (!branch) {
    throw new AppError("Selected branch not found for this institute", 400);
  }

  const course = await tx.course.findFirst({
    where: { id: dto.courseId, instituteId },
  });
  if (!course) {
    throw new AppError("Selected course does not exist", 400);
  }

  let validBatchId = dto.batchId && dto.batchId.trim() !== "" ? dto.batchId : null;
  if (validBatchId) {
    const batchExists = await tx.batch.findFirst({
      where: { id: validBatchId, instituteId },
      include: { batchCourses: { select: { courseId: true } } },
    });
    if (!batchExists) {
      validBatchId = null;
    } else if (!batchIncludesCourse(batchExists, dto.courseId)) {
      throw new AppError("Selected batch does not include the admission course as a subject", 400);
    }
  }

  const finalStudentId = await ensureStudentUser(tx, {
    instituteId,
    branchId,
    dto,
    branchCode: branch.code,
  });

  const parsedAdmissionDate = dto.admissionDate ? new Date(dto.admissionDate) : undefined;
  const admissionStatus = dto.status || "CONFIRMED";

  const VALID_PAYMENT_METHODS = new Set(["UPI", "NET_BANKING", "CARD", "CASH", "CHEQUE"]);
  let paymentMethod = dto.paymentMethod || "UPI";
  let paymentModeMasterId: string | null = null;

  if (dto.paymentModeMasterId) {
    const paymentModeMaster = await tx.masterRecord.findFirst({
      where: {
        id: dto.paymentModeMasterId,
        instituteId,
        entityType: "paymentmodes",
        status: "ACTIVE",
      },
      select: { id: true, code: true, name: true },
    });
    if (paymentModeMaster) {
      paymentModeMasterId = paymentModeMaster.id;
      const masterCode = (paymentModeMaster.code || "").toUpperCase();
      if (VALID_PAYMENT_METHODS.has(masterCode)) {
        paymentMethod = masterCode as typeof paymentMethod;
      }
    }
  }

  // Scope PENDING reuse by course so multi-course / package admissions
  // create one row per course instead of overwriting a single draft.
  const existingPending =
    dto.applicationId || finalStudentId
      ? await tx.admission.findFirst({
          where: {
            instituteId,
            status: "PENDING",
            courseId: course.id,
            OR: [
              ...(dto.applicationId ? [{ applicationId: dto.applicationId }] : []),
              ...(finalStudentId ? [{ studentId: finalStudentId }] : []),
            ],
          },
        })
      : null;

  const admissionData = {
    branchId,
    admissionNo,
    studentId: finalStudentId,
    studentName: dto.studentName,
    email: dto.email || null,
    phone: dto.phone,
    courseId: course.id,
    batchId: validBatchId,
    applicationId: dto.applicationId || null,
    feePlan: dto.feePlan || "INSTALLMENT",
    status: admissionStatus,
    termsAcceptedAt: admissionStatus !== "PENDING" ? new Date() : null,
    termsAcceptance:
      admissionStatus !== "PENDING" && dto.termsAcceptance
        ? (dto.termsAcceptance as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    notes: dto.notes || null,
    ...(dto.statusMasterId ? { statusMasterId: dto.statusMasterId } : {}),
    ...(dto.concessionHeadMasterId ? { concessionHeadMasterId: dto.concessionHeadMasterId } : {}),
    ...(parsedAdmissionDate && !Number.isNaN(parsedAdmissionDate.getTime())
      ? { admissionDate: parsedAdmissionDate }
      : {}),
  };

  const admission = existingPending
    ? await tx.admission.update({
        where: { id: existingPending.id },
        data: admissionData,
        include: admissionInclude,
      })
    : await tx.admission.create({
        data: {
          instituteId,
          ...admissionData,
        },
        include: admissionInclude,
      });

  if (dto.applicationId) {
    await tx.application.updateMany({
      where: { id: dto.applicationId, instituteId },
      data: { status: "ADMITTED" },
    });
  }

  if (dto.leadId) {
    const student = await tx.student.findUnique({
      where: { id: finalStudentId },
      select: { studentCode: true },
    });
    await markLeadConverted(tx, {
      leadId: dto.leadId,
      studentId: finalStudentId,
      admissionId: admission.id,
      courseId: course.id,
      currentUserId,
      studentCode: student?.studentCode,
      admissionNo,
      courseName: course.name,
    });
  }

  if (validBatchId && finalStudentId) {
    await tx.batchEnrollment.upsert({
      where: {
        batchId_studentId: { batchId: validBatchId, studentId: finalStudentId },
      },
      update: {
        status: "ACTIVE",
        admissionId: admission.id,
      },
      create: {
        batchId: validBatchId,
        studentId: finalStudentId,
        admissionId: admission.id,
        status: "ACTIVE",
      },
    });
  }

  if ((dto.totalFee && dto.totalFee > 0) || (dto.feeLines && dto.feeLines.length > 0) || dto.feePlanTemplateId) {
    if (!finalStudentId) {
      // nothing
    } else {
      const courseName = admission.course?.name || course.name;
      const amountPaid = Number(dto.amountPaid || 0);
      let lines: FeeProvisionLine[] = [];

      if (dto.feePlanTemplateId) {
        const plan = await tx.feePlanTemplate.findFirst({
          where: { id: dto.feePlanTemplateId, instituteId, status: "ACTIVE" },
        });
        if (plan?.installments && Array.isArray(plan.installments)) {
          for (const raw of plan.installments as Array<Record<string, unknown>>) {
            if (raw.feeHeadMasterId && raw.amount) {
              lines.push({
                feeHeadMasterId: String(raw.feeHeadMasterId),
                feeHeadCode: raw.feeHeadCode ? String(raw.feeHeadCode) : undefined,
                amount: Number(raw.amount),
                installments: Array.isArray(raw.installments)
                  ? (raw.installments as Array<{ installmentNo: number; amount: number; dueDays?: number }>).map(
                      (i) => ({
                        installmentNo: i.installmentNo,
                        amount: Number(i.amount),
                        dueDays: i.dueDays,
                      })
                    )
                  : undefined,
              });
            }
          }
        }
        if (lines.length === 0 && toMoneyNumber(plan?.totalAmount) > 0) {
          const tuition = await resolveTuitionFeeHead(tx, instituteId);
          lines = buildLegacyTuitionLines({
            tuitionHeadId: tuition.id,
            tuitionHeadName: tuition.name,
            totalFee: toMoneyNumber(plan!.totalAmount),
            feePlan: plan!.planType,
          });
        }
      }

      if (lines.length === 0 && dto.feeLines && dto.feeLines.length > 0) {
        lines = dto.feeLines.map((l) => ({
          feeHeadMasterId: l.feeHeadMasterId,
          amount: Number(l.amount),
          installments: l.installments?.map((i) => ({
            installmentNo: i.installmentNo,
            amount: Number(i.amount),
            dueDate: i.dueDate,
          })),
        }));
      }

      if (lines.length === 0 && dto.totalFee && dto.totalFee > 0) {
        const tuition = await resolveTuitionFeeHead(tx, instituteId);
        lines = buildLegacyTuitionLines({
          tuitionHeadId: tuition.id,
          tuitionHeadName: tuition.name,
          totalFee: Number(dto.totalFee),
          feePlan: dto.feePlan,
          installments: dto.installments,
        });
      }

      // Concession percentage from master (applied to tuition inside provision)
      let concessionAmount = 0;
      if (dto.concessionHeadMasterId) {
        const concession = await tx.masterRecord.findFirst({
          where: { id: dto.concessionHeadMasterId, instituteId, entityType: "concessionheads" },
        });
        const pct = Number(
          concession?.data && typeof concession.data === "object"
            ? (concession.data as { percentage?: string }).percentage
            : undefined
        );
        const gross = lines.reduce((s, l) => s + Number(l.amount), 0);
        if (Number.isFinite(pct) && pct > 0 && pct < 100) {
          concessionAmount = Math.round(((gross * pct) / 100) * 100) / 100;
        }
      }

      if (lines.length > 0) {
        await provisionStudentFeesInTransaction(tx, {
          instituteId,
          branchId,
          studentId: finalStudentId,
          admissionId: admission.id,
          studentName: dto.studentName,
          admissionNo,
          phone: dto.phone || "",
          courseName,
          lines,
          downPayment: amountPaid,
          paymentMethod,
          paymentModeMasterId,
          transactionRef: dto.transactionRef || null,
          concessionAmount,
          recordedById: currentUserId || null,
        });
      }
    }
  }

  return admission;
}

export async function provisionAdmission(context: ProvisionAdmissionContext) {
  return prisma.$transaction((tx) => provisionAdmissionInTransaction(tx, context));
}

import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { batchIncludesCourse } from "../../utils/batch-course.util";
import { hashPassword } from "../../utils/password";
import { SequenceService } from "../masters/sequence.service";
import { LeadActivityService } from "../leads/services/lead-activity.service";
import type { CreateAdmissionDTO } from "./admissions.types";

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
  const paymentMethod = dto.paymentMethod || "UPI";
  const admissionStatus = dto.status || "CONFIRMED";

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

  if (dto.totalFee && dto.totalFee > 0 && finalStudentId) {
    const totalFee = Number(dto.totalFee);
    const amountPaid = Number(dto.amountPaid || 0);
    const courseName = admission.course?.name || course.name;

    if (amountPaid > 0) {
      const receiptNo = await SequenceService.getNextNumber(instituteId, "RECEIPT", {
        branchCode: branch.code,
      }).catch(() => `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`);

      await tx.payment.create({
        data: {
          receiptNo,
          instituteId,
          branchId,
          studentId: finalStudentId,
          admissionId: admission.id,
          studentName: dto.studentName,
          admissionNo,
          courseName,
          amount: amountPaid,
          method: paymentMethod,
          status: "SUCCESS",
          transactionRef: dto.transactionRef || null,
          notes: "Initial admission payment",
        },
      });
    }

    const plannedInstallments = (dto.installments || []).filter(
      (item) => Number(item.amount) > 0
    );
    if (plannedInstallments.length > 0) {
      await tx.pendingFee.createMany({
        data: plannedInstallments.map((item) => {
          const dueDate = new Date(item.dueDate);
          return {
            instituteId,
            branchId,
            studentId: finalStudentId,
            admissionId: admission.id,
            studentName: dto.studentName,
            admissionNo,
            phone: dto.phone,
            courseName,
            totalFee,
            amountPaid: 0,
            dueAmount: Number(item.amount),
            dueDate: Number.isNaN(dueDate.getTime()) ? new Date() : dueDate,
            installmentNo: item.installmentNo,
            status: "DUE_SOON" as const,
          };
        }),
      });
    } else {
      const balance = Math.max(0, totalFee - amountPaid);
      if (balance > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        await tx.pendingFee.create({
          data: {
            instituteId,
            branchId,
            studentId: finalStudentId,
            admissionId: admission.id,
            studentName: dto.studentName,
            admissionNo,
            phone: dto.phone,
            courseName,
            totalFee,
            amountPaid,
            dueAmount: balance,
            dueDate,
            installmentNo: 1,
            status: "DUE_SOON",
          },
        });
      }
    }
  }

  return admission;
}

export async function provisionAdmission(context: ProvisionAdmissionContext) {
  return prisma.$transaction((tx) => provisionAdmissionInTransaction(tx, context));
}

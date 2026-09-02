import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { logger } from "../../config/logger";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";

const triggerBatchAssignedNotification = async (studentId: string, batchId: string) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { course: true },
    });

    if (!student || !batch) return;

    const idempotencyKey = buildIdempotencyKey.BATCH_ASSIGNED(studentId, batchId);

    await triggerNotification({
      instituteId: student.instituteId,
      studentId: student.id,
      event: NotificationEvent.BATCH_ASSIGNED,
      idempotencyKey,
      templateParams: {
        student_name: student.user?.name ?? "Student",
        batch_name: batch.name,
        course_name: batch.course?.name ?? "Course",
      },
      metadata: {
        batchId,
        courseId: batch.courseId,
      },
    });
  } catch (err) {
    logger.error({ err, studentId, batchId }, "[student-allocation] Failed to trigger batch assigned notification");
  }
};

const resolveAdmission = async (
  studentId: string,
  instituteId: string,
  admissionId?: string
) => {
  if (admissionId) {
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, instituteId, studentId },
    });
    if (!admission) {
      throw new AppError("Admission not found for this student", 404);
    }
    return admission;
  }

  return prisma.admission.findFirst({
    where: {
      studentId,
      instituteId,
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
  });
};

const validateBatchForEnrollment = async (batchId: string, instituteId: string) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId },
    include: {
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  if (batch.status === "CANCELLED" || batch.status === "COMPLETED") {
    throw new AppError(`Cannot enroll students in a ${batch.status.toLowerCase()} batch`, 400);
  }

  if (batch.capacity && batch._count.enrollments >= batch.capacity) {
    throw new AppError("Batch has reached its capacity", 400);
  }

  return batch;
};

export const assignStudentToBatch = async (
  batchId: string,
  studentId: string,
  instituteId: string,
  admissionId?: string
) => {
  const batch = await validateBatchForEnrollment(batchId, instituteId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
  });
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const admission = await resolveAdmission(studentId, instituteId, admissionId);
  if (admission && admission.courseId !== batch.courseId) {
    throw new AppError("Student's admission course does not match the batch course", 400);
  }

  const resolvedAdmissionId = admission?.id ?? null;

  const enrollment = await prisma.$transaction(async (tx) => {
    const activeEnrollments = await tx.batchEnrollment.findMany({
      where: { studentId, status: "ACTIVE", batchId: { not: batchId } },
    });

    for (const existing of activeEnrollments) {
      await tx.batchEnrollment.updateMany({
        where: { id: existing.id },
        data: { status: "INACTIVE", leftAt: new Date() },
      });

      const priorAdmission = await tx.admission.findFirst({
        where: { studentId, batchId: existing.batchId },
      });
      if (priorAdmission) {
        await tx.admission.update({
          where: { id: priorAdmission.id },
          data: { batchId: null },
        });
      }
    }

    const result = await tx.batchEnrollment.upsert({
      where: { batchId_studentId: { batchId, studentId } },
      update: {
        status: "ACTIVE",
        joinedAt: new Date(),
        leftAt: null,
        admissionId: resolvedAdmissionId,
      },
      create: {
        batchId,
        studentId,
        admissionId: resolvedAdmissionId,
        status: "ACTIVE",
      },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (resolvedAdmissionId) {
      await tx.admission.update({
        where: { id: resolvedAdmissionId },
        data: { batchId },
      });
    }

    return result;
  });

  setImmediate(() => {
    triggerBatchAssignedNotification(studentId, batchId);
  });

  return enrollment;
};

export const removeStudentFromBatch = async (
  batchId: string,
  studentId: string,
  instituteId: string
) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId },
  });
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
  });
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.batchEnrollment.updateMany({
      where: { batchId, studentId, status: "ACTIVE" },
      data: { status: "INACTIVE", leftAt: new Date() },
    });

    if (result.count === 0) {
      throw new AppError("Student is not actively enrolled in this batch", 404);
    }

    const admission = await tx.admission.findFirst({
      where: { studentId, batchId, instituteId },
    });
    if (admission) {
      await tx.admission.update({
        where: { id: admission.id },
        data: { batchId: null },
      });
    }

    return result;
  });
};

export const transferStudent = async (
  studentId: string,
  fromBatchId: string,
  toBatchId: string,
  instituteId: string,
  admissionId?: string
) => {
  if (fromBatchId === toBatchId) {
    throw new AppError("Source and target batch must be different", 400);
  }

  const toBatch = await validateBatchForEnrollment(toBatchId, instituteId);

  const fromBatch = await prisma.batch.findFirst({
    where: { id: fromBatchId, instituteId },
  });
  if (!fromBatch) {
    throw new AppError("Source batch not found", 404);
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
  });
  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const activeEnrollment = await prisma.batchEnrollment.findFirst({
    where: { studentId, batchId: fromBatchId, status: "ACTIVE" },
  });
  if (!activeEnrollment) {
    throw new AppError("Student is not actively enrolled in the source batch", 404);
  }

  const admission = await resolveAdmission(studentId, instituteId, admissionId);
  if (admission && admission.courseId !== toBatch.courseId) {
    throw new AppError("Student's admission course does not match the target batch course", 400);
  }

  const resolvedAdmissionId = admission?.id ?? activeEnrollment.admissionId ?? null;

  const enrollment = await prisma.$transaction(async (tx) => {
    await tx.batchEnrollment.updateMany({
      where: { batchId: fromBatchId, studentId, status: "ACTIVE" },
      data: { status: "INACTIVE", leftAt: new Date() },
    });

    const fromAdmission = await tx.admission.findFirst({
      where: { studentId, batchId: fromBatchId, instituteId },
    });
    if (fromAdmission) {
      await tx.admission.update({
        where: { id: fromAdmission.id },
        data: { batchId: null },
      });
    }

    const result = await tx.batchEnrollment.upsert({
      where: { batchId_studentId: { batchId: toBatchId, studentId } },
      update: {
        status: "ACTIVE",
        joinedAt: new Date(),
        leftAt: null,
        admissionId: resolvedAdmissionId,
      },
      create: {
        batchId: toBatchId,
        studentId,
        admissionId: resolvedAdmissionId,
        status: "ACTIVE",
      },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (resolvedAdmissionId) {
      await tx.admission.update({
        where: { id: resolvedAdmissionId },
        data: { batchId: toBatchId },
      });
    }

    return result;
  });

  setImmediate(() => {
    triggerBatchAssignedNotification(studentId, toBatchId);
  });

  return enrollment;
};

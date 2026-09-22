import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { logger } from "../../config/logger";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import { batchIncludesCourse, getBatchCourseIds } from "../../utils/batch-course.util";
import { assertBranchRecordAccess } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";

const formatBatchDate = (value: Date | string | null | undefined): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const triggerBatchAssignedNotification = async (studentId: string, batchId: string) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        course: true,
        batchCourses: { include: { course: true } },
      },
    });

    if (!student || !batch) return;

    const courseNames =
      batch.batchCourses && batch.batchCourses.length > 0
        ? batch.batchCourses.map((bc) => bc.course?.name).filter(Boolean).join(", ")
        : batch.course?.name ?? "Course";

    const batchDate = formatBatchDate(batch.startDate);
    const idempotencyKey = buildIdempotencyKey.STUDENT_BATCH_ASSIGNED(studentId, batchId);

    await triggerNotification({
      instituteId: student.instituteId,
      studentId: student.id,
      event: NotificationEvent.STUDENT_BATCH_ASSIGNED,
      idempotencyKey,
      templateParams: {
        student_name: student.user?.name ?? "Student",
        batch_name: batch.name,
        course_name: courseNames,
        batch_date: batchDate,
        batch_start_date: batchDate,
        time_slot: batch.timeSlot ?? "",
      },
      metadata: {
        batchId,
        courseId: batch.courseId,
        courseIds: getBatchCourseIds(batch),
      },
    });
  } catch (err) {
    logger.error({ err, studentId, batchId }, "[student-allocation] Failed to trigger batch assigned notification");
  }
};

const resolveAdmissionForBatch = async (
  studentId: string,
  instituteId: string,
  batch: { courseId: string; batchCourses?: Array<{ courseId: string }> },
  admissionId?: string
) => {
  if (admissionId) {
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, instituteId, studentId },
    });
    if (!admission) {
      throw new AppError("Admission not found for this student", 404);
    }
    if (!batchIncludesCourse(batch, admission.courseId)) {
      throw new AppError(
        "This admission course is not offered in the selected batch",
        400
      );
    }
    return admission;
  }

  const admissions = await prisma.admission.findMany({
    where: {
      studentId,
      instituteId,
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const matching = admissions.find((admission) => batchIncludesCourse(batch, admission.courseId));
  if (admissions.length > 0 && !matching) {
    throw new AppError(
      "None of this student's courses are offered in the selected batch",
      400
    );
  }

  return matching ?? null;
};

const validateBatchForEnrollment = async (batchId: string, instituteId: string) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId },
    include: {
      batchCourses: { select: { courseId: true } },
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
  currentUser: AuthUser,
  admissionId?: string
) => {
  const batch = await validateBatchForEnrollment(batchId, instituteId);
  assertBranchRecordAccess(currentUser, batch.branchId, "Batch not found");

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
  });
  if (!student) {
    throw new AppError("Student not found", 404);
  }
  assertBranchRecordAccess(currentUser, student.branchId, "Student not found");

  // Validate admission/course fit before the already-enrolled guard so callers
  // get a precise error when linking a wrong admissionId.
  const admission = await resolveAdmissionForBatch(studentId, instituteId, batch, admissionId);

  const alreadyInThisBatch = await prisma.batchEnrollment.findFirst({
    where: { batchId, studentId, status: "ACTIVE" },
    select: { id: true },
  });
  if (alreadyInThisBatch) {
    throw new AppError("This student is already assigned to this batch", 400);
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

export type BulkEnrollFailure = { studentId: string; message: string };

export type BulkEnrollResult = {
  assigned: number;
  skipped: number;
  failures: BulkEnrollFailure[];
};

const BULK_ENROLL_MAX = 200;

/**
 * Assign many students to a batch. Reuses assignStudentToBatch per id.
 * Capacity is checked for new enrollments only; already-in-batch students are skipped.
 */
export const bulkAssignStudentsToBatch = async (
  batchId: string,
  studentIds: string[],
  instituteId: string,
  currentUser: AuthUser
): Promise<BulkEnrollResult> => {
  const uniqueIds = Array.from(
    new Set(studentIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))
  );

  if (uniqueIds.length === 0) {
    throw new AppError("At least one student ID is required", 400);
  }

  if (uniqueIds.length > BULK_ENROLL_MAX) {
    throw new AppError(`Maximum ${BULK_ENROLL_MAX} students per bulk request`, 400);
  }

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId },
    include: {
      batchCourses: { select: { courseId: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  assertBranchRecordAccess(currentUser, batch.branchId, "Batch not found");

  if (batch.status === "CANCELLED" || batch.status === "COMPLETED") {
    throw new AppError(`Cannot enroll students in a ${batch.status.toLowerCase()} batch`, 400);
  }

  const remainingSeats =
    batch.capacity != null
      ? Math.max(0, batch.capacity - batch._count.enrollments)
      : Number.POSITIVE_INFINITY;

  const existingInBatch = await prisma.batchEnrollment.findMany({
    where: {
      batchId,
      studentId: { in: uniqueIds },
      status: "ACTIVE",
    },
    select: { studentId: true },
  });
  const alreadyEnrolled = new Set(existingInBatch.map((e) => e.studentId));
  const toAssignCount = uniqueIds.length - alreadyEnrolled.size;

  if (batch.capacity != null && toAssignCount > remainingSeats) {
    throw new AppError(
      `Batch has only ${remainingSeats} seat${remainingSeats === 1 ? "" : "s"} available; ` +
        `cannot assign ${toAssignCount} additional student${toAssignCount === 1 ? "" : "s"}`,
      400
    );
  }

  let assigned = 0;
  let skipped = 0;
  const failures: BulkEnrollFailure[] = [];

  for (const studentId of uniqueIds) {
    if (alreadyEnrolled.has(studentId)) {
      skipped += 1;
      failures.push({
        studentId,
        message: "This student is already assigned to this batch",
      });
      continue;
    }

    try {
      await assignStudentToBatch(batchId, studentId, instituteId, currentUser);
      assigned += 1;
    } catch (err) {
      const message =
        err instanceof AppError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to enroll student";
      failures.push({ studentId, message });
    }
  }

  return { assigned, skipped, failures };
};

export const removeStudentFromBatch = async (
  batchId: string,
  studentId: string,
  instituteId: string,
  currentUser: AuthUser
) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId },
  });
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  assertBranchRecordAccess(currentUser, batch.branchId, "Batch not found");

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
  });
  if (!student) {
    throw new AppError("Student not found", 404);
  }
  assertBranchRecordAccess(currentUser, student.branchId, "Student not found");

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
  currentUser: AuthUser,
  admissionId?: string
) => {
  if (fromBatchId === toBatchId) {
    throw new AppError("Source and target batch must be different", 400);
  }

  const toBatch = await validateBatchForEnrollment(toBatchId, instituteId);
  assertBranchRecordAccess(currentUser, toBatch.branchId, "Batch not found");

  const fromBatch = await prisma.batch.findFirst({
    where: { id: fromBatchId, instituteId },
  });
  if (!fromBatch) {
    throw new AppError("Source batch not found", 404);
  }
  assertBranchRecordAccess(currentUser, fromBatch.branchId, "Source batch not found");

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
  });
  if (!student) {
    throw new AppError("Student not found", 404);
  }
  assertBranchRecordAccess(currentUser, student.branchId, "Student not found");

  const activeEnrollment = await prisma.batchEnrollment.findFirst({
    where: { studentId, batchId: fromBatchId, status: "ACTIVE" },
  });
  if (!activeEnrollment) {
    throw new AppError("Student is not actively enrolled in the source batch", 404);
  }

  const admission = await resolveAdmissionForBatch(studentId, instituteId, toBatch, admissionId);

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
    triggerBatchTransferredNotification(studentId, fromBatchId, toBatchId);
  });

  return enrollment;
};

const triggerBatchTransferredNotification = async (
  studentId: string,
  fromBatchId: string,
  toBatchId: string
) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    const [fromBatch, toBatch] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: fromBatchId },
        include: { course: true },
      }),
      prisma.batch.findUnique({
        where: { id: toBatchId },
        include: { course: true },
      }),
    ]);
    if (!student || !toBatch) return;
    const batchDate = formatBatchDate(toBatch.startDate);
    await triggerNotification({
      instituteId: student.instituteId,
      studentId: student.id,
      event: NotificationEvent.BATCH_TRANSFERRED,
      idempotencyKey: buildIdempotencyKey.BATCH_TRANSFERRED(
        studentId,
        fromBatchId,
        toBatchId
      ),
      templateParams: {
        student_name: student.user?.name ?? "Student",
        from_batch_name: fromBatch?.name ?? "Previous batch",
        to_batch_name: toBatch.name,
        course_name: toBatch.course?.name ?? "Course",
        batch_date: batchDate,
      },
      metadata: { fromBatchId, toBatchId },
    });
  } catch (err) {
    logger.error(
      { err, studentId, fromBatchId, toBatchId },
      "[student-allocation] Failed to trigger batch transferred notification"
    );
  }
};

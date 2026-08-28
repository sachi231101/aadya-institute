import { prisma } from "../../config/database";

export interface FindAllStudentsParams {
  instituteId: string;
  branchId?: string;
  search?: string;
  status?: string;
  /** When set, only students enrolled in batches assigned to this faculty */
  facultyId?: string;
  skip: number;
  take: number;
}

// Shared include for consistent Student + User data
const studentInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  admissions: {
    include: {
      course: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true, code: true, timeSlot: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
  batchEnrollments: {
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          timeSlot: true,
          course: { select: { id: true, name: true, code: true } },
          faculty: { select: { id: true, user: { select: { name: true } } } },
        },
      },
    },
    where: { status: "ACTIVE" as any },
    take: 1,
  },
  payments: {
    select: {
      id: true,
      amount: true,
      status: true,
      receiptNo: true,
      date: true,
      method: true,
      transactionRef: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  pendingFees: {
    select: {
      id: true,
      totalFee: true,
      amountPaid: true,
      dueAmount: true,
      dueDate: true,
      installmentNo: true,
      status: true,
    },
    orderBy: { installmentNo: "asc" as const },
  },
  studentAttendances: {
    select: {
      id: true,
      status: true,
      markedAt: true,
    },
    orderBy: { markedAt: "desc" as const },
    take: 20,
  },
};

/**
 * Build a reusable where-clause for list + count queries.
 */
const buildWhereClause = (params: Omit<FindAllStudentsParams, "skip" | "take">) => {
  const where: Record<string, unknown> = {
    instituteId: params.instituteId,
  };

  if (params.branchId) {
    where.branchId = params.branchId;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.facultyId) {
    where.batchEnrollments = {
      some: {
        status: "ACTIVE",
        batch: { facultyId: params.facultyId },
      },
    };
  }

  if (params.search) {
    where.OR = [
      { studentCode: { contains: params.search, mode: "insensitive" } },
      { qualification: { contains: params.search, mode: "insensitive" } },
      { user: { name: { contains: params.search, mode: "insensitive" } } },
      { user: { email: { contains: params.search, mode: "insensitive" } } },
      { user: { phone: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  return where;
};

export const findAllStudents = (params: FindAllStudentsParams) => {
  const where = buildWhereClause(params);
  return prisma.student.findMany({
    where,
    include: studentInclude,
    orderBy: { createdAt: "desc" },
    skip: params.skip,
    take: params.take,
  });
};

export const countStudents = (params: Omit<FindAllStudentsParams, "skip" | "take">) => {
  const where = buildWhereClause(params);
  return prisma.student.count({ where });
};

export const findStudentById = (id: string) =>
  prisma.student.findUnique({
    where: { id },
    include: {
      ...studentInclude,
      admissions: {
        include: {
          course: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, name: true, code: true, timeSlot: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      batchEnrollments: {
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              timeSlot: true,
              schedulePattern: true,
              course: { select: { id: true, name: true, code: true } },
              faculty: { select: { id: true, user: { select: { name: true } } } },
            },
          },
        },
        where: { status: "ACTIVE" },
      },
    },
  });

export const findStudentByCode = (instituteId: string, studentCode: string) =>
  prisma.student.findUnique({
    where: {
      instituteId_studentCode: { instituteId, studentCode },
    },
  });

/**
 * Creates User + Student + assigns STUDENT role, and optionally creates Admission, BatchEnrollment, and Fee records in a single transaction.
 */
export const createStudentWithUser = async (data: {
  instituteId: string;
  branchId: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  studentCode: string;
  dateOfBirth?: string;
  qualification?: string;
  qualificationMasterId?: string;
  areaMasterId?: string;
  courseId?: string;
  batchId?: string;
  totalFee?: number;
  feePlan?: "FULL_PAYMENT" | "INSTALLMENT";
  downPayment?: number;
}) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the User record
    const user = await tx.user.create({
      data: {
        instituteId: data.instituteId,
        branchId: data.branchId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        passwordHash: data.passwordHash,
      },
    });

    // 2. Create the Student record linked to the User
    const student = await tx.student.create({
      data: {
        userId: user.id,
        instituteId: data.instituteId,
        branchId: data.branchId,
        studentCode: data.studentCode,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        qualification: data.qualification || null,
        qualificationMasterId: data.qualificationMasterId || null,
        areaMasterId: data.areaMasterId || null,
      },
    });

    // 3. Find the STUDENT role and assign it
    const studentRole = await tx.role.findUnique({
      where: { name: "STUDENT" },
    });

    if (studentRole) {
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: studentRole.id,
        },
      });
    }

    // 4. Optional Admission & Course Mapping
    let admissionId: string | null = null;
    let courseName = "General Course";
    const admissionNo = `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    if (data.courseId) {
      const course = await tx.course.findUnique({ where: { id: data.courseId } });
      if (course) courseName = course.name;

      const admission = await tx.admission.create({
        data: {
          instituteId: data.instituteId,
          branchId: data.branchId,
          studentId: student.id,
          courseId: data.courseId,
          batchId: data.batchId || null,
          studentName: data.name,
          email: data.email || null,
          phone: data.phone || null,
          feePlan: data.feePlan || "INSTALLMENT",
          status: "CONFIRMED",
          admissionNo,
        },
      });
      admissionId = admission.id;
    }

    // 5. Optional Batch Enrollment
    if (data.batchId) {
      await tx.batchEnrollment.create({
        data: {
          batchId: data.batchId,
          studentId: student.id,
          admissionId: admissionId,
          status: "ACTIVE",
        },
      });
    }

    // 6. Optional Fee & Payment Setup
    if (data.totalFee && data.totalFee > 0) {
      const totalFee = Number(data.totalFee);
      const downPay = Number(data.downPayment || 0);

      // Record initial payment receipt if down payment was made
      if (downPay > 0) {
        const receiptNo = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        await tx.payment.create({
          data: {
            receiptNo,
            instituteId: data.instituteId,
            branchId: data.branchId,
            studentId: student.id,
            admissionId: admissionId,
            studentName: data.name,
            admissionNo,
            courseName,
            amount: downPay,
            method: "UPI",
            status: "SUCCESS",
            notes: "Initial registration payment",
          },
        });
      }

      const balance = Math.max(0, totalFee - downPay);
      if (balance > 0) {
        if (data.feePlan === "FULL_PAYMENT") {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          await tx.pendingFee.create({
            data: {
              instituteId: data.instituteId,
              branchId: data.branchId,
              studentId: student.id,
              admissionId: admissionId,
              studentName: data.name,
              admissionNo,
              phone: data.phone || "9876543210",
              courseName,
              totalFee,
              amountPaid: downPay,
              dueAmount: balance,
              dueDate,
              installmentNo: 1,
              status: "DUE_SOON",
            },
          });
        } else {
          // 2 installments
          const part1 = Math.floor(balance / 2);
          const part2 = balance - part1;
          const d1 = new Date();
          d1.setDate(d1.getDate() + 30);
          const d2 = new Date();
          d2.setDate(d2.getDate() + 60);

          await tx.pendingFee.createMany({
            data: [
              {
                instituteId: data.instituteId,
                branchId: data.branchId,
                studentId: student.id,
                admissionId: admissionId,
                studentName: data.name,
                admissionNo,
                phone: data.phone || "9876543210",
                courseName,
                totalFee,
                amountPaid: downPay,
                dueAmount: part1,
                dueDate: d1,
                installmentNo: 1,
                status: "DUE_SOON",
              },
              {
                instituteId: data.instituteId,
                branchId: data.branchId,
                studentId: student.id,
                admissionId: admissionId,
                studentName: data.name,
                admissionNo,
                phone: data.phone || "9876543210",
                courseName,
                totalFee,
                amountPaid: 0,
                dueAmount: part2,
                dueDate: d2,
                installmentNo: 2,
                status: "DUE_SOON",
              },
            ],
          });
        }
      }
    }

    // Return the full student record
    return tx.student.findUniqueOrThrow({
      where: { id: student.id },
      include: studentInclude,
    });
  });
};

/**
 * Updates Student fields and optionally the related User fields (name, email, phone).
 */
export const updateStudent = async (
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    qualification?: string;
    qualificationMasterId?: string;
    areaMasterId?: string;
    status?: "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED";
    branchId?: string;
  }
) => {
  const { name, email, phone, dateOfBirth, qualification, qualificationMasterId, areaMasterId, status } = data;

  const hasUserUpdates = name !== undefined || email !== undefined || phone !== undefined || branchId !== undefined;

  // Build student-only update data
  const studentUpdate: Record<string, unknown> = {};
  if (qualification !== undefined) studentUpdate.qualification = qualification;
  if (qualificationMasterId !== undefined) studentUpdate.qualificationMasterId = qualificationMasterId;
  if (areaMasterId !== undefined) studentUpdate.areaMasterId = areaMasterId;
  if (status !== undefined) studentUpdate.status = status;
  if (dateOfBirth !== undefined) studentUpdate.dateOfBirth = new Date(dateOfBirth);
  if (branchId !== undefined) studentUpdate.branchId = branchId;

  if (hasUserUpdates) {
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing || !existing.userId) return null;

    return prisma.$transaction(async (tx) => {
      const userUpdate: Record<string, unknown> = {};
      if (name !== undefined) userUpdate.name = name;
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone;
      if (branchId !== undefined) userUpdate.branchId = branchId;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: existing.userId! },
          data: userUpdate,
        });
      }

      return tx.student.update({
        where: { id },
        data: studentUpdate,
        include: studentInclude,
      });
    });
  }

  return prisma.student.update({
    where: { id },
    data: studentUpdate,
    include: studentInclude,
  });
};

/**
 * Soft-delete: sets Student status to CANCELLED and User status to INACTIVE.
 */
export const softDeleteStudent = async (id: string) => {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    if (existing.userId) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { status: "INACTIVE" },
      });
    }

    return tx.student.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: studentInclude,
    });
  });
};

// ─── Student Performance ─────────────────────────────────────────────────

/**
 * Get attendance records for a student, ordered by session date.
 */
export const findStudentAttendanceRecords = (studentId: string) =>
  prisma.studentAttendance.findMany({
    where: { studentId },
    include: {
      classSession: {
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          startTime: true,
          endTime: true,
          batchId: true,
          batchModuleId: true,
          batchModule: {
            select: {
              courseModule: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { classSession: { scheduledDate: "desc" } },
  });

/**
 * Get assignment submissions for a student.
 */
export const findStudentAssignmentSubmissions = (studentId: string) =>
  prisma.assignmentSubmission.findMany({
    where: { studentId },
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          dueDate: true,
          batchId: true,
        },
      },
    },
    orderBy: { assignment: { createdAt: "desc" } },
  });

/**
 * Get batch enrollments with course info for a student.
 */
export const findStudentEnrollments = (studentId: string) =>
  prisma.batchEnrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          courseId: true,
          course: { select: { id: true, name: true, code: true } },
          batchModules: {
            select: {
              id: true,
              status: true,
              courseModule: { select: { id: true, name: true, sequence: true } },
            },
            orderBy: { sequence: "asc" },
          },
          _count: { select: { classSessions: true } },
        },
      },
    },
  });

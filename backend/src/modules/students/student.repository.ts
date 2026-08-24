import { prisma } from "../../config/database";

export interface FindAllStudentsParams {
  instituteId: string;
  branchId?: string;
  search?: string;
  status?: string;
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
          course: { select: { id: true, name: true, code: true } },
          faculty: { select: { id: true, user: { select: { name: true } } } },
        },
      },
    },
    where: { status: "ACTIVE" },
    take: 1,
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
              course: { select: { id: true, name: true, code: true } },
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
 * Creates User + Student + assigns STUDENT role in a single transaction.
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
}) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the User record
    const user = await tx.user.create({
      data: {
        instituteId: data.instituteId,
        branchId: data.branchId,
        name: data.name,
        email: data.email,
        phone: data.phone,
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
        qualification: data.qualification,
      },
      include: studentInclude,
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

    return student;
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
    status?: "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED";
  }
) => {
  const { name, email, phone, dateOfBirth, qualification, status } = data;

  const hasUserUpdates = name !== undefined || email !== undefined || phone !== undefined;

  // Build student-only update data
  const studentUpdate: Record<string, unknown> = {};
  if (qualification !== undefined) studentUpdate.qualification = qualification;
  if (status !== undefined) studentUpdate.status = status;
  if (dateOfBirth !== undefined) studentUpdate.dateOfBirth = new Date(dateOfBirth);

  if (hasUserUpdates) {
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing || !existing.userId) return null;

    return prisma.$transaction(async (tx) => {
      const userUpdate: Record<string, unknown> = {};
      if (name !== undefined) userUpdate.name = name;
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone;

      await tx.user.update({
        where: { id: existing.userId! },
        data: userUpdate,
      });

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
          scheduledDate: true,
          startTime: true,
          endTime: true,
          batchId: true,
          batchModuleId: true,
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

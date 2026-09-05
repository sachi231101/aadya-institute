import { prisma } from "../../config/database";
import { formatBatchSubjectNames } from "../../utils/batch-course.util";

export interface FindAllFacultyParams {
  instituteId: string;
  branchId?: string;
  search?: string;
  status?: string;
  skip: number;
  take: number;
}

// Shared include for consistent Faculty + User data
const facultyInclude = {
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
  designationMaster: {
    select: { id: true, name: true, code: true },
  },
  qualificationMaster: {
    select: { id: true, name: true, code: true },
  },
  _count: {
    select: { batches: true },
  },
};

/**
 * Build a reusable where-clause for list + count queries.
 */
const buildWhereClause = (params: Omit<FindAllFacultyParams, "skip" | "take">) => {
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
      { employeeCode: { contains: params.search, mode: "insensitive" } },
      { specialization: { contains: params.search, mode: "insensitive" } },
      { user: { name: { contains: params.search, mode: "insensitive" } } },
      { user: { email: { contains: params.search, mode: "insensitive" } } },
      { user: { phone: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  return where;
};

export const findAllFaculty = (params: FindAllFacultyParams) => {
  const where = buildWhereClause(params);
  return prisma.faculty.findMany({
    where,
    include: facultyInclude,
    orderBy: { createdAt: "desc" },
    skip: params.skip,
    take: params.take,
  });
};

export const countFaculty = (params: Omit<FindAllFacultyParams, "skip" | "take">) => {
  const where = buildWhereClause(params);
  return prisma.faculty.count({ where });
};

export const findFacultyById = (id: string) =>
  prisma.faculty.findUnique({
    where: { id },
    include: facultyInclude,
  });

export const findFacultyByEmployeeCode = (instituteId: string, employeeCode: string) =>
  prisma.faculty.findUnique({
    where: {
      instituteId_employeeCode: { instituteId, employeeCode },
    },
  });

/**
 * Creates User + Faculty + assigns FACULTY role in a single transaction.
 */
export const createFacultyWithUser = async (data: {
  instituteId: string;
  branchId: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  employeeCode: string;
  specialization?: string;
  designation?: string;
  designationMasterId?: string;
  qualification?: string;
  qualificationMasterId?: string;
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

    // 2. Create the Faculty record linked to the User
    const faculty = await tx.faculty.create({
      data: {
        userId: user.id,
        instituteId: data.instituteId,
        branchId: data.branchId,
        employeeCode: data.employeeCode,
        specialization: data.specialization,
        designation: data.designation || null,
        designationMasterId: data.designationMasterId || null,
        qualification: data.qualification || null,
        qualificationMasterId: data.qualificationMasterId || null,
      },
      include: facultyInclude,
    });

    // 4. Ensure FACULTY role exists and assign it
    let facultyRole = await tx.role.findUnique({
      where: { name: "FACULTY" },
    });

    if (!facultyRole) {
      facultyRole = await tx.role.create({
        data: {
          name: "FACULTY",
          description: "FACULTY role for Aadya platform",
        },
      });
    }

    await tx.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: facultyRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: facultyRole.id,
      },
    });

    return faculty;
  });
};

/**
 * Updates Faculty fields and optionally the related User fields (name, email, phone).
 */
export const updateFaculty = async (
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    specialization?: string;
    designation?: string | null;
    designationMasterId?: string | null;
    qualification?: string | null;
    qualificationMasterId?: string | null;
    status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  }
) => {
  const {
    name,
    email,
    phone,
    specialization,
    designation,
    designationMasterId,
    qualification,
    qualificationMasterId,
    status,
  } = data;

  const hasUserUpdates = name !== undefined || email !== undefined || phone !== undefined;

  const facultyUpdate: Record<string, unknown> = {};
  if (specialization !== undefined) facultyUpdate.specialization = specialization;
  if (designation !== undefined) facultyUpdate.designation = designation;
  if (designationMasterId !== undefined) facultyUpdate.designationMasterId = designationMasterId;
  if (qualification !== undefined) facultyUpdate.qualification = qualification;
  if (qualificationMasterId !== undefined) facultyUpdate.qualificationMasterId = qualificationMasterId;
  if (status !== undefined) facultyUpdate.status = status;

  if (hasUserUpdates) {
    const existing = await prisma.faculty.findUnique({ where: { id } });
    if (!existing) return null;

    return prisma.$transaction(async (tx) => {
      const userUpdate: Record<string, unknown> = {};
      if (name !== undefined) userUpdate.name = name;
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone;

      await tx.user.update({
        where: { id: existing.userId },
        data: userUpdate,
      });

      return tx.faculty.update({
        where: { id },
        data: facultyUpdate,
        include: facultyInclude,
      });
    });
  }

  return prisma.faculty.update({
    where: { id },
    data: facultyUpdate,
    include: facultyInclude,
  });
};

/**
 * Soft-delete: sets Faculty status to INACTIVE and User status to INACTIVE.
 */
export const softDeleteFaculty = async (id: string) => {
  const existing = await prisma.faculty.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: { status: "INACTIVE" },
    });

    return tx.faculty.update({
      where: { id },
      data: { status: "INACTIVE" },
      include: facultyInclude,
    });
  });
};

// ─── Faculty Course Assignments (via Batch model) ───────────────────────

export interface FindFacultyCoursesParams {
  instituteId: string;
  branchId?: string;
  facultyId?: string;
  skip: number;
  take: number;
}

/**
 * Fetch per-subject faculty assignments via BatchCourse (multi-course batches).
 */
export const findFacultyCourses = async (params: FindFacultyCoursesParams) => {
  const batchWhere: Record<string, unknown> = { instituteId: params.instituteId };
  if (params.branchId) batchWhere.branchId = params.branchId;

  const where: Record<string, unknown> = {
    status: "ACTIVE",
    facultyId: { not: null },
    batch: batchWhere,
  };
  if (params.facultyId) where.facultyId = params.facultyId;

  const rows = await prisma.batchCourse.findMany({
    where,
    include: {
      course: { select: { id: true, name: true, code: true } },
      faculty: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      batch: {
        include: {
          branch: { select: { id: true, name: true, code: true } },
          schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } },
          classSessions: { select: { sessionStatus: true } },
          _count: { select: { enrollments: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: params.skip,
    take: params.take,
  });

  return rows
    .filter((bc) => bc.facultyId && bc.faculty)
    .map((bc) => ({
      id: bc.id,
      instituteId: bc.batch.instituteId,
      branchId: bc.batch.branchId,
      courseId: bc.courseId,
      facultyId: bc.facultyId!,
      name: bc.batch.name,
      code: bc.batch.code,
      startDate: bc.batch.startDate,
      expectedEndDate: bc.batch.expectedEndDate,
      status: bc.batch.status,
      createdAt: bc.batch.createdAt,
      course: bc.course,
      faculty: bc.faculty,
      branch: bc.batch.branch,
      schedules: bc.batch.schedules,
      classSessions: bc.batch.classSessions,
      _count: bc.batch._count,
    }));
};

export const countFacultyCourses = (params: Omit<FindFacultyCoursesParams, "skip" | "take">) => {
  const batchWhere: Record<string, unknown> = { instituteId: params.instituteId };
  if (params.branchId) batchWhere.branchId = params.branchId;

  const where: Record<string, unknown> = {
    status: "ACTIVE",
    facultyId: { not: null },
    batch: batchWhere,
  };
  if (params.facultyId) where.facultyId = params.facultyId;

  return prisma.batchCourse.count({ where });
};

/**
 * Assign a faculty member to a batch (update batch.facultyId).
 */
/**
 * Assign faculty to a subject on the batch (BatchCourse).
 * Sets Batch.facultyId only when unset or when assigning the primary subject.
 */
export const assignFacultyToBatchSubject = async (
  batchId: string,
  facultyId: string,
  courseId: string
) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.batch.findUnique({
      where: { id: batchId },
      select: { courseId: true, facultyId: true },
    });
    if (!current) {
      throw new Error("Batch not found");
    }

    const shouldSetCoordinator =
      !current.facultyId || current.courseId === courseId;

    const batch = await tx.batch.update({
      where: { id: batchId },
      data: shouldSetCoordinator ? { facultyId } : {},
      include: {
        course: { select: { id: true, name: true, code: true } },
        faculty: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { enrollments: true } },
      },
    });

    const existing = await tx.batchCourse.findUnique({
      where: { batchId_courseId: { batchId, courseId } },
    });

    if (existing) {
      await tx.batchCourse.update({
        where: { id: existing.id },
        data: { facultyId, status: "ACTIVE" },
      });
    } else {
      await tx.batchCourse.create({
        data: {
          batchId,
          courseId,
          facultyId,
          sequence: 1,
          status: "ACTIVE",
        },
      });
    }

    return batch;
  });
};

/** @deprecated Prefer assignFacultyToBatchSubject — kept for callers that only set coordinator. */
export const assignFacultyToBatch = (batchId: string, facultyId: string) =>
  prisma.batch.update({
    where: { id: batchId },
    data: { facultyId },
    include: {
      course: { select: { id: true, name: true, code: true } },
      faculty: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { enrollments: true } },
    },
  });

export const findBatchForAssign = (batchId: string, instituteId: string) =>
  prisma.batch.findFirst({
    where: { id: batchId, instituteId },
    select: {
      id: true,
      branchId: true,
      instituteId: true,
      facultyId: true,
      courseId: true,
      batchCourses: { select: { courseId: true, facultyId: true } },
    },
  });

// ─── Faculty Attendance ─────────────────────────────────────────────────

export interface FindFacultyAttendanceParams {
  instituteId: string;
  branchId?: string;
  facultyId?: string;
  date?: string; // ISO date string, e.g. "2026-08-12"
  skip: number;
  take: number;
}

/**
 * Fetch FacultyAttendance records joined with faculty user info and class session info.
 * Anchored to class sessions so all scheduled sessions appear with current attendance status.
 */
export const findFacultyAttendance = async (params: FindFacultyAttendanceParams) => {
  const where: Record<string, unknown> = {
    batch: { instituteId: params.instituteId },
    status: "ACTIVE",
  };

  if (params.branchId) {
    where.branchId = params.branchId;
  }
  if (params.facultyId) {
    where.facultyId = params.facultyId;
  }
  if (params.date) {
    const dayStart = new Date(params.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(params.date);
    dayEnd.setHours(23, 59, 59, 999);
    where.scheduledDate = { gte: dayStart, lte: dayEnd };
  }

  const sessions = await prisma.classSession.findMany({
    where,
    include: {
      faculty: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      },
      facultyAttendance: true,
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          course: { select: { id: true, name: true, code: true } },
        },
      },
      classroomMaster: { select: { id: true, name: true } },
    },
    orderBy: [{ scheduledDate: "desc" }, { startTime: "asc" }],
    skip: params.skip,
    take: params.take,
  });

  return sessions.map((cs) => {
    const fa = cs.facultyAttendance?.[0];
    const loginAt = fa?.loginAt
      ? fa.loginAt.toISOString()
      : cs.actualStartTime
      ? cs.actualStartTime.toISOString()
      : null;
    const logoutAt = fa?.logoutAt
      ? fa.logoutAt.toISOString()
      : cs.actualEndTime
      ? cs.actualEndTime.toISOString()
      : null;

    return {
      id: fa?.id || `cs-att-${cs.id}`,
      facultyId: cs.facultyId,
      classSessionId: cs.id,
      loginAt,
      logoutAt,
      faculty: {
        id: cs.faculty?.id || cs.facultyId,
        employeeCode: cs.faculty?.employeeCode || "FA",
        user: cs.faculty?.user || { id: "", name: "Faculty Member", email: null },
        branch: cs.faculty?.branch || null,
      },
      classSession: {
        id: cs.id,
        scheduledDate: cs.scheduledDate.toISOString(),
        startTime: cs.startTime,
        endTime: cs.endTime,
        roomNo: cs.roomNo || cs.classroomMaster?.name || null,
        sessionStatus: cs.sessionStatus,
        batch: {
          id: cs.batch.id,
          name: cs.batch.name,
          code: cs.batch.code,
          course: cs.batch.course,
        },
      },
    };
  });
};

export const countFacultyAttendance = (params: Omit<FindFacultyAttendanceParams, "skip" | "take">) => {
  const where: Record<string, unknown> = {
    batch: { instituteId: params.instituteId },
    status: "ACTIVE",
  };
  if (params.branchId) {
    where.branchId = params.branchId;
  }
  if (params.facultyId) {
    where.facultyId = params.facultyId;
  }
  if (params.date) {
    const dayStart = new Date(params.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(params.date);
    dayEnd.setHours(23, 59, 59, 999);
    where.scheduledDate = { gte: dayStart, lte: dayEnd };
  }

  return prisma.classSession.count({ where });
};

/**
 * Create a FacultyAttendance record (upsert by faculty+classSession uniqueness).
 */
export const upsertFacultyAttendance = (data: {
  facultyId: string;
  classSessionId: string;
  loginAt?: Date;
  logoutAt?: Date;
}) =>
  prisma.facultyAttendance.upsert({
    where: {
      facultyId_classSessionId: {
        facultyId: data.facultyId,
        classSessionId: data.classSessionId,
      },
    },
    create: {
      facultyId: data.facultyId,
      classSessionId: data.classSessionId,
      loginAt: data.loginAt,
      logoutAt: data.logoutAt,
    },
    update: {
      loginAt: data.loginAt,
      logoutAt: data.logoutAt,
    },
    include: {
      faculty: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      classSession: {
        select: {
          id: true,
          scheduledDate: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

// ─── Faculty Dashboard / My Students ────────────────────────────────────

const sessionCardSelect = {
  id: true,
  title: true,
  scheduledDate: true,
  startTime: true,
  endTime: true,
  roomNo: true,
  mode: true,
  meetingUrl: true,
  sessionStatus: true,
  status: true,
  actualEndTime: true,
  batch: {
    select: {
      id: true,
      name: true,
      code: true,
      courseId: true,
      course: { select: { id: true, name: true, code: true } },
      batchCourses: {
        orderBy: { sequence: "asc" as const },
        include: { course: { select: { id: true, name: true, code: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  },
  batchModule: {
    select: {
      courseModule: { select: { id: true, name: true } },
    },
  },
  classroomMaster: { select: { id: true, name: true } },
} as const;

export const findFacultySessionsInRange = (facultyId: string, from: Date, to: Date) =>
  prisma.classSession.findMany({
    where: {
      facultyId,
      scheduledDate: { gte: from, lte: to },
      status: "ACTIVE",
    },
    select: sessionCardSelect,
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
  });

export const countFacultySessionsByStatus = async (facultyId: string, weekStart: Date, weekEnd: Date) => {
  const [live, completedThisWeek] = await Promise.all([
    prisma.classSession.count({
      where: {
        facultyId,
        sessionStatus: "LIVE",
        status: "ACTIVE",
      },
    }),
    prisma.classSession.count({
      where: {
        facultyId,
        status: "ACTIVE",
        scheduledDate: { gte: weekStart, lte: weekEnd },
        OR: [
          { sessionStatus: "COMPLETED" },
          { actualEndTime: { not: null } },
        ],
      },
    }),
  ]);
  return { live, completedThisWeek };
};

export const findFacultyBatchesSummary = (facultyId: string) =>
  prisma.batch.findMany({
    where: {
      status: { in: ["ACTIVE", "UPCOMING"] },
      OR: [{ facultyId }, { batchCourses: { some: { facultyId } } }],
    },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      courseId: true,
      course: { select: { id: true, name: true, code: true } },
      batchCourses: {
        orderBy: { sequence: "asc" as const },
        include: { course: { select: { id: true, name: true, code: true } } },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: "asc" },
  });

export const findRecentFacultyFeedback = (facultyId: string, take = 5) =>
  prisma.feedback.findMany({
    where: { facultyId },
    select: {
      id: true,
      rating: true,
      comment: true,
      submittedAt: true,
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { name: true } },
        },
      },
      classSession: {
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take,
  });

export const getFacultyAvgRating = async (facultyId: string) => {
  const agg = await prisma.feedback.aggregate({
    where: { facultyId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    avgRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    totalRatings: agg._count.rating,
  };
};

export const findPendingGrading = async (facultyId: string, take = 10) => {
  const assignments = await prisma.assignment.findMany({
    where: {
      facultyId,
      status: "ACTIVE",
      submissions: {
        some: {
          submittedAt: { not: null },
          marks: null,
          submissionStatus: { in: ["SUBMITTED", "LATE"] },
        },
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      batchId: true,
      batch: { select: { id: true, name: true, code: true } },
      classSession: {
        select: {
          batch: { select: { id: true, name: true, code: true } },
        },
      },
      submissions: {
        where: {
          submittedAt: { not: null },
          marks: null,
          submissionStatus: { in: ["SUBMITTED", "LATE"] },
        },
        select: { id: true },
      },
    },
    orderBy: { dueDate: "asc" },
    take,
  });

  return assignments.map((a) => ({
    id: a.id,
    title: a.title,
    dueDate: a.dueDate,
    batchId: a.batchId,
    batchName: a.batch?.name ?? a.classSession?.batch?.name ?? null,
    batchCode: a.batch?.code ?? a.classSession?.batch?.code ?? null,
    pendingCount: a.submissions.length,
  }));
};

export const countPendingSubmissions = (facultyId: string) =>
  prisma.assignmentSubmission.count({
    where: {
      submittedAt: { not: null },
      marks: null,
      submissionStatus: { in: ["SUBMITTED", "LATE"] },
      assignment: { facultyId, status: "ACTIVE" },
    },
  });

export const findMyStudents = async (params: {
  facultyId: string;
  instituteId: string;
  batchId?: string;
  search?: string;
  skip: number;
  take: number;
}) => {
  const enrollmentWhere = {
    status: "ACTIVE" as const,
    batch: {
      instituteId: params.instituteId,
      OR: [
        { facultyId: params.facultyId },
        { batchCourses: { some: { facultyId: params.facultyId } } },
      ],
      ...(params.batchId ? { id: params.batchId } : {}),
    },
    ...(params.search
      ? {
          student: {
            OR: [
              { studentCode: { contains: params.search, mode: "insensitive" as const } },
              { user: { name: { contains: params.search, mode: "insensitive" as const } } },
              { user: { email: { contains: params.search, mode: "insensitive" as const } } },
              { user: { phone: { contains: params.search, mode: "insensitive" as const } } },
            ],
          },
        }
      : {}),
  };

  const enrollments = await prisma.batchEnrollment.findMany({
    where: enrollmentWhere,
    select: {
      studentId: true,
      joinedAt: true,
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          courseId: true,
          course: { select: { id: true, name: true, code: true } },
          batchCourses: {
            orderBy: { sequence: "asc" },
            include: { course: { select: { id: true, name: true, code: true } } },
          },
        },
      },
      student: {
        select: {
          id: true,
          studentCode: true,
          status: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  // Deduplicate students (may be in multiple faculty batches)
  const byStudent = new Map<
    string,
    {
      id: string;
      studentCode: string;
      status: string;
      user: { id: string; name: string; email: string | null; phone: string | null } | null;
      branch: { id: string; name: string; code: string } | null;
      batches: { id: string; name: string; code: string; courseName: string | null }[];
    }
  >();

  for (const e of enrollments) {
    const existing = byStudent.get(e.studentId);
    const subjectsLabel = formatBatchSubjectNames(e.batch);
    const batchInfo = {
      id: e.batch.id,
      name: e.batch.name,
      code: e.batch.code,
      courseName:
        subjectsLabel !== "N/A" ? subjectsLabel : e.batch.course?.name ?? null,
    };
    if (existing) {
      if (!existing.batches.some((b) => b.id === batchInfo.id)) {
        existing.batches.push(batchInfo);
      }
    } else {
      byStudent.set(e.studentId, {
        id: e.student.id,
        studentCode: e.student.studentCode,
        status: e.student.status,
        user: e.student.user,
        branch: e.student.branch,
        batches: [batchInfo],
      });
    }
  }

  const all = Array.from(byStudent.values());
  const total = all.length;
  const data = all.slice(params.skip, params.skip + params.take);
  return { data, total };
};

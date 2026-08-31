import { prisma } from "../../config/database";

export interface FindRosterParams {
  date: string;
  instituteId: string;
  branchId?: string;
  skip: number;
  take: number;
}

export const findSessionWithBatchAndFaculty = async (classSessionId: string) => {
  return prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      batch: {
        include: {
          course: true,
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true, phone: true } } },
              },
            },
          },
        },
      },
      faculty: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
};

export const findAttendanceBySessionId = async (classSessionId: string) => {
  return prisma.studentAttendance.findMany({
    where: { classSessionId },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { student: { studentCode: "asc" } },
  });
};

export const findAttendanceById = async (attendanceId: string) => {
  return prisma.studentAttendance.findUnique({
    where: { id: attendanceId },
    include: {
      classSession: {
        include: {
          batch: true,
          faculty: true,
        },
      },
      student: {
        include: { user: true },
      },
    },
  });
};

export const bulkUpsertSessionAttendance = async (
  classSessionId: string,
  entries: { studentId: string; status: string; remarks?: string }[],
  markedBy?: string
) => {
  return prisma.$transaction(
    entries.map((entry) =>
      prisma.studentAttendance.upsert({
        where: {
          classSessionId_studentId: {
            classSessionId,
            studentId: entry.studentId,
          },
        },
        create: {
          classSessionId,
          studentId: entry.studentId,
          status: entry.status,
          markedBy,
          remarks: entry.remarks,
        },
        update: {
          status: entry.status,
          markedBy,
          remarks: entry.remarks,
          markedAt: new Date(),
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      })
    )
  );
};

export const updateAttendanceRecord = async (
  attendanceId: string,
  data: { status?: string; remarks?: string; markedBy?: string }
) => {
  return prisma.studentAttendance.update({
    where: { id: attendanceId },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      ...(data.markedBy ? { markedBy: data.markedBy } : {}),
      markedAt: new Date(),
    },
    include: {
      student: {
        include: { user: { select: { id: true, name: true } } },
      },
      classSession: true,
    },
  });
};

export const findStudentAttendanceHistory = async (params: {
  studentId: string;
  fromDate?: Date;
  toDate?: Date;
  skip: number;
  take: number;
}) => {
  const where: any = {
    studentId: params.studentId,
  };

  if (params.fromDate || params.toDate) {
    where.classSession = {
      scheduledDate: {
        ...(params.fromDate ? { gte: params.fromDate } : {}),
        ...(params.toDate ? { lte: params.toDate } : {}),
      },
    };
  }

  const [records, total] = await Promise.all([
    prisma.studentAttendance.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { classSession: { scheduledDate: "desc" } },
      include: {
        classSession: {
          include: {
            batch: { select: { id: true, name: true, code: true } },
            batchModule: { select: { id: true, courseModule: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.studentAttendance.count({ where }),
  ]);

  return { records, total };
};

export const calculateStudentAttendanceStats = async (studentId: string) => {
  const [presentCount, absentCount, leaveCount, totalCount] = await Promise.all([
    prisma.studentAttendance.count({ where: { studentId, status: "PRESENT" } }),
    prisma.studentAttendance.count({ where: { studentId, status: "ABSENT" } }),
    prisma.studentAttendance.count({ where: { studentId, status: "LEAVE" } }),
    prisma.studentAttendance.count({ where: { studentId } }),
  ]);

  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 10000) / 100 : 0;

  return {
    totalClasses: totalCount,
    presentCount,
    absentCount,
    leaveCount,
    attendancePercentage: percentage,
  };
};

/**
 * Helper: Query recent theory sessions for consecutive absence calculation.
 */
export const findRecentStudentAttendanceForBatch = async (studentId: string, batchId: string, limit = 10) => {
  return prisma.studentAttendance.findMany({
    where: {
      studentId,
      classSession: {
        batchId,
        sessionType: "THEORY",
      },
    },
    orderBy: { classSession: { scheduledDate: "desc" } },
    take: limit,
    select: { status: true, markedAt: true },
  });
};

// ─── Legacy functions maintained for backwards compatibility ──────────────────

export const ensureClassSessionForBranch = async (
  instituteId: string,
  targetBranchId: string,
  date: string
) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  let session = await prisma.classSession.findFirst({
    where: {
      branchId: targetBranchId,
      scheduledDate: { gte: dayStart, lte: dayEnd },
    },
  });

  if (session) return session;

  let batch = await prisma.batch.findFirst({
    where: { branchId: targetBranchId },
  });

  if (!batch) {
    let course = await prisma.course.findFirst({ where: { instituteId } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          instituteId,
          name: "General Academy Course",
          code: `GEN-${Date.now().toString().slice(-4)}`,
        },
      });
    }

    batch = await prisma.batch.create({
      data: {
        instituteId,
        branchId: targetBranchId,
        courseId: course.id,
        name: "General Batch",
        code: `BATCH-${targetBranchId.slice(-6)}-MAIN`,
        startDate: dayStart,
      },
    });
  }

  let faculty = await prisma.faculty.findFirst({
    where: { instituteId },
  });

  if (!faculty) {
    const facultyUser = await prisma.user.create({
      data: {
        instituteId,
        branchId: targetBranchId,
        name: "Default Faculty",
        email: `faculty-${Date.now()}@aadya.in`,
        passwordHash: "$2b$12$dummyhashforfaculty",
      },
    });

    faculty = await prisma.faculty.create({
      data: {
        userId: facultyUser.id,
        instituteId,
        branchId: targetBranchId,
        employeeCode: `FAC-${Date.now().toString().slice(-4)}`,
      },
    });
  }

  return prisma.classSession.create({
    data: {
      batchId: batch.id,
      facultyId: faculty.id,
      branchId: targetBranchId,
      scheduledDate: dayStart,
      startTime: "09:00",
      endTime: "17:00",
    },
  });
};

export const findDailyStudentRoster = async (params: FindRosterParams) => {
  const studentWhere: Record<string, unknown> = {
    instituteId: params.instituteId,
    status: { in: ["ACTIVE", "ON_LEAVE"] },
  };

  if (params.branchId) {
    studentWhere.branchId = params.branchId;
  }

  const [students, totalStudents] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.student.count({ where: studentWhere }),
  ]);

  if (students.length === 0) {
    return { roster: [], total: 0 };
  }

  const branchIds = Array.from(new Set(students.map((s) => s.branchId)));
  const sessionMap: Record<string, string> = {};

  for (const bId of branchIds) {
    const session = await ensureClassSessionForBranch(params.instituteId, bId, params.date);
    sessionMap[bId] = session.id;
  }

  const classSessionIds = Object.values(sessionMap);

  const attendanceRecords = await prisma.studentAttendance.findMany({
    where: {
      classSessionId: { in: classSessionIds },
      studentId: { in: students.map((s) => s.id) },
    },
  });

  const attendanceMap = new Map(
    attendanceRecords.map((r) => [`${r.classSessionId}_${r.studentId}`, r])
  );

  const roster = students.map((student) => {
    const classSessionId = sessionMap[student.branchId];
    const att = attendanceMap.get(`${classSessionId}_${student.id}`);
    return {
      studentId: student.id,
      studentCode: student.studentCode,
      name: student.user?.name || student.studentCode,
      email: student.user?.email || null,
      phone: student.user?.phone || null,
      branchId: student.branchId,
      branchName: student.branch?.name || "—",
      classSessionId,
      status: att?.status || null,
      markedAt: att?.markedAt || null,
      remarks: att?.remarks || null,
    };
  });

  return { roster, total: totalStudents };
};

export const upsertStudentAttendance = (data: {
  classSessionId: string;
  studentId: string;
  status: string;
  markedBy?: string;
  remarks?: string;
}) =>
  prisma.studentAttendance.upsert({
    where: {
      classSessionId_studentId: {
        classSessionId: data.classSessionId,
        studentId: data.studentId,
      },
    },
    create: {
      classSessionId: data.classSessionId,
      studentId: data.studentId,
      status: data.status,
      markedBy: data.markedBy,
      remarks: data.remarks,
    },
    update: {
      status: data.status,
      markedBy: data.markedBy,
      remarks: data.remarks,
      markedAt: new Date(),
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

export const bulkUpsertStudentAttendance = async (
  entries: { classSessionId: string; studentId: string; status: string; remarks?: string }[],
  markedBy?: string
) => {
  return prisma.$transaction(
    entries.map((entry) =>
      prisma.studentAttendance.upsert({
        where: {
          classSessionId_studentId: {
            classSessionId: entry.classSessionId,
            studentId: entry.studentId,
          },
        },
        create: {
          classSessionId: entry.classSessionId,
          studentId: entry.studentId,
          status: entry.status,
          markedBy,
          remarks: entry.remarks,
        },
        update: {
          status: entry.status,
          markedBy: entry.remarks !== undefined ? entry.remarks : undefined,
          remarks: entry.remarks,
          markedAt: new Date(),
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      })
    )
  );
};

export const findAttendanceBySession = (classSessionId: string) =>
  prisma.studentAttendance.findMany({
    where: { classSessionId },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

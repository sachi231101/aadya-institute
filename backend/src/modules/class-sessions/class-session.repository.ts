import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import { CreateClassSessionDto, UpdateClassSessionDto, QueryClassSessionsDto } from "./class-session.types";

/** Store calendar dates at UTC noon so list/Timetable keys never shift by timezone. */
const parseCalendarDate = (value: string): Date => {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
  }
  return new Date(value);
};

const sessionInclude = {
  batch: {
    include: {
      course: true,
      batchCourses: {
        orderBy: { sequence: "asc" },
        include: { course: { select: { id: true, name: true, code: true } } },
      },
      _count: {
        select: {
          enrollments: {
            where: { status: "ACTIVE" as const },
          },
        },
      },
    },
  },
  faculty: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  batchModule: {
    include: {
      courseModule: true,
    },
  },
} satisfies Prisma.ClassSessionInclude;

function buildWhere(
  instituteId: string,
  branchId?: string,
  filters?: QueryClassSessionsDto
): Prisma.ClassSessionWhereInput {
  const where: Prisma.ClassSessionWhereInput = {
    status: "ACTIVE",
    batch: {
      instituteId,
    },
  };

  if (branchId) {
    where.branchId = branchId;
  }

  if (filters?.batchIds && filters.batchIds.length > 0) {
    where.batchId = { in: filters.batchIds };
  } else if (filters?.batchId) {
    where.batchId = filters.batchId;
  }

  if (filters?.facultyId) {
    where.facultyId = filters.facultyId;
  }

  if (filters?.mode) {
    where.mode = filters.mode;
  }

  if (filters?.sessionType) {
    where.sessionType = filters.sessionType;
  }

  if (filters?.status) {
    where.sessionStatus = filters.status;
  }

  if (filters?.startDate && filters?.endDate) {
    where.scheduledDate = {
      gte: new Date(`${filters.startDate}T00:00:00.000Z`),
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    };
  } else if (filters?.startDate) {
    where.scheduledDate = {
      gte: new Date(`${filters.startDate}T00:00:00.000Z`),
    };
  } else if (filters?.endDate) {
    where.scheduledDate = {
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    };
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { roomNo: { contains: search, mode: "insensitive" } },
      { batch: { code: { contains: search, mode: "insensitive" } } },
      { batch: { name: { contains: search, mode: "insensitive" } } },
      { faculty: { user: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  return where;
}

function mapSessionRow(session: any) {
  const enrolledStudentsCount = session.batch?._count?.enrollments ?? 0;
  const { _count, ...batchRest } = session.batch || {};
  return {
    ...session,
    batch: batchRest,
    enrolledStudentsCount,
  };
}

export const classSessionRepository = {
  findMany: async (instituteId: string, branchId?: string, filters?: QueryClassSessionsDto) => {
    const where = buildWhere(instituteId, branchId, filters);
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(500, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [sessions, total] = await prisma.$transaction([
      prisma.classSession.findMany({
        where,
        include: sessionInclude,
        orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
        skip,
        take: limit,
      }),
      prisma.classSession.count({ where }),
    ]);

    return {
      data: sessions.map(mapSessionRow),
      total,
      page,
      limit,
    };
  },

  findManyUnpaginated: async (instituteId: string, branchId?: string, filters?: QueryClassSessionsDto) => {
    const where = buildWhere(instituteId, branchId, filters);
    const sessions = await prisma.classSession.findMany({
      where,
      include: sessionInclude,
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    });
    return sessions.map(mapSessionRow);
  },

  findById: async (id: string, instituteId: string) => {
    return prisma.classSession.findFirst({
      where: {
        id,
        batch: {
          instituteId,
        },
      },
      include: {
        batch: {
          include: {
            course: true,
          },
        },
        faculty: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        batchModule: {
          include: {
            courseModule: true,
          },
        },
        googleMeetSpace: true,
        recording: true,
        attendance: true,
      },
    });
  },

  create: async (instituteId: string, data: CreateClassSessionDto) => {
    const batch = await prisma.batch.findFirst({
      where: { id: data.batchId, instituteId },
      select: { branchId: true },
    });
    if (!batch) {
      throw new Error("Batch not found");
    }

    const branchId = data.branchId || batch.branchId;
    if (!branchId) {
      throw new Error("Branch is required");
    }

    return prisma.classSession.create({
      data: {
        batchId: data.batchId,
        batchModuleId: data.batchModuleId || undefined,
        batchCourseId: data.batchCourseId || undefined,
        facultyId: data.facultyId,
        branchId,
        title: data.title,
        scheduledDate: parseCalendarDate(data.scheduledDate),
        startTime: data.startTime,
        endTime: data.endTime,
        roomNo: data.roomNo || undefined,
        classroomMasterId: data.classroomMasterId || undefined,
        timeslotMasterId: data.timeslotMasterId || undefined,
        mode: data.mode || "OFFLINE",
        meetingUrl: data.meetingUrl || undefined,
        notes: data.notes || undefined,
        sessionType: data.sessionType || "THEORY",
        sessionStatus: "UPCOMING",
      },
      include: {
        batch: {
          include: {
            course: true,
            batchCourses: {
              orderBy: { sequence: "asc" },
              include: { course: { select: { id: true, name: true, code: true } } },
            },
          },
        },
        faculty: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  },

  findFacultyConflict: async (options: {
    instituteId: string;
    facultyId: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    excludeId?: string;
  }) => {
    const day = parseCalendarDate(options.scheduledDate);
    const dayStart = new Date(day);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setUTCHours(23, 59, 59, 999);

    return prisma.classSession.findFirst({
      where: {
        status: "ACTIVE",
        sessionStatus: { not: "CANCELLED" },
        facultyId: options.facultyId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
        startTime: options.startTime,
        endTime: options.endTime,
        batch: { instituteId: options.instituteId },
        ...(options.excludeId ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true, title: true, startTime: true, endTime: true },
    });
  },

  update: async (id: string, instituteId: string, data: UpdateClassSessionDto) => {
    const updateData: Prisma.ClassSessionUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.batchId !== undefined) updateData.batch = { connect: { id: data.batchId } };
    if (data.batchModuleId !== undefined) updateData.batchModule = data.batchModuleId ? { connect: { id: data.batchModuleId } } : { disconnect: true };
    if (data.batchCourseId !== undefined) {
      updateData.batchCourse = data.batchCourseId
        ? { connect: { id: data.batchCourseId } }
        : { disconnect: true };
    }
    if (data.facultyId !== undefined) updateData.faculty = { connect: { id: data.facultyId } };
    if (data.scheduledDate !== undefined) updateData.scheduledDate = parseCalendarDate(data.scheduledDate);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.roomNo !== undefined) updateData.roomNo = data.roomNo;
    if (data.classroomMasterId !== undefined) {
      updateData.classroomMaster = data.classroomMasterId
        ? { connect: { id: data.classroomMasterId } }
        : { disconnect: true };
    }
    if (data.timeslotMasterId !== undefined) {
      updateData.timeslotMaster = data.timeslotMasterId
        ? { connect: { id: data.timeslotMasterId } }
        : { disconnect: true };
    }
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.meetingUrl !== undefined) updateData.meetingUrl = data.meetingUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.sessionType !== undefined) updateData.sessionType = data.sessionType;
    if (data.status !== undefined) updateData.sessionStatus = data.status;

    // Scope update to institute via prior existence check + updateMany-style guard
    const owned = await prisma.classSession.findFirst({
      where: { id, batch: { instituteId } },
      select: { id: true },
    });
    if (!owned) {
      throw new Error("Class session not found");
    }

    return prisma.classSession.update({
      where: { id },
      data: updateData,
      include: {
        batch: {
          include: {
            course: true,
            batchCourses: {
              orderBy: { sequence: "asc" },
              include: { course: { select: { id: true, name: true, code: true } } },
            },
          },
        },
        faculty: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  },

  startLive: async (id: string, instituteId: string, meetingUrl?: string) => {
    return prisma.classSession.update({
      where: { id },
      data: {
        sessionStatus: "LIVE",
        mode: "ONLINE",
        ...(meetingUrl ? { meetingUrl } : {}),
        actualStartTime: new Date(),
      },
      include: {
        batch: {
          include: {
            course: true,
            enrollments: {
              where: { status: "ACTIVE" },
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        faculty: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  },

  endLive: async (id: string, instituteId: string) => {
    return prisma.classSession.update({
      where: { id },
      data: {
        sessionStatus: "COMPLETED",
        actualEndTime: new Date(),
      },
      include: {
        batch: {
          include: {
            course: true,
          },
        },
        faculty: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        recording: true,
      },
    });
  },

  findActiveLiveSessions: async (instituteId: string, branchId?: string, batchIds?: string[], facultyId?: string) => {
    const where: Prisma.ClassSessionWhereInput = {
      batch: {
        instituteId,
      },
      sessionStatus: { in: ["LIVE"] },
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (batchIds && batchIds.length > 0) {
      where.batchId = { in: batchIds };
    }

    if (facultyId) {
      where.facultyId = facultyId;
    }

    return prisma.classSession.findMany({
      where,
      include: {
        batch: {
          include: {
            course: true,
          },
        },
        faculty: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });
  },

  delete: async (id: string) => {
    return prisma.classSession.delete({
      where: { id },
    });
  },
};

import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import { CreateClassSessionDto, UpdateClassSessionDto, QueryClassSessionsDto } from "./class-session.types";

export const classSessionRepository = {
  findMany: async (instituteId: string, branchId?: string, filters?: QueryClassSessionsDto) => {
    const where: Prisma.ClassSessionWhereInput = {
      batch: {
        instituteId,
      },
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (filters?.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters?.facultyId) {
      where.facultyId = filters.facultyId;
    }

    if (filters?.mode) {
      where.mode = filters.mode;
    }

    if (filters?.status) {
      where.sessionStatus = filters.status;
    }

    if (filters?.startDate && filters?.endDate) {
      where.scheduledDate = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    } else if (filters?.startDate) {
      where.scheduledDate = {
        gte: new Date(filters.startDate),
      };
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { roomNo: { contains: search, mode: "insensitive" } },
        { batch: { code: { contains: search, mode: "insensitive" } } },
        { batch: { name: { contains: search, mode: "insensitive" } } },
      ];
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
        batchModule: {
          include: {
            courseModule: true,
          },
        },
      },
      orderBy: [
        { scheduledDate: "asc" },
        { startTime: "asc" },
      ],
    });
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
        attendance: true,
      },
    });
  },

  create: async (instituteId: string, data: CreateClassSessionDto) => {
    // Lookup branch from batch if not explicitly passed
    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
      select: { branchId: true },
    });

    const branchId = data.branchId || batch?.branchId || "main";

    return prisma.classSession.create({
      data: {
        batchId: data.batchId,
        batchModuleId: data.batchModuleId || undefined,
        facultyId: data.facultyId,
        branchId,
        title: data.title,
        scheduledDate: new Date(data.scheduledDate),
        startTime: data.startTime,
        endTime: data.endTime,
        roomNo: data.roomNo || undefined,
        mode: data.mode || "OFFLINE",
        meetingUrl: data.meetingUrl || undefined,
        notes: data.notes || undefined,
        sessionStatus: "UPCOMING",
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
      },
    });
  },

  update: async (id: string, instituteId: string, data: UpdateClassSessionDto) => {
    const updateData: Prisma.ClassSessionUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.batchId !== undefined) updateData.batch = { connect: { id: data.batchId } };
    if (data.batchModuleId !== undefined) updateData.batchModule = data.batchModuleId ? { connect: { id: data.batchModuleId } } : { disconnect: true };
    if (data.facultyId !== undefined) updateData.faculty = { connect: { id: data.facultyId } };
    if (data.scheduledDate !== undefined) updateData.scheduledDate = new Date(data.scheduledDate);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.roomNo !== undefined) updateData.roomNo = data.roomNo;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.meetingUrl !== undefined) updateData.meetingUrl = data.meetingUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.sessionStatus = data.status;

    return prisma.classSession.update({
      where: { id },
      data: updateData,
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
      sessionStatus: { in: ["LIVE", "ONGOING"] },
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

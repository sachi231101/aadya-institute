import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import type {
  QueryFacultyScheduleBlocksDto,
  UpsertFacultyScheduleBlockDto,
} from "./faculty-schedule-block.types";

/** Store calendar dates at UTC noon so list/Timetable keys never shift by timezone. */
const parseCalendarDate = (value: string): Date => {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
  }
  return new Date(value);
};

const dayBounds = (value: string) => {
  const day = parseCalendarDate(value);
  const dayStart = new Date(day);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setUTCHours(23, 59, 59, 999);
  return { day, dayStart, dayEnd };
};

const blockInclude = {
  faculty: {
    select: {
      id: true,
      employeeCode: true,
      branchId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  timeslotMaster: {
    select: { id: true, name: true, code: true },
  },
} satisfies Prisma.FacultyScheduleBlockInclude;

export const facultyScheduleBlockRepository = {
  findMany: async (
    instituteId: string,
    branchId: string | undefined,
    filters?: QueryFacultyScheduleBlocksDto
  ) => {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 200;
    const skip = (page - 1) * limit;

    const from = filters?.from || filters?.startDate;
    const to = filters?.to || filters?.endDate;

    const where: Prisma.FacultyScheduleBlockWhereInput = {
      instituteId,
      ...(branchId ? { branchId } : {}),
      ...(filters?.branchIds?.length ? { branchId: { in: filters.branchIds } } : {}),
      ...(filters?.facultyId ? { facultyId: filters.facultyId } : {}),
    };

    if (from && to) {
      where.scheduledDate = {
        gte: dayBounds(from).dayStart,
        lte: dayBounds(to).dayEnd,
      };
    } else if (from) {
      where.scheduledDate = { gte: dayBounds(from).dayStart };
    } else if (to) {
      where.scheduledDate = { lte: dayBounds(to).dayEnd };
    }

    const [total, data] = await Promise.all([
      prisma.facultyScheduleBlock.count({ where }),
      prisma.facultyScheduleBlock.findMany({
        where,
        include: blockInclude,
        orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
  },

  findById: async (id: string, instituteId: string) => {
    return prisma.facultyScheduleBlock.findFirst({
      where: { id, instituteId },
      include: blockInclude,
    });
  },

  findByKey: async (options: {
    instituteId: string;
    facultyId: string;
    scheduledDate: string;
    startTime: string;
  }) => {
    const { dayStart, dayEnd } = dayBounds(options.scheduledDate);
    return prisma.facultyScheduleBlock.findFirst({
      where: {
        instituteId: options.instituteId,
        facultyId: options.facultyId,
        startTime: options.startTime,
        scheduledDate: { gte: dayStart, lte: dayEnd },
      },
      include: blockInclude,
    });
  },

  upsert: async (
    instituteId: string,
    data: UpsertFacultyScheduleBlockDto & { branchId: string }
  ) => {
    const scheduledDate = parseCalendarDate(data.scheduledDate);
    const { dayStart, dayEnd } = dayBounds(data.scheduledDate);

    const existing = await prisma.facultyScheduleBlock.findFirst({
      where: {
        facultyId: data.facultyId,
        startTime: data.startTime,
        scheduledDate: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true },
    });

    const payload = {
      instituteId,
      branchId: data.branchId,
      facultyId: data.facultyId,
      scheduledDate,
      startTime: data.startTime,
      endTime: data.endTime,
      timeslotMasterId: data.timeslotMasterId || null,
      blockType: data.blockType,
    };

    if (existing) {
      return prisma.facultyScheduleBlock.update({
        where: { id: existing.id },
        data: payload,
        include: blockInclude,
      });
    }

    return prisma.facultyScheduleBlock.create({
      data: payload,
      include: blockInclude,
    });
  },

  deleteById: async (id: string, instituteId: string) => {
    return prisma.facultyScheduleBlock.deleteMany({
      where: { id, instituteId },
    });
  },

  deleteByKey: async (options: {
    instituteId: string;
    facultyId: string;
    scheduledDate: string;
    startTime: string;
  }) => {
    const { dayStart, dayEnd } = dayBounds(options.scheduledDate);
    return prisma.facultyScheduleBlock.deleteMany({
      where: {
        instituteId: options.instituteId,
        facultyId: options.facultyId,
        startTime: options.startTime,
        scheduledDate: { gte: dayStart, lte: dayEnd },
      },
    });
  },

  /** Remove any class sessions for this faculty on the same calendar day + clock times. */
  deleteOverlappingSessions: async (options: {
    instituteId: string;
    facultyId: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
  }) => {
    const { dayStart, dayEnd } = dayBounds(options.scheduledDate);
    return prisma.classSession.deleteMany({
      where: {
        facultyId: options.facultyId,
        startTime: options.startTime,
        endTime: options.endTime,
        scheduledDate: { gte: dayStart, lte: dayEnd },
        status: "ACTIVE",
        sessionStatus: { not: "CANCELLED" },
        batch: { instituteId: options.instituteId },
      },
    });
  },
};

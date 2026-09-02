import { prisma } from "../../config/database";
import {
  CreateBatchDto,
  UpdateBatchDto,
  BatchQueryFilters,
  CreateBatchScheduleDto,
  UpdateBatchScheduleDto,
  BatchCourseItemDto,
  ScheduleLineDto,
  AvailableFacultyQuery,
} from "./batch.types";
import { buildDefaultSchedules, derivePatternFromDays, parseTimeSlot } from "./batch-schedule.util";

const masterSelect = { select: { id: true, name: true, code: true, entityType: true } };
const facultySelect = {
  select: {
    id: true,
    employeeCode: true,
    user: { select: { id: true, name: true, email: true, phone: true } },
  },
};

const batchInclude = {
  course: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  faculty: facultySelect,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  timeslotMaster: masterSelect,
  classroomMaster: masterSelect,
  batchModules: {
    include: {
      courseModule: {
        select: {
          id: true,
          name: true,
          code: true,
          sequence: true,
          duration: true,
        },
      },
    },
    orderBy: { sequence: "asc" as const },
  },
  schedules: {
    orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }],
    include: {
      faculty: facultySelect,
      timeslotMaster: masterSelect,
      classroomMaster: masterSelect,
      batchCourse: {
        select: {
          id: true,
          courseId: true,
          course: { select: { id: true, name: true, code: true } },
        },
      },
    },
  },
  enrollments: {
    where: { status: "ACTIVE" as const },
    select: {
      id: true,
      studentId: true,
    },
  },
  _count: {
    select: {
      enrollments: true,
      classSessions: true,
    },
  },
  batchCourses: {
    orderBy: { sequence: "asc" as const },
    include: {
      course: { select: { id: true, name: true, code: true } },
      faculty: facultySelect,
      timeslotMaster: masterSelect,
      classroomMaster: masterSelect,
      schedules: {
        orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }],
        include: {
          faculty: facultySelect,
          timeslotMaster: masterSelect,
          classroomMaster: masterSelect,
        },
      },
    },
  },
};

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const emptyToNull = (value?: string | null) =>
  value && String(value).trim() !== "" ? String(value).trim() : null;

const resolveLineTimes = (line: ScheduleLineDto) => {
  if (line.startTime && line.endTime) {
    return { startTime: line.startTime, endTime: line.endTime };
  }
  return parseTimeSlot(line.timeSlot);
};

/** Derive BatchCourse items from Zenox scheduleLines (unique courses). */
export const coursesFromScheduleLines = (
  lines: ScheduleLineDto[],
  data: { startDate?: string; expectedEndDate?: string }
): BatchCourseItemDto[] => {
  const byCourse = new Map<string, BatchCourseItemDto>();
  for (const line of lines) {
    const existing = byCourse.get(line.courseId);
    const { startTime, endTime } = resolveLineTimes(line);
    const timeSlot = line.timeSlot || `${startTime} - ${endTime}`;
    if (!existing) {
      byCourse.set(line.courseId, {
        courseId: line.courseId,
        facultyId: line.facultyId,
        sequence: byCourse.size + 1,
        startDate: data.startDate,
        expectedEndDate: data.expectedEndDate,
        timeSlot,
        timeslotMasterId: line.timeslotMasterId,
        classroomMasterId: line.classroomMasterId,
      });
    } else if (!existing.facultyId && line.facultyId) {
      existing.facultyId = line.facultyId;
    }
  }

  for (const [courseId, item] of byCourse) {
    const days = lines.filter((l) => l.courseId === courseId).map((l) => l.dayOfWeek);
    item.schedulePattern = derivePatternFromDays(days);
  }

  return [...byCourse.values()];
};

export const normalizeBatchCourses = (data: {
  courseId?: string;
  facultyId?: string;
  startDate?: string;
  expectedEndDate?: string;
  schedulePattern?: string;
  timeSlot?: string;
  timeslotMasterId?: string;
  classroomMasterId?: string;
  schedules?: CreateBatchScheduleDto[];
  courses?: BatchCourseItemDto[];
  scheduleLines?: ScheduleLineDto[];
}): BatchCourseItemDto[] => {
  if (data.scheduleLines && data.scheduleLines.length > 0) {
    return coursesFromScheduleLines(data.scheduleLines, data);
  }
  if (data.courses && data.courses.length > 0) {
    return data.courses.map((c, idx) => ({
      courseId: c.courseId,
      facultyId: c.facultyId,
      sequence: c.sequence ?? idx + 1,
      startDate: c.startDate || data.startDate,
      expectedEndDate: c.expectedEndDate || data.expectedEndDate,
      schedulePattern: c.schedulePattern || data.schedulePattern,
      timeSlot: c.timeSlot || data.timeSlot,
      timeslotMasterId: c.timeslotMasterId || data.timeslotMasterId,
      classroomMasterId: c.classroomMasterId || data.classroomMasterId,
      schedules: c.schedules?.length
        ? c.schedules
        : idx === 0 && data.schedules?.length
          ? data.schedules
          : undefined,
    }));
  }
  if (data.courseId && data.courseId.trim() !== "") {
    return [
      {
        courseId: data.courseId,
        facultyId: data.facultyId,
        sequence: 1,
        startDate: data.startDate,
        expectedEndDate: data.expectedEndDate,
        schedulePattern: data.schedulePattern,
        timeSlot: data.timeSlot,
        timeslotMasterId: data.timeslotMasterId,
        classroomMasterId: data.classroomMasterId,
        schedules: data.schedules,
      },
    ];
  }
  return [];
};

const deriveBatchSummary = (
  items: BatchCourseItemDto[],
  data: CreateBatchDto | UpdateBatchDto,
  lines?: ScheduleLineDto[]
) => {
  const startDates = items
    .map((i) => (i.startDate ? new Date(i.startDate) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
  const endDates = items
    .map((i) => (i.expectedEndDate ? new Date(i.expectedEndDate) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

  const earliestStart =
    startDates.length > 0
      ? new Date(Math.min(...startDates.map((d) => d.getTime())))
      : data.startDate
        ? new Date(data.startDate)
        : new Date();

  const latestEnd =
    endDates.length > 0
      ? new Date(Math.max(...endDates.map((d) => d.getTime())))
      : data.expectedEndDate
        ? new Date(data.expectedEndDate)
        : null;

  const primary = items[0];
  const patternFromLines =
    lines && lines.length > 0 ? derivePatternFromDays(lines.map((l) => l.dayOfWeek)) : null;
  const firstLine = lines?.[0];
  const firstTimes = firstLine ? resolveLineTimes(firstLine) : null;

  return {
    startDate: earliestStart,
    expectedEndDate: latestEnd,
    schedulePattern:
      patternFromLines || primary?.schedulePattern || data.schedulePattern || "MWF",
    timeSlot:
      firstLine?.timeSlot ||
      (firstTimes ? `${firstTimes.startTime} - ${firstTimes.endTime}` : undefined) ||
      primary?.timeSlot ||
      data.timeSlot ||
      "10:00 AM - 12:00 PM",
    timeslotMasterId: emptyToNull(
      firstLine?.timeslotMasterId || primary?.timeslotMasterId || data.timeslotMasterId
    ),
    classroomMasterId: emptyToNull(
      firstLine?.classroomMasterId || primary?.classroomMasterId || data.classroomMasterId
    ),
  };
};

const syncBatchCourseRows = async (
  tx: TxClient,
  batchId: string,
  items: BatchCourseItemDto[],
  batchFallbackStart: Date
) => {
  await tx.batchSchedule.deleteMany({ where: { batchId } });
  await tx.batchCourse.deleteMany({ where: { batchId } });
  if (items.length === 0) return [];

  const created = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const startDate = item.startDate ? new Date(item.startDate) : batchFallbackStart;
    const row = await tx.batchCourse.create({
      data: {
        batchId,
        courseId: item.courseId,
        facultyId: emptyToNull(item.facultyId),
        sequence: item.sequence ?? idx + 1,
        startDate,
        expectedEndDate: item.expectedEndDate ? new Date(item.expectedEndDate) : null,
        schedulePattern: item.schedulePattern || "MWF",
        timeSlot: item.timeSlot || "10:00 AM - 12:00 PM",
        timeslotMasterId: emptyToNull(item.timeslotMasterId),
        classroomMasterId: emptyToNull(item.classroomMasterId),
        status: "ACTIVE",
      },
    });
    created.push({ row, item });
  }
  return created;
};

const syncSchedulesFromLines = async (
  tx: TxClient,
  batchId: string,
  lines: ScheduleLineDto[],
  courseIdToBatchCourseId: Map<string, string>,
  batchStart: Date,
  batchEnd: Date | null
) => {
  const scheduleRows = lines.map((line) => {
    const { startTime, endTime } = resolveLineTimes(line);
    return {
      batchId,
      batchCourseId: courseIdToBatchCourseId.get(line.courseId) || null,
      dayOfWeek: line.dayOfWeek,
      startTime,
      endTime,
      effectiveFrom: line.effectiveFrom ? new Date(line.effectiveFrom) : batchStart,
      effectiveTo: line.effectiveTo ? new Date(line.effectiveTo) : batchEnd,
      facultyId: emptyToNull(line.facultyId),
      timeslotMasterId: emptyToNull(line.timeslotMasterId),
      classroomMasterId: emptyToNull(line.classroomMasterId),
      status: (line.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
      attendanceEnabled: line.attendanceEnabled !== false,
    };
  });

  if (scheduleRows.length > 0) {
    await tx.batchSchedule.createMany({ data: scheduleRows });
  }
};

const syncSchedulesForCourses = async (
  tx: TxClient,
  batchId: string,
  created: Array<{ row: { id: string; startDate: Date | null }; item: BatchCourseItemDto }>,
  batchFallbackStart: Date
) => {
  const scheduleRows: Array<{
    batchId: string;
    batchCourseId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    facultyId: string | null;
    timeslotMasterId: string | null;
    classroomMasterId: string | null;
    status: "ACTIVE";
    attendanceEnabled: boolean;
  }> = [];

  for (const { row, item } of created) {
    const courseStart = row.startDate || batchFallbackStart;
    const pattern = item.schedulePattern || "MWF";
    const timeSlot = item.timeSlot || "10:00 AM - 12:00 PM";
    const courseEnd = item.expectedEndDate ? new Date(item.expectedEndDate) : null;
    const facultyId = emptyToNull(item.facultyId);
    const timeslotMasterId = emptyToNull(item.timeslotMasterId);
    const classroomMasterId = emptyToNull(item.classroomMasterId);

    if (item.schedules && item.schedules.length > 0) {
      for (const s of item.schedules) {
        scheduleRows.push({
          batchId,
          batchCourseId: row.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          effectiveFrom: s.effectiveFrom ? new Date(s.effectiveFrom) : courseStart,
          effectiveTo: s.effectiveTo ? new Date(s.effectiveTo) : courseEnd,
          facultyId,
          timeslotMasterId,
          classroomMasterId,
          status: "ACTIVE",
          attendanceEnabled: true,
        });
      }
    } else {
      const defaults = buildDefaultSchedules(pattern, timeSlot, courseStart);
      for (const s of defaults) {
        scheduleRows.push({
          batchId,
          batchCourseId: row.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          effectiveFrom: s.effectiveFrom,
          effectiveTo: courseEnd,
          facultyId,
          timeslotMasterId,
          classroomMasterId,
          status: "ACTIVE",
          attendanceEnabled: true,
        });
      }
    }
  }

  if (scheduleRows.length > 0) {
    await tx.batchSchedule.createMany({ data: scheduleRows });
  }
};

const syncBatchModulesForCourses = async (tx: TxClient, batchId: string, courseIds: string[]) => {
  await tx.batchModule.deleteMany({ where: { batchId } });
  let sequenceOffset = 0;
  for (const courseId of courseIds) {
    const courseModules = await tx.courseModule.findMany({
      where: { courseId, status: "ACTIVE" },
      orderBy: { sequence: "asc" },
    });
    if (courseModules.length > 0) {
      await tx.batchModule.createMany({
        data: courseModules.map((cm, idx) => ({
          batchId,
          courseModuleId: cm.id,
          sequence: sequenceOffset + (cm.sequence || idx + 1),
          status: "ACTIVE" as const,
        })),
        skipDuplicates: true,
      });
      sequenceOffset += courseModules.length;
    }
  }
};

export const findAllBatches = async (
  instituteId: string,
  branchId?: string,
  filters: BatchQueryFilters = {}
) => {
  const where: Record<string, unknown> = {
    instituteId,
  };

  if (branchId) {
    where.branchId = branchId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.courseId) {
    where.AND = [
      ...((where.AND as object[]) || []),
      {
        OR: [
          { courseId: filters.courseId },
          { batchCourses: { some: { courseId: filters.courseId } } },
        ],
      },
    ];
  }

  if (filters.facultyId) {
    where.AND = [
      ...((where.AND as object[]) || []),
      {
        OR: [
          { facultyId: filters.facultyId },
          { batchCourses: { some: { facultyId: filters.facultyId } } },
          { schedules: { some: { facultyId: filters.facultyId } } },
        ],
      },
    ];
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { course: { name: { contains: filters.search, mode: "insensitive" } } },
      { faculty: { user: { name: { contains: filters.search, mode: "insensitive" } } } },
    ];
  }

  return prisma.batch.findMany({
    where,
    include: batchInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const findBatchById = async (id: string, instituteId: string) => {
  return prisma.batch.findFirst({
    where: { id, instituteId },
    include: {
      ...batchInclude,
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: {
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
      },
    },
  });
};

export const createBatch = async (instituteId: string, defaultBranchId: string, data: CreateBatchDto) => {
  let branchId = data.branchId || defaultBranchId;
  if (!branchId || branchId.trim() === "") {
    const firstBranch = await prisma.branch.findFirst({
      where: { instituteId },
      select: { id: true },
    });
    if (!firstBranch) {
      throw new Error("No branch found for this institute");
    }
    branchId = firstBranch.id;
  }

  return prisma.$transaction(async (tx) => {
    const lines = data.scheduleLines?.length ? data.scheduleLines : undefined;
    const courseItems = normalizeBatchCourses(data);
    const primaryCourseId = data.courseId?.trim() || courseItems[0]?.courseId;
    if (!primaryCourseId) throw new Error("At least one course is required");

    const coordinatorFacultyId =
      data.facultyId && data.facultyId.trim() !== ""
        ? data.facultyId
        : lines?.find((l) => l.facultyId)?.facultyId ||
          courseItems.find((c) => c.facultyId)?.facultyId ||
          null;

    const summary = deriveBatchSummary(courseItems, data, lines);

    const batch = await tx.batch.create({
      data: {
        instituteId,
        branchId,
        courseId: primaryCourseId,
        facultyId: coordinatorFacultyId,
        name: data.name,
        code: data.code,
        startDate: summary.startDate,
        expectedEndDate: summary.expectedEndDate,
        schedulePattern: summary.schedulePattern,
        timeSlot: summary.timeSlot,
        timeslotMasterId: summary.timeslotMasterId,
        classroomMasterId: summary.classroomMasterId,
        capacity: data.capacity || 35,
        remark: emptyToNull(data.remark),
        status: "UPCOMING",
      },
    });

    const created = await syncBatchCourseRows(tx, batch.id, courseItems, summary.startDate);
    if (lines) {
      const map = new Map(created.map(({ row, item }) => [item.courseId, row.id]));
      await syncSchedulesFromLines(
        tx,
        batch.id,
        lines,
        map,
        summary.startDate,
        summary.expectedEndDate
      );
    } else {
      await syncSchedulesForCourses(tx, batch.id, created, summary.startDate);
    }
    await syncBatchModulesForCourses(
      tx,
      batch.id,
      courseItems.map((c) => c.courseId)
    );

    return tx.batch.findUniqueOrThrow({
      where: { id: batch.id },
      include: batchInclude,
    });
  });
};

export const updateBatch = async (id: string, instituteId: string, data: UpdateBatchDto) => {
  const existing = await prisma.batch.findFirst({ where: { id, instituteId } });
  if (!existing) {
    return { count: 0 };
  }

  const lines = data.scheduleLines?.length ? data.scheduleLines : undefined;
  const courseItems =
    lines || (data.courses && data.courses.length > 0) ? normalizeBatchCourses(data) : null;
  const coursesChanged = courseItems !== null;
  const primaryCourseId =
    data.courseId !== undefined && data.courseId.trim() !== ""
      ? data.courseId
      : courseItems?.[0]?.courseId;

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.facultyId !== undefined) {
    updateData.facultyId = emptyToNull(data.facultyId);
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.remark !== undefined) updateData.remark = emptyToNull(data.remark);

  if (courseItems) {
    const summary = deriveBatchSummary(
      courseItems,
      {
        ...data,
        startDate: data.startDate || existing.startDate.toISOString(),
      },
      lines
    );
    updateData.startDate = summary.startDate;
    updateData.expectedEndDate = summary.expectedEndDate;
    updateData.schedulePattern = summary.schedulePattern;
    updateData.timeSlot = summary.timeSlot;
    updateData.timeslotMasterId = summary.timeslotMasterId;
    updateData.classroomMasterId = summary.classroomMasterId;
  } else {
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.expectedEndDate !== undefined) {
      updateData.expectedEndDate = data.expectedEndDate ? new Date(data.expectedEndDate) : null;
    }
    if (data.schedulePattern !== undefined) updateData.schedulePattern = data.schedulePattern;
    if (data.timeSlot !== undefined) updateData.timeSlot = data.timeSlot;
    if (data.timeslotMasterId !== undefined) {
      updateData.timeslotMasterId = emptyToNull(data.timeslotMasterId);
    }
    if (data.classroomMasterId !== undefined) {
      updateData.classroomMasterId = emptyToNull(data.classroomMasterId);
    }
  }

  if (primaryCourseId) {
    updateData.courseId = primaryCourseId;
  }

  if (coursesChanged || (data.courseId !== undefined && data.courseId !== existing.courseId)) {
    return prisma.$transaction(async (tx) => {
      const items =
        courseItems ??
        normalizeBatchCourses({
          courseId: data.courseId || existing.courseId,
          facultyId: data.facultyId,
          startDate: data.startDate || existing.startDate.toISOString(),
          expectedEndDate: data.expectedEndDate ?? existing.expectedEndDate?.toISOString(),
          schedulePattern: data.schedulePattern || existing.schedulePattern || undefined,
          timeSlot: data.timeSlot || existing.timeSlot || undefined,
          timeslotMasterId: data.timeslotMasterId ?? existing.timeslotMasterId ?? undefined,
          classroomMasterId: data.classroomMasterId ?? existing.classroomMasterId ?? undefined,
        });

      const result = await tx.batch.updateMany({
        where: { id, instituteId },
        data: updateData,
      });

      const fallbackStart = (updateData.startDate as Date) || existing.startDate;
      const fallbackEnd =
        (updateData.expectedEndDate as Date | null | undefined) !== undefined
          ? (updateData.expectedEndDate as Date | null)
          : existing.expectedEndDate;
      const created = await syncBatchCourseRows(tx, id, items, fallbackStart);
      if (lines) {
        const map = new Map(created.map(({ row, item }) => [item.courseId, row.id]));
        await syncSchedulesFromLines(tx, id, lines, map, fallbackStart, fallbackEnd ?? null);
      } else {
        await syncSchedulesForCourses(tx, id, created, fallbackStart);
      }
      await syncBatchModulesForCourses(
        tx,
        id,
        items.map((c) => c.courseId)
      );

      return result;
    });
  }

  return prisma.batch.updateMany({
    where: { id, instituteId },
    data: updateData,
  });
};

export const assignFacultyToBatch = async (id: string, instituteId: string, facultyId: string) => {
  return prisma.batch.updateMany({
    where: { id, instituteId },
    data: { facultyId },
  });
};

export const enrollStudentInBatch = async (batchId: string, studentId: string, admissionId?: string) => {
  return prisma.batchEnrollment.upsert({
    where: {
      batchId_studentId: { batchId, studentId },
    },
    update: {
      status: "ACTIVE",
      joinedAt: new Date(),
      leftAt: null,
    },
    create: {
      batchId,
      studentId,
      admissionId: admissionId || null,
      status: "ACTIVE",
    },
    include: {
      student: {
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
};

export const removeStudentFromBatch = async (batchId: string, studentId: string) => {
  return prisma.batchEnrollment.updateMany({
    where: { batchId, studentId },
    data: {
      status: "INACTIVE",
      leftAt: new Date(),
    },
  });
};

export const deleteBatch = async (id: string, instituteId: string) => {
  return prisma.batch.deleteMany({
    where: { id, instituteId },
  });
};

export const getBatchStudents = async (batchId: string) => {
  return prisma.batchEnrollment.findMany({
    where: { batchId, status: "ACTIVE" },
    include: {
      student: {
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
};

export const findBatchSchedules = async (batchId: string, instituteId: string) => {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId } });
  if (!batch) return null;
  return prisma.batchSchedule.findMany({
    where: { batchId },
    include: {
      faculty: facultySelect,
      timeslotMaster: masterSelect,
      classroomMaster: masterSelect,
      batchCourse: {
        select: {
          id: true,
          courseId: true,
          course: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
};

export const createBatchSchedule = async (
  batchId: string,
  instituteId: string,
  data: CreateBatchScheduleDto
) => {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId } });
  if (!batch) return null;

  let batchCourseId = emptyToNull(data.batchCourseId);
  if (batchCourseId) {
    const bc = await prisma.batchCourse.findFirst({ where: { id: batchCourseId, batchId } });
    if (!bc) return null;
  }

  return prisma.batchSchedule.create({
    data: {
      batchId,
      batchCourseId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : batch.startDate,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      facultyId: emptyToNull(data.facultyId),
      timeslotMasterId: emptyToNull(data.timeslotMasterId),
      classroomMasterId: emptyToNull(data.classroomMasterId),
      status: data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      attendanceEnabled: data.attendanceEnabled !== false,
    },
  });
};

export const updateBatchSchedule = async (
  batchId: string,
  scheduleId: string,
  instituteId: string,
  data: UpdateBatchScheduleDto
) => {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId } });
  if (!batch) return null;
  const existing = await prisma.batchSchedule.findFirst({ where: { id: scheduleId, batchId } });
  if (!existing) return null;

  let batchCourseId: string | null | undefined = undefined;
  if (data.batchCourseId !== undefined) {
    if (data.batchCourseId === null || data.batchCourseId === "") {
      batchCourseId = null;
    } else {
      const bc = await prisma.batchCourse.findFirst({
        where: { id: data.batchCourseId, batchId },
      });
      if (!bc) return null;
      batchCourseId = data.batchCourseId;
    }
  }

  return prisma.batchSchedule.update({
    where: { id: scheduleId },
    data: {
      ...(data.dayOfWeek !== undefined ? { dayOfWeek: data.dayOfWeek } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.effectiveFrom !== undefined ? { effectiveFrom: new Date(data.effectiveFrom) } : {}),
      ...(data.effectiveTo !== undefined
        ? { effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null }
        : {}),
      ...(batchCourseId !== undefined ? { batchCourseId } : {}),
      ...(data.facultyId !== undefined ? { facultyId: emptyToNull(data.facultyId) } : {}),
      ...(data.timeslotMasterId !== undefined
        ? { timeslotMasterId: emptyToNull(data.timeslotMasterId) }
        : {}),
      ...(data.classroomMasterId !== undefined
        ? { classroomMasterId: emptyToNull(data.classroomMasterId) }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.attendanceEnabled !== undefined
        ? { attendanceEnabled: data.attendanceEnabled }
        : {}),
    },
  });
};

export const deleteBatchSchedule = async (batchId: string, scheduleId: string, instituteId: string) => {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, instituteId } });
  if (!batch) return null;
  const existing = await prisma.batchSchedule.findFirst({ where: { id: scheduleId, batchId } });
  if (!existing) return null;
  return prisma.batchSchedule.delete({ where: { id: scheduleId } });
};

export const findAvailableFaculty = async (instituteId: string, query: AvailableFacultyQuery) => {
  const {
    dayOfWeek,
    startTime,
    endTime,
    timeslotMasterId,
    startDate,
    endDate,
    branchId,
    excludeBatchId,
  } = query;

  const conflictWhere: Record<string, unknown> = {
    dayOfWeek,
    status: "ACTIVE",
    facultyId: { not: null },
    batch: { instituteId },
  };

  if (excludeBatchId) {
    conflictWhere.batchId = { not: excludeBatchId };
  }
  if (timeslotMasterId) {
    conflictWhere.timeslotMasterId = timeslotMasterId;
  } else if (startTime && endTime) {
    conflictWhere.startTime = startTime;
    conflictWhere.endTime = endTime;
  }
  if (startDate || endDate) {
    const rangeStart = startDate ? new Date(startDate) : undefined;
    const rangeEnd = endDate ? new Date(endDate) : undefined;
    conflictWhere.AND = [
      rangeEnd ? { effectiveFrom: { lte: rangeEnd } } : {},
      {
        OR: [{ effectiveTo: null }, rangeStart ? { effectiveTo: { gte: rangeStart } } : {}],
      },
    ];
  }

  const busy = await prisma.batchSchedule.findMany({
    where: conflictWhere,
    select: { facultyId: true },
  });
  const busyIds = [...new Set(busy.map((b) => b.facultyId).filter(Boolean))] as string[];

  return prisma.faculty.findMany({
    where: {
      instituteId,
      status: "ACTIVE",
      ...(branchId ? { branchId } : {}),
      ...(busyIds.length > 0 ? { id: { notIn: busyIds } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { employeeCode: "asc" },
  });
};

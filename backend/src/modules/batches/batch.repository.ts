import { prisma } from "../../config/database";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters, CreateBatchScheduleDto, UpdateBatchScheduleDto, BatchCourseItemDto } from "./batch.types";
import { buildDefaultSchedules } from "./batch-schedule.util";

const batchInclude = {
  course: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  faculty: {
    select: {
      id: true,
      employeeCode: true,
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
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
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
  schedules: true,
  enrollments: {
    where: { status: "ACTIVE" as any },
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
      faculty: {
        select: {
          id: true,
          employeeCode: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
  },
};

export const normalizeBatchCourses = (data: {
  courseId?: string;
  facultyId?: string;
  courses?: BatchCourseItemDto[];
}): BatchCourseItemDto[] => {
  if (data.courses && data.courses.length > 0) {
    return data.courses.map((c, idx) => ({
      courseId: c.courseId,
      facultyId: c.facultyId,
      sequence: c.sequence ?? idx + 1,
    }));
  }
  if (data.courseId && data.courseId.trim() !== "") {
    return [{ courseId: data.courseId, facultyId: data.facultyId, sequence: 1 }];
  }
  return [];
};

const syncBatchCourseRows = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  batchId: string,
  items: BatchCourseItemDto[]
) => {
  await tx.batchCourse.deleteMany({ where: { batchId } });
  if (items.length === 0) return;
  await tx.batchCourse.createMany({
    data: items.map((item, idx) => ({
      batchId,
      courseId: item.courseId,
      facultyId: item.facultyId && item.facultyId.trim() !== "" ? item.facultyId : null,
      sequence: item.sequence ?? idx + 1,
      status: "ACTIVE" as const,
    })),
  });
};

const syncBatchModulesForCourses = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  batchId: string,
  courseIds: string[]
) => {
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

export const findAllBatches = async (instituteId: string, branchId?: string, filters: BatchQueryFilters = {}) => {
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
    const courseItems = normalizeBatchCourses(data);
    const primaryCourseId = data.courseId?.trim() || courseItems[0]?.courseId;
    if (!primaryCourseId) throw new Error("At least one course is required");

    const coordinatorFacultyId =
      data.facultyId && data.facultyId.trim() !== ""
        ? data.facultyId
        : courseItems.find((c) => c.facultyId)?.facultyId || null;

    const batch = await tx.batch.create({
      data: {
        instituteId,
        branchId,
        courseId: primaryCourseId,
        facultyId: coordinatorFacultyId,
        name: data.name,
        code: data.code,
        startDate: new Date(data.startDate),
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
        schedulePattern: data.schedulePattern || "MWF",
        timeSlot: data.timeSlot || "10:00 AM - 12:00 PM",
        timeslotMasterId: data.timeslotMasterId && data.timeslotMasterId.trim() !== "" ? data.timeslotMasterId : null,
        classroomMasterId: data.classroomMasterId && data.classroomMasterId.trim() !== "" ? data.classroomMasterId : null,
        capacity: data.capacity || 35,
        status: "UPCOMING",
      },
    });

    await syncBatchCourseRows(tx, batch.id, courseItems);
    await syncBatchModulesForCourses(
      tx,
      batch.id,
      courseItems.map((c) => c.courseId)
    );

    const pattern = data.schedulePattern || "MWF";
    const timeSlot = data.timeSlot || "10:00 AM - 12:00 PM";
    const scheduleRows =
      data.schedules && data.schedules.length > 0
        ? data.schedules.map((s) => ({
            batchId: batch.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            effectiveFrom: s.effectiveFrom ? new Date(s.effectiveFrom) : new Date(data.startDate),
            effectiveTo: s.effectiveTo ? new Date(s.effectiveTo) : null,
          }))
        : buildDefaultSchedules(pattern, timeSlot, new Date(data.startDate)).map((s) => ({
            batchId: batch.id,
            ...s,
            effectiveTo: null,
          }));

    if (scheduleRows.length > 0) {
      await tx.batchSchedule.createMany({ data: scheduleRows });
    }

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

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.courseId !== undefined) updateData.courseId = data.courseId;
  if (data.facultyId !== undefined) {
    updateData.facultyId = data.facultyId && String(data.facultyId).trim() !== "" ? data.facultyId : null;
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.expectedEndDate !== undefined) updateData.expectedEndDate = data.expectedEndDate ? new Date(data.expectedEndDate) : null;
  if (data.schedulePattern !== undefined) updateData.schedulePattern = data.schedulePattern;
  if (data.timeSlot !== undefined) updateData.timeSlot = data.timeSlot;
  if (data.timeslotMasterId !== undefined) {
    updateData.timeslotMasterId = data.timeslotMasterId && data.timeslotMasterId.trim() !== "" ? data.timeslotMasterId : null;
  }
  if (data.classroomMasterId !== undefined) {
    updateData.classroomMasterId = data.classroomMasterId && data.classroomMasterId.trim() !== "" ? data.classroomMasterId : null;
  }
  if (data.capacity !== undefined) updateData.capacity = data.capacity;

  const courseItems = data.courses && data.courses.length > 0 ? normalizeBatchCourses(data) : null;
  const coursesChanged = courseItems !== null;
  const primaryCourseId =
    data.courseId !== undefined && data.courseId.trim() !== ""
      ? data.courseId
      : courseItems?.[0]?.courseId;

  if (primaryCourseId) {
    updateData.courseId = primaryCourseId;
  }

  if (coursesChanged || (data.courseId !== undefined && data.courseId !== existing.courseId)) {
    return prisma.$transaction(async (tx) => {
      const items =
        courseItems ??
        normalizeBatchCourses({ courseId: data.courseId || existing.courseId, facultyId: data.facultyId });

      const result = await tx.batch.updateMany({
        where: { id, instituteId },
        data: updateData,
      });

      await syncBatchCourseRows(tx, id, items);
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
  return prisma.batchSchedule.create({
    data: {
      batchId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : batch.startDate,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
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

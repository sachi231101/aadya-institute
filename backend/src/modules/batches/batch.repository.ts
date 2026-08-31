import { prisma } from "../../config/database";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters, CreateBatchScheduleDto, UpdateBatchScheduleDto } from "./batch.types";
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
    where.courseId = filters.courseId;
  }

  if (filters.facultyId) {
    where.facultyId = filters.facultyId;
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
    const batch = await tx.batch.create({
      data: {
        instituteId,
        branchId,
        courseId: data.courseId,
        facultyId: data.facultyId && data.facultyId.trim() !== "" ? data.facultyId : null,
        name: data.name,
        code: data.code,
        startDate: new Date(data.startDate),
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
        schedulePattern: data.schedulePattern || "MWF",
        timeSlot: data.timeSlot || "10:00 AM - 12:00 PM",
        capacity: data.capacity || 35,
        status: "UPCOMING",
      },
    });

    // Automatically clone active CourseModules into BatchModules
    const courseModules = await tx.courseModule.findMany({
      where: { courseId: data.courseId, status: "ACTIVE" },
      orderBy: { sequence: "asc" },
    });

    if (courseModules.length > 0) {
      await tx.batchModule.createMany({
        data: courseModules.map((cm, idx) => ({
          batchId: batch.id,
          courseModuleId: cm.id,
          sequence: cm.sequence || idx + 1,
          status: "ACTIVE",
        })),
        skipDuplicates: true,
      });
    }

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
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.courseId !== undefined) updateData.courseId = data.courseId;
  if (data.facultyId !== undefined) updateData.facultyId = data.facultyId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.expectedEndDate !== undefined) updateData.expectedEndDate = data.expectedEndDate ? new Date(data.expectedEndDate) : null;
  if (data.schedulePattern !== undefined) updateData.schedulePattern = data.schedulePattern;
  if (data.timeSlot !== undefined) updateData.timeSlot = data.timeSlot;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;

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

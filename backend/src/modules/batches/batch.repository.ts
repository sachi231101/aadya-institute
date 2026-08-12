import { prisma } from "../../config/database";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters } from "./batch.types";

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
  schedules: true,
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

  return prisma.batch.create({
    data: {
      instituteId,
      branchId,
      courseId: data.courseId,
      facultyId: data.facultyId && data.facultyId.trim() !== "" ? data.facultyId : null,
      name: data.name,
      code: data.code,
      startDate: new Date(data.startDate),
      expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
      status: "UPCOMING",
    },
    include: batchInclude,
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

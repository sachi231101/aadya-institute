import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

const requestInclude = {
  student: {
    include: {
      user: { select: { name: true } },
    },
  },
  reviewedBy: { select: { name: true } },
} satisfies Prisma.LeaveRequestInclude;

export type LeaveRequestRecord = Prisma.LeaveRequestGetPayload<{ include: typeof requestInclude }>;

export const findById = (id: string) =>
  prisma.leaveRequest.findUnique({
    where: { id },
    include: requestInclude,
  });

export const listForStudent = (studentId: string) =>
  prisma.leaveRequest.findMany({
    where: { studentId },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

export const listPending = (where: Prisma.LeaveRequestWhereInput) =>
  prisma.leaveRequest.findMany({
    where: { ...where, status: "PENDING" },
    include: requestInclude,
    orderBy: { createdAt: "asc" },
    take: 50,
  });

export const findOverlappingPending = (studentId: string, startDate: Date, endDate: Date) =>
  prisma.leaveRequest.findFirst({
    where: {
      studentId,
      status: "PENDING",
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  });

export const create = (data: Prisma.LeaveRequestCreateInput) =>
  prisma.leaveRequest.create({
    data,
    include: requestInclude,
  });

export const cancelPending = (id: string, studentId: string) =>
  prisma.leaveRequest.updateMany({
    where: { id, studentId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

export const findSessionsInRange = (studentId: string, rangeStart: Date, rangeEnd: Date) =>
  prisma.classSession.findMany({
    where: {
      status: "ACTIVE",
      sessionStatus: { not: "CANCELLED" },
      scheduledDate: { gte: rangeStart, lte: rangeEnd },
      batch: {
        enrollments: {
          some: {
            studentId,
            status: "ACTIVE",
            leftAt: null,
          },
        },
      },
    },
    select: { id: true, batchId: true },
  });

export const approveAndMarkLeave = async (input: {
  id: string;
  reviewedById: string;
  reviewNote?: string;
  classSessionIds: string[];
  studentId: string;
}) =>
  prisma.$transaction(async (tx) => {
    const claimed = await tx.leaveRequest.updateMany({
      where: { id: input.id, status: "PENDING" },
      data: {
        status: "APPROVED",
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote || null,
      },
    });

    if (claimed.count !== 1) {
      return null;
    }

    for (const classSessionId of input.classSessionIds) {
      await tx.studentAttendance.upsert({
        where: {
          classSessionId_studentId: {
            classSessionId,
            studentId: input.studentId,
          },
        },
        create: {
          classSessionId,
          studentId: input.studentId,
          status: "LEAVE",
          markedBy: input.reviewedById,
          remarks: input.reviewNote
            ? `Approved leave. ${input.reviewNote}`
            : "Approved leave request",
        },
        update: {
          status: "LEAVE",
          markedBy: input.reviewedById,
          remarks: input.reviewNote
            ? `Approved leave. ${input.reviewNote}`
            : "Approved leave request",
          markedAt: new Date(),
        },
      });
    }

    return tx.leaveRequest.findUnique({
      where: { id: input.id },
      include: requestInclude,
    });
  });

export const rejectPending = (id: string, reviewedById: string, reviewNote?: string) =>
  prisma.leaveRequest.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "REJECTED",
      reviewedById,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
  });

import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

const recordingInclude = {
  classSession: {
    select: {
      id: true,
      title: true,
      scheduledDate: true,
      facultyId: true,
      batch: { select: { id: true, name: true, instituteId: true, branchId: true } },
    },
  },
} satisfies Prisma.RecordingInclude;

export const createRecording = (data: {
  classSessionId: string;
  storageKey: string;
  duration?: number;
  startedAt?: Date;
  endedAt?: Date;
  expiresAt: Date;
}) => {
  return prisma.recording.create({
    data: {
      classSessionId: data.classSessionId,
      storageKey: data.storageKey,
      duration: data.duration,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      expiresAt: data.expiresAt,
    },
    include: recordingInclude,
  });
};

export const findRecordings = async (params: {
  instituteId: string;
  branchId?: string;
  batchId?: string;
  classSessionId?: string;
  status?: string;
  skip: number;
  take: number;
}) => {
  const { instituteId, branchId, batchId, classSessionId, status, skip, take } = params;

  const where: Prisma.RecordingWhereInput = {
    classSession: {
      batch: { instituteId, ...(branchId ? { branchId } : {}) },
      ...(batchId ? { batchId } : {}),
    },
    ...(classSessionId ? { classSessionId } : {}),
    ...(status ? { status: status as any } : {}),
  };

  const [recordings, total] = await Promise.all([
    prisma.recording.findMany({
      where,
      include: recordingInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.recording.count({ where }),
  ]);

  return { recordings, total };
};

export const findRecordingById = (id: string) => {
  return prisma.recording.findUnique({
    where: { id },
    include: recordingInclude,
  });
};

export const deleteRecording = (id: string) => {
  return prisma.recording.delete({ where: { id } });
};

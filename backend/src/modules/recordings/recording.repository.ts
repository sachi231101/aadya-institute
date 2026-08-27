import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

const recordingInclude = {
  classSession: {
    select: {
      id: true,
      title: true,
      scheduledDate: true,
      startTime: true,
      endTime: true,
      mode: true,
      meetingUrl: true,
      facultyId: true,
      faculty: {
        select: {
          id: true,
          employeeCode: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      batch: {
        select: {
          id: true,
          name: true,
          code: true,
          instituteId: true,
          branchId: true,
          course: {
            select: { id: true, name: true, code: true },
          },
          enrollments: {
            where: { status: "ACTIVE" },
            select: { studentId: true },
          },
        },
      },
      googleMeetSpace: {
        select: {
          id: true,
          spaceName: true,
          meetingUri: true,
          meetingCode: true,
          recordingEnabled: true,
          recordingConfigurationStatus: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.RecordingInclude;

export const createRecording = (data: {
  classSessionId: string;
  storageKey?: string;
  googleConferenceRecordId?: string;
  googleRecordingId?: string;
  googleDriveFileId?: string;
  playbackUrl?: string;
  recordingStatus?: string;
  storageProvider?: string;
  duration?: number;
  startedAt?: Date;
  endedAt?: Date;
  expiresAt: Date;
  metadata?: Prisma.InputJsonValue;
}) => {
  return prisma.recording.create({
    data: {
      classSessionId: data.classSessionId,
      storageKey: data.storageKey || "",
      googleConferenceRecordId: data.googleConferenceRecordId,
      googleRecordingId: data.googleRecordingId,
      googleDriveFileId: data.googleDriveFileId,
      playbackUrl: data.playbackUrl,
      recordingStatus: data.recordingStatus || "PENDING",
      storageProvider: data.storageProvider || "GOOGLE_DRIVE",
      duration: data.duration,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
    },
    include: recordingInclude,
  });
};

export const findRecordings = async (params: {
  instituteId: string;
  branchId?: string;
  batchId?: string;
  batchIds?: string[];
  courseId?: string;
  classSessionId?: string;
  status?: string;
  recordingStatus?: string;
  startDate?: string;
  endDate?: string;
  skip: number;
  take: number;
}) => {
  const {
    instituteId,
    branchId,
    batchId,
    batchIds,
    courseId,
    classSessionId,
    status,
    recordingStatus,
    startDate,
    endDate,
    skip,
    take,
  } = params;

  const batchCondition: Prisma.BatchWhereInput = {
    instituteId,
    ...(branchId ? { branchId } : {}),
    ...(courseId ? { courseId } : {}),
  };

  if (batchIds && batchIds.length > 0) {
    batchCondition.id = { in: batchIds };
  } else if (batchId) {
    batchCondition.id = batchId;
  }

  const sessionCondition: Prisma.ClassSessionWhereInput = {
    batch: batchCondition,
    ...(classSessionId ? { id: classSessionId } : {}),
  };

  if (startDate && endDate) {
    sessionCondition.scheduledDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else if (startDate) {
    sessionCondition.scheduledDate = {
      gte: new Date(startDate),
    };
  }

  const where: Prisma.RecordingWhereInput = {
    classSession: sessionCondition,
    ...(status ? { status: status as any } : {}),
    ...(recordingStatus ? { recordingStatus } : {}),
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

export const findRecordingByClassSessionId = (classSessionId: string) => {
  return prisma.recording.findUnique({
    where: { classSessionId },
    include: recordingInclude,
  });
};

export const deleteRecording = (id: string) => {
  return prisma.recording.delete({ where: { id } });
};

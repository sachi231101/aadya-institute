import { prisma } from "../../config/database";
import type { Prisma, GoogleConnectionStatus, MeetRecordingStatus, MeetSpaceStatus } from "@prisma/client";

export const findConnectionByUserId = async (userId: string) => {
  return prisma.googleWorkspaceConnection.findUnique({
    where: { userId },
  });
};

export const findConnectionByInstituteId = async (instituteId: string) => {
  return prisma.googleWorkspaceConnection.findFirst({
    where: {
      instituteId,
      status: "CONNECTED",
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const upsertConnection = async (data: {
  userId: string;
  instituteId: string;
  googleAccountId?: string;
  email: string;
  encryptedRefreshToken: string;
  scopes: string[];
  status?: GoogleConnectionStatus;
}) => {
  return prisma.googleWorkspaceConnection.upsert({
    where: { userId: data.userId },
    update: {
      googleAccountId: data.googleAccountId,
      email: data.email,
      encryptedRefreshToken: data.encryptedRefreshToken,
      scopes: data.scopes,
      status: data.status || "CONNECTED",
      lastSyncedAt: new Date(),
    },
    create: {
      userId: data.userId,
      instituteId: data.instituteId,
      googleAccountId: data.googleAccountId,
      email: data.email,
      encryptedRefreshToken: data.encryptedRefreshToken,
      scopes: data.scopes,
      status: data.status || "CONNECTED",
      lastSyncedAt: new Date(),
    },
  });
};

export const updateConnectionStatus = async (
  userId: string,
  status: GoogleConnectionStatus
) => {
  return prisma.googleWorkspaceConnection.update({
    where: { userId },
    data: { status, updatedAt: new Date() },
  });
};

export const deleteConnectionByUserId = async (userId: string) => {
  return prisma.googleWorkspaceConnection.delete({
    where: { userId },
  });
};

export const findMeetSpaceByClassSessionId = async (classSessionId: string) => {
  return prisma.googleMeetSpace.findUnique({
    where: { classSessionId },
    include: {
      organizer: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

export const upsertMeetSpace = async (data: {
  classSessionId: string;
  spaceName: string;
  meetingUri: string;
  meetingCode?: string;
  organizerUserId: string;
  recordingEnabled: boolean;
  recordingConfigurationStatus: MeetRecordingStatus;
  status?: MeetSpaceStatus;
  config?: Prisma.InputJsonValue;
}) => {
  return prisma.googleMeetSpace.upsert({
    where: { classSessionId: data.classSessionId },
    update: {
      spaceName: data.spaceName,
      meetingUri: data.meetingUri,
      meetingCode: data.meetingCode,
      recordingEnabled: data.recordingEnabled,
      recordingConfigurationStatus: data.recordingConfigurationStatus,
      status: data.status || "ACTIVE",
      config: data.config,
    },
    create: {
      classSessionId: data.classSessionId,
      spaceName: data.spaceName,
      meetingUri: data.meetingUri,
      meetingCode: data.meetingCode,
      organizerUserId: data.organizerUserId,
      recordingEnabled: data.recordingEnabled,
      recordingConfigurationStatus: data.recordingConfigurationStatus,
      status: data.status || "ACTIVE",
      config: data.config,
    },
  });
};

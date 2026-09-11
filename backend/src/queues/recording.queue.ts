import { createQueue, createWorker } from "./queue";
import { deleteFile } from "../integrations/storage/storage.client";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { getAuthenticatedOAuth2Client } from "../integrations/google/google.auth.client";
import { deleteDriveFile } from "../integrations/google/google.drive.client";
import { getGoogleHttpStatus } from "../integrations/google/google-error.util";
import { createAuditLog } from "../utils/audit-log.util";

export interface RecordingJob {
  recordingId: string;
}

export const recordingQueue = createQueue("recording");

export const processRecordingCleanup = async (job: {
  data: RecordingJob;
  attemptsMade: number;
  opts: import("bullmq").JobsOptions;
}): Promise<void> => {
    const recording = await prisma.recording.findUnique({
      where: { id: job.data.recordingId },
      include: {
        classSession: {
          include: {
            batch: { select: { instituteId: true } },
            googleMeetSpace: { select: { organizerUserId: true } },
          },
        },
      },
    });

    if (!recording || recording.recordingStatus === "DELETED") {
      return;
    }

    let alreadyDeleted = false;
    let connectionUserId: string | null = null;
    try {
      if (
        recording.storageProvider === "GOOGLE_DRIVE" &&
        recording.googleDriveFileId
      ) {
        const organizerUserId =
          recording.classSession.googleMeetSpace?.organizerUserId;
        const connection = organizerUserId
          ? await prisma.googleWorkspaceConnection.findUnique({
              where: { userId: organizerUserId },
            })
          : await prisma.googleWorkspaceConnection.findFirst({
              where: {
                instituteId: recording.classSession.batch.instituteId,
                status: "CONNECTED",
              },
              orderBy: { updatedAt: "desc" },
            });

        if (!connection || connection.status !== "CONNECTED") {
          throw new Error(
            "Google Workspace connection is unavailable for recording deletion"
          );
        }
        connectionUserId = connection.userId;

        const authClient = getAuthenticatedOAuth2Client(
          connection.encryptedRefreshToken
        );
        const result = await deleteDriveFile(
          authClient,
          recording.googleDriveFileId
        );
        alreadyDeleted = result.alreadyDeleted;
      } else if (recording.storageKey) {
        await deleteFile(recording.storageKey);
      }

      const deletedAt = new Date();
      await prisma.recording.update({
        where: { id: recording.id },
        data: {
          recordingStatus: "DELETED",
          status: "INACTIVE",
          deletedAt,
          lastSyncError: null,
        },
      });

      await createAuditLog({
        userId:
          recording.classSession.googleMeetSpace?.organizerUserId || null,
        instituteId: recording.classSession.batch.instituteId,
        action:
          recording.storageProvider === "GOOGLE_DRIVE"
            ? "GOOGLE_DRIVE_RECORDING_DELETED"
            : "CLASS_RECORDING_STORAGE_DELETED",
        entityType: "Recording",
        entityId: recording.id,
        oldData: { recordingStatus: recording.recordingStatus },
        newData: {
          recordingStatus: "DELETED",
          deletedAt,
          alreadyDeleted,
        },
      });

      logger.info(
        { recordingId: recording.id, alreadyDeleted },
        "[recording] Recording cleanup completed"
      );
    } catch (error: unknown) {
      const status = getGoogleHttpStatus(error);
      await prisma.recording.updateMany({
        where: {
          id: recording.id,
          recordingStatus: { not: "DELETED" },
        },
        data: {
          lastSyncError:
            error instanceof Error
              ? error.message
              : "Recording cleanup failed and will be retried.",
        },
      });
      if (status === 401 || status === 403) {
        if (connectionUserId) {
          await prisma.googleWorkspaceConnection.updateMany({
            where: { userId: connectionUserId },
            data: { status: "REAUTH_REQUIRED" },
          });
        }
      }
      logger.error(
        { status, recordingId: recording.id },
        "[recording] Recording cleanup failed; row left for retry"
      );
      throw error;
    }
};

export const recordingWorker = createWorker<RecordingJob>(
  "recording",
  processRecordingCleanup,
  { concurrency: 2, peakConcurrency: 1, pauseInPeakMode: true }
);

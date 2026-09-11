import crypto from "crypto";
import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { createAuditLog } from "../../utils/audit-log.util";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import * as googleAuth from "../../integrations/google/google.auth.client";
import * as googleMeet from "../../integrations/google/google.meet.client";
import * as googleDrive from "../../integrations/google/google.drive.client";
import * as repo from "./google-workspace.repository";
import type { AuthUser } from "../auth/auth.types";
import type {
  GoogleConnectionStatusDTO,
  CreateMeetSpaceDTO,
  GoogleStatePayload,
} from "./google-workspace.types";
import { getRecordingRetentionMs } from "../recordings/recording-retention.service";
import { hasBranchAccess } from "../../utils/branch-isolation.util";
import { NotificationService } from "../notifications/notification.service";

/**
 * Creates a signed OAuth state token to protect against CSRF attacks
 */
export const createSignedStateToken = (userId: string, instituteId: string): string => {
  const payload: GoogleStatePayload = {
    userId,
    instituteId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const jsonStr = JSON.stringify(payload);
  const hmac = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(jsonStr)
    .digest("hex");

  return Buffer.from(`${jsonStr}::${hmac}`).toString("base64url");
};

/**
 * Verifies and decodes the OAuth state token
 */
export const verifyStateToken = (stateToken: string): GoogleStatePayload => {
  try {
    const raw = Buffer.from(stateToken, "base64url").toString("utf8");
    const [jsonStr, hmac] = raw.split("::");

    if (!jsonStr || !hmac) {
      throw new Error("Malformed state token");
    }

    const expectedHmac = crypto
      .createHmac("sha256", env.JWT_SECRET)
      .update(jsonStr)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      throw new Error("Invalid state signature");
    }

    const payload: GoogleStatePayload = JSON.parse(jsonStr);

    // State expiration: 15 minutes
    if (Date.now() - payload.timestamp > 15 * 60 * 1000) {
      throw new Error("Expired state token");
    }

    return payload;
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, "Invalid OAuth state token provided");
    throw new AppError("Invalid or expired OAuth state parameter. Please initiate connection again.", 400);
  }
};

/**
 * Generates OAuth connect URL for authorized user
 */
export const getConnectUrl = async (currentUser: AuthUser): Promise<{ authUrl: string }> => {
  const state = createSignedStateToken(currentUser.id || currentUser.userId!, currentUser.instituteId);
  const authUrl = googleAuth.generateAuthorizationUrl(state);
  return { authUrl };
};

/**
 * Handles OAuth callback from Google
 */
export const handleOAuthCallback = async (
  code: string,
  state: string
): Promise<{ success: boolean; email: string }> => {
  const statePayload = verifyStateToken(state);

  const { tokens, userProfile } = await googleAuth.exchangeAuthorizationCode(code);

  if (!tokens.refreshToken) {
    // If no new refresh token returned, verify if we already have one stored
    const existing = await repo.findConnectionByUserId(statePayload.userId);
    if (!existing) {
      throw new AppError(
        "Google did not provide an offline refresh token. Please revoke Aadya access in your Google Account security settings and reconnect.",
        400
      );
    }
  }

  let encryptedRefreshToken: string;
  if (tokens.refreshToken) {
    encryptedRefreshToken = googleAuth.encryptRefreshToken(tokens.refreshToken);
  } else {
    const existing = await repo.findConnectionByUserId(statePayload.userId);
    encryptedRefreshToken = existing!.encryptedRefreshToken;
  }

  const connection = await repo.upsertConnection({
    userId: statePayload.userId,
    instituteId: statePayload.instituteId,
    googleAccountId: userProfile.id,
    email: userProfile.email,
    encryptedRefreshToken,
    scopes: tokens.scopes,
    status: "CONNECTED",
  });

  await createAuditLog({
    userId: statePayload.userId,
    instituteId: statePayload.instituteId,
    action: "GOOGLE_WORKSPACE_CONNECTED",
    entityType: "GoogleWorkspaceConnection",
    entityId: connection.id,
    newData: {
      email: userProfile.email,
      scopes: tokens.scopes,
    },
  });

  try {
    const { syncGoogleWorkspaceIntegration } = await import(
      "../integrations/integration.service"
    );
    await syncGoogleWorkspaceIntegration({
      instituteId: statePayload.instituteId,
      userId: statePayload.userId,
      email: userProfile.email,
      scopes: tokens.scopes,
      connected: true,
    });
  } catch {
    // Non-blocking catalog sync
  }

  return {
    success: true,
    email: userProfile.email,
  };
};

/**
 * Returns safe Google Workspace connection status for current user / institute
 */
export const getConnectionStatus = async (
  currentUser: AuthUser
): Promise<GoogleConnectionStatusDTO> => {
  const userId = currentUser.id || currentUser.userId!;
  let conn = await repo.findConnectionByUserId(userId);

  // Fallback: If current user is faculty/manager without direct connection, check institute connection
  if (!conn) {
    conn = await repo.findConnectionByInstituteId(currentUser.instituteId);
  }

  if (!conn) {
    return {
      isConnected: false,
      scopes: [],
      status: "DISCONNECTED",
    };
  }

  return {
    isConnected: conn.status === "CONNECTED",
    email: conn.email,
    googleAccountId: conn.googleAccountId,
    scopes: conn.scopes,
    status: conn.status,
    lastSyncedAt: conn.lastSyncedAt,
    connectedAt: conn.createdAt,
  };
};

/**
 * Disconnects the user's Google Workspace integration
 */
export const disconnectGoogleWorkspace = async (
  currentUser: AuthUser
): Promise<{ success: boolean; message: string }> => {
  const userId = currentUser.id || currentUser.userId!;
  const conn = await repo.findConnectionByUserId(userId);

  if (!conn) {
    throw new AppError("No active Google Workspace connection found for your account", 404);
  }

  await googleAuth.revokeGoogleToken(conn.encryptedRefreshToken);
  await repo.deleteConnectionByUserId(userId);

  await createAuditLog({
    userId,
    instituteId: currentUser.instituteId,
    action: "GOOGLE_WORKSPACE_DISCONNECTED",
    entityType: "GoogleWorkspaceConnection",
    entityId: conn.id,
    oldData: { email: conn.email },
  });

  try {
    const { syncGoogleWorkspaceIntegration } = await import(
      "../integrations/integration.service"
    );
    await syncGoogleWorkspaceIntegration({
      instituteId: currentUser.instituteId,
      userId,
      email: conn.email,
      scopes: conn.scopes || [],
      connected: false,
    });
  } catch {
    // Non-blocking catalog sync
  }

  return {
    success: true,
    message: "Google Workspace account disconnected successfully",
  };
};

/**
 * Resolves an active authenticated Google OAuth2Client for the session or institute
 */
export const resolveGoogleAuthClient = async (
  currentUser: AuthUser,
  organizerUserId?: string
) => {
  let conn: any = null;

  if (organizerUserId) {
    conn = await repo.findConnectionByUserId(organizerUserId);
  }

  if (!conn) {
    const userId = currentUser.id || currentUser.userId!;
    conn = await repo.findConnectionByUserId(userId);
  }

  if (!conn) {
    conn = await repo.findConnectionByInstituteId(currentUser.instituteId);
  }

  if (!conn || conn.status !== "CONNECTED") {
    throw new AppError(
      "Google Workspace authorization is required. Please connect your Google Workspace account first.",
      400
    );
  }

  try {
    const authClient = googleAuth.getAuthenticatedOAuth2Client(conn.encryptedRefreshToken);
    return { authClient, connection: conn };
  } catch (err) {
    await repo.updateConnectionStatus(conn.userId, "REAUTH_REQUIRED");
    throw new AppError(
      "Google Workspace authorization has expired or was revoked. Re-authorization required.",
      401
    );
  }
};

/**
 * Creates a Google Meet space for a scheduled class session
 */
export const createMeetSpaceForSession = async (
  currentUser: AuthUser,
  classSessionId: string,
  dto: CreateMeetSpaceDTO = { classSessionId }
) => {
  const session = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      batch: true,
      faculty: true,
      googleMeetSpace: true,
    },
  });

  if (!session || session.batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Class session not found", 404);
  }

  const isFaculty = currentUser.roles.includes("FACULTY");
  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");
  const isCenterManager = currentUser.roles.includes("CENTER_MANAGER");

  let isAssignedFaculty = false;
  if (isFaculty) {
    const faculty = await prisma.faculty.findFirst({ where: { userId: currentUser.id || currentUser.userId! } });
    if (faculty && faculty.id === session.facultyId) {
      isAssignedFaculty = true;
    }
  }

  // Branch isolation check (applies to users who are not admin and not the assigned faculty)
  if (!isAdmin && !isAssignedFaculty) {
    const branchAllowed = hasBranchAccess(
      {
        id: currentUser.id || currentUser.userId!,
        userId: currentUser.userId || currentUser.id!,
        instituteId: currentUser.instituteId,
        branchId: currentUser.branchId,
        allowedBranchIds: currentUser.allowedBranchIds,
        roles: currentUser.roles,
        permissions: [],
        name: "",
      },
      session.branchId
    );
    if (!branchAllowed) {
      throw new AppError("Class session not found", 404);
    }
  }

  // Faculty assignment check
  if (isFaculty && !isAdmin && !isCenterManager && !isAssignedFaculty) {
    throw new AppError("You can only create Google Meet spaces for your assigned class sessions", 403);
  }

  const organizerUserId = currentUser.id || currentUser.userId!;
  const { authClient, connection } = await resolveGoogleAuthClient(currentUser, organizerUserId);

  const meetResult = await googleMeet.createGoogleMeetSpace(authClient, {
    accessType: dto.accessType || "TRUSTED",
    enableAutomaticRecording: dto.enableAutomaticRecording ?? true,
  });

  const space = await repo.upsertMeetSpace({
    classSessionId: session.id,
    spaceName: meetResult.name,
    meetingUri: meetResult.meetingUri,
    meetingCode: meetResult.meetingCode,
    organizerUserId: connection.userId,
    recordingEnabled: dto.enableAutomaticRecording ?? true,
    recordingConfigurationStatus: meetResult.recordingConfigurationStatus,
    status: "ACTIVE",
    config: meetResult.rawConfig,
  });

  // Update class session with online meeting URL
  await prisma.classSession.update({
    where: { id: session.id },
    data: {
      mode: "ONLINE",
      meetingUrl: meetResult.meetingUri,
    },
  });

  await createAuditLog({
    userId: organizerUserId,
    instituteId: currentUser.instituteId,
    action: "GOOGLE_MEET_CREATED",
    entityType: "GoogleMeetSpace",
    entityId: space.id,
    newData: {
      classSessionId: session.id,
      meetingUri: meetResult.meetingUri,
      spaceName: meetResult.name,
      recordingEnabled: space.recordingEnabled,
    },
  });

  return {
    meetSpace: space,
    meetingUri: meetResult.meetingUri,
    meetingCode: meetResult.meetingCode,
    recordingEnabled: space.recordingEnabled,
    recordingConfigurationStatus: space.recordingConfigurationStatus,
  };
};

/**
 * Synchronizes recording artifacts from Google Meet & Drive for a class session
 */
export const syncSessionRecordings = async (
  currentUser: AuthUser,
  classSessionId: string
) => {
  const session = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      batch: true,
      googleMeetSpace: true,
      recording: true,
    },
  });

  if (!session || session.batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Class session not found", 404);
  }

  const isFaculty = currentUser.roles.includes("FACULTY");
  const isAdmin = currentUser.roles.includes("ADMIN") || currentUser.roles.includes("SUPER_ADMIN");

  let isAssignedFaculty = false;
  if (isFaculty) {
    const faculty = await prisma.faculty.findFirst({ where: { userId: currentUser.id || currentUser.userId! } });
    if (faculty && faculty.id === session.facultyId) {
      isAssignedFaculty = true;
    }
  }

  // Branch isolation
  if (!isAdmin && !isAssignedFaculty) {
    const branchAllowed = hasBranchAccess(
      {
        id: currentUser.id || currentUser.userId!,
        userId: currentUser.userId || currentUser.id!,
        instituteId: currentUser.instituteId,
        branchId: currentUser.branchId,
        allowedBranchIds: currentUser.allowedBranchIds,
        roles: currentUser.roles,
        permissions: [],
        name: "",
      },
      session.branchId
    );
    if (!branchAllowed) {
      throw new AppError("Class session not found", 404);
    }
  }

  if (!session.googleMeetSpace) {
    throw new AppError("No Google Meet space is linked to this class session", 400);
  }

  const syncTime = new Date();
  const userId = currentUser.id || currentUser.userId!;

  try {
    const { authClient } = await resolveGoogleAuthClient(
      currentUser,
      session.googleMeetSpace.organizerUserId
    );
    const retentionMs = await getRecordingRetentionMs(currentUser.instituteId);
    const conferenceRecords = await googleMeet.listConferenceRecords(
      authClient,
      session.googleMeetSpace.spaceName
    );

    let syncedRecordingsCount = 0;
    let latestRecording = session.recording;

    for (const conf of conferenceRecords) {
      const recordings = await googleMeet.listConferenceRecordings(
        authClient,
        conf.name
      );

      for (const rec of recordings) {
        const googleRecordingId = rec.name;
        const driveFileId = rec.driveDestination?.file
          ? googleDrive.normalizeDriveFileId(rec.driveDestination.file)
          : null;
        const conflictingRecording = driveFileId
          ? await prisma.recording.findFirst({
              where: {
                googleDriveFileId: driveFileId,
                classSessionId: { not: session.id },
              },
              select: { id: true },
            })
          : null;

        if (conflictingRecording) {
          logger.warn(
            {
              classSessionId: session.id,
              recordingId: conflictingRecording.id,
            },
            "Skipped duplicate Google Drive recording association"
          );
          continue;
        }

        const driveMeta = driveFileId
          ? await googleDrive.getDriveFileMetadata(authClient, driveFileId)
          : null;
        const existing = latestRecording;
        const wasAvailable =
          existing?.recordingStatus === "AVAILABLE" ||
          existing?.recordingStatus === "READY";
        const wasDeleted = existing?.recordingStatus === "DELETED";
        const recordingOrigin = driveMeta?.createdTime
          ? new Date(driveMeta.createdTime)
          : rec.startTime
            ? new Date(rec.startTime)
            : session.actualStartTime || session.scheduledDate;
        const expiresAt =
          existing?.expiresAt ||
          new Date(recordingOrigin.getTime() + retentionMs);
        const isExpired = expiresAt.getTime() <= syncTime.getTime();
        const driveFileDeleted =
          Boolean(driveFileId) && !driveMeta && existing?.googleDriveFileId === driveFileId;

        let recordingStatus = "PROCESSING";
        if (wasDeleted || driveFileDeleted) {
          recordingStatus = "DELETED";
        } else if (isExpired && wasAvailable) {
          recordingStatus = "EXPIRED";
        } else if (rec.state === "FILE_GENERATED" && driveFileId && driveMeta) {
          recordingStatus = "AVAILABLE";
        } else if (rec.state === "STARTED") {
          recordingStatus = "RECORDING";
        }

        const startedAt = rec.startTime
          ? new Date(rec.startTime)
          : session.actualStartTime || session.scheduledDate;
        const endedAt = rec.endTime
          ? new Date(rec.endTime)
          : session.actualEndTime || undefined;
        const duration = driveMeta?.videoMediaMetadata?.durationMillis
          ? Math.round(
              Number(driveMeta.videoMediaMetadata.durationMillis) / 60000
            )
          : undefined;

        const upserted = await prisma.recording.upsert({
          where: { classSessionId: session.id },
          update: {
            name: driveMeta?.name,
            googleConferenceRecordId: conf.name,
            googleRecordingId,
            googleDriveFileId: driveFileId || undefined,
            playbackUrl: driveMeta?.webViewLink || undefined,
            recordingStatus,
            storageProvider: "GOOGLE_DRIVE",
            duration,
            startedAt,
            endedAt,
            expiresAt,
            metadata: driveMeta ? (driveMeta as any) : undefined,
            lastSyncAt: syncTime,
            lastSyncError: null,
            deletedAt:
              recordingStatus === "DELETED"
                ? existing?.deletedAt || syncTime
                : undefined,
            status:
              recordingStatus === "DELETED" ? "INACTIVE" : existing?.status || "ACTIVE",
          },
          create: {
            classSessionId: session.id,
            name: driveMeta?.name,
            googleConferenceRecordId: conf.name,
            googleRecordingId,
            googleDriveFileId: driveFileId || undefined,
            playbackUrl: driveMeta?.webViewLink || undefined,
            recordingStatus,
            storageProvider: "GOOGLE_DRIVE",
            duration,
            startedAt,
            endedAt,
            expiresAt,
            metadata: driveMeta ? (driveMeta as any) : undefined,
            lastSyncAt: syncTime,
            lastSyncError: null,
            deletedAt: recordingStatus === "DELETED" ? syncTime : undefined,
            status: recordingStatus === "DELETED" ? "INACTIVE" : "ACTIVE",
          },
        });

        latestRecording = upserted;
        syncedRecordingsCount++;

        if (recordingStatus === "AVAILABLE" && !wasAvailable) {
          setImmediate(() => {
            void triggerRecordingAvailableNotification(upserted.id);
            void triggerFacultyRecordingAvailableNotification(upserted.id);
          });
        }

        await createAuditLog({
          userId,
          instituteId: currentUser.instituteId,
          action: "GOOGLE_MEET_RECORDING_SYNCED",
          entityType: "Recording",
          entityId: upserted.id,
          newData: {
            classSessionId: session.id,
            googleRecordingId,
            recordingStatus,
          },
        });
      }
    }

    if (syncedRecordingsCount === 0 && session.recording) {
      latestRecording = await prisma.recording.update({
        where: { id: session.recording.id },
        data: { lastSyncAt: syncTime, lastSyncError: null },
      });
    }

    return {
      syncedCount: syncedRecordingsCount,
      recording: latestRecording,
      message:
        syncedRecordingsCount > 0
          ? `Successfully synchronized ${syncedRecordingsCount} recording artifact(s) from Google Meet.`
          : "No new recording artifacts found in Google Meet for this space yet.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof AppError
        ? error.message
        : "Google recording synchronization failed.";
    await prisma.recording.updateMany({
      where: { classSessionId: session.id },
      data: { lastSyncAt: syncTime, lastSyncError: message },
    });

    if (
      error instanceof AppError &&
      (error.statusCode === 401 || error.statusCode === 403)
    ) {
      await repo.updateConnectionStatus(
        session.googleMeetSpace.organizerUserId,
        "REAUTH_REQUIRED"
      );
    }

    await createAuditLog({
      userId,
      instituteId: currentUser.instituteId,
      action: "GOOGLE_MEET_RECORDING_SYNC_FAILED",
      entityType: "ClassSession",
      entityId: session.id,
      newData: { error: message },
    });
    throw error;
  }
};

/**
 * Sends RECORDING_AVAILABLE WhatsApp notification to enrolled batch students
 */
const triggerRecordingAvailableNotification = async (recordingId: string) => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        classSession: {
          include: {
            batch: {
              include: {
                enrollments: {
                  where: { status: "ACTIVE" },
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!recording) return;

    const session = recording.classSession;
    const expiryDate = recording.expiresAt.toISOString().split("T")[0];

    for (const enrollment of session.batch.enrollments) {
      const student = enrollment.student;
      if (!student?.user?.phone) continue;

      await triggerNotification({
        instituteId: session.batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.RECORDING_AVAILABLE,
        idempotencyKey: buildIdempotencyKey.RECORDING_AVAILABLE(student.id, recording.id),
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: session.batch.name ?? "Batch",
          session_title: session.title ?? "Class session",
          expiry_date: expiryDate,
        },
        metadata: {
          recordingId: recording.id,
          classSessionId: session.id,
          batchId: session.batchId,
        },
      });
    }
  } catch (err) {
    logger.error({ err, recordingId }, "Failed to send recording notifications");
  }
};

/**
 * In-app faculty notification once a recording becomes AVAILABLE (idempotent by recordingId).
 */
const triggerFacultyRecordingAvailableNotification = async (recordingId: string) => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        classSession: {
          include: {
            faculty: { select: { userId: true } },
            batch: { select: { instituteId: true, name: true, id: true } },
          },
        },
      },
    });

    if (!recording) return;

    const session = recording.classSession;
    const facultyUserId = session.faculty?.userId;
    if (!facultyUserId) return;

    const existing = await prisma.notification.findFirst({
      where: {
        userId: facultyUserId,
        instituteId: session.batch.instituteId,
        metadata: {
          path: ["recordingId"],
          equals: recordingId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    const sessionTitle = session.title || "Class session";
    const batchName = session.batch.name || "batch";

    await NotificationService.createNotification({
      userId: facultyUserId,
      instituteId: session.batch.instituteId,
      branchId: session.branchId,
      title: "Recording ready",
      message: `The recording for "${sessionTitle}" (${batchName}) is now available.`,
      type: "CLASS_SESSION",
      module: "recordings",
      link: "/faculty/recordings",
      metadata: {
        recordingId: recording.id,
        classSessionId: session.id,
        module: "recordings",
        targetRole: "FACULTY",
        event: "RECORDING_AVAILABLE",
      },
    });
  } catch (err) {
    logger.error(
      { err, recordingId },
      "Failed to send faculty recording-available notification"
    );
  }
};

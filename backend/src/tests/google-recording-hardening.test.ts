import { describe, test } from "node:test";
import assert from "node:assert";
import { DelayedError } from "bullmq";
import { google } from "googleapis";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { encryptRefreshToken } from "../integrations/google/google.auth.client";
import {
  createMeetSpaceForSession,
  resolveRecordingDurationMinutes,
  syncSessionRecordings,
} from "../modules/google-workspace/google-workspace.service";
import { classSessionRepository } from "../modules/class-sessions/class-session.repository";
import { classSessionService } from "../modules/class-sessions/class-session.service";
import { NotificationService } from "../modules/notifications/notification.service";
import {
  getRecordingAccess,
  getRecordingById,
} from "../modules/recordings/recording.service";
import {
  GOOGLE_RECORDING_REPOLL_DELAY_MS,
  googleRecordingQueue,
  processGoogleRecordingSync,
} from "../queues/google-recording.queue";
import { processRecordingCleanup } from "../queues/recording.queue";

const DAY_MS = 24 * 60 * 60 * 1000;

const adminUser = {
  id: "admin-user",
  userId: "admin-user",
  instituteId: "institute-1",
  branchId: null,
  roles: ["ADMIN"],
  permissions: ["recording.read", "google_meet.create"],
};

const studentUser = {
  id: "student-user",
  userId: "student-user",
  email: "student@example.com",
  instituteId: "institute-1",
  branchId: "branch-1",
  roles: ["STUDENT"],
  permissions: ["recording.read"],
};

const connection = {
  id: "google-connection-1",
  userId: adminUser.id,
  instituteId: adminUser.instituteId,
  encryptedRefreshToken: encryptRefreshToken("test-refresh-token"),
  status: "CONNECTED",
};

const replaceMethod = (
  t: any,
  target: Record<string, any>,
  methodName: string,
  implementation: (...args: any[]) => any
) => {
  const original = target[methodName];
  target[methodName] = implementation;
  t.after(() => {
    target[methodName] = original;
  });
};

const session = (recording: any = null) => ({
  id: "session-1",
  title: "Google Meet class",
  batchId: "batch-1",
  branchId: "branch-1",
  facultyId: "faculty-1",
  scheduledDate: new Date("2026-09-01T09:00:00.000Z"),
  actualStartTime: null,
  actualEndTime: null,
  batch: {
    id: "batch-1",
    instituteId: adminUser.instituteId,
    branchId: "branch-1",
  },
  faculty: { id: "faculty-1" },
  googleMeetSpace: {
    id: "meet-space-1",
    spaceName: "spaces/test-space",
    organizerUserId: adminUser.id,
  },
  recording,
});

const installGoogleDiscoveryMock = (
  t: any,
  options: {
    driveFileId?: string;
    googleError?: unknown;
    durationMillis?: string | null;
    recordingStartTime?: string;
    recordingEndTime?: string;
    omitDriveDuration?: boolean;
  } = {}
) => {
  const driveFileId = options.driveFileId ?? "drive-file-123456";
  const recordingStartTime = options.recordingStartTime ?? "2026-09-01T09:00:00.000Z";
  const recordingEndTime = options.recordingEndTime ?? "2026-09-01T10:00:00.000Z";
  const durationMillis =
    options.omitDriveDuration
      ? undefined
      : options.durationMillis === null
        ? undefined
        : (options.durationMillis ?? "3600000");

  t.mock.method(google as any, "meet", () => ({
    conferenceRecords: {
      list: async () => {
        if (options.googleError) throw options.googleError;
        return {
          data: {
            conferenceRecords: [
              {
                name: "conferenceRecords/conf-1",
                space: "spaces/test-space",
                startTime: recordingStartTime,
                endTime: recordingEndTime,
              },
            ],
          },
        };
      },
      recordings: {
        list: async () => ({
          data: {
            recordings: [
              {
                name: "conferenceRecords/conf-1/recordings/rec-1",
                state: "FILE_GENERATED",
                startTime: recordingStartTime,
                endTime: recordingEndTime,
                driveDestination: { file: `files/${driveFileId}` },
              },
            ],
          },
        }),
      },
    },
  }));

  t.mock.method(google as any, "drive", () => ({
    files: {
      get: async () => ({
        data: {
          id: driveFileId,
          name: "Class recording.mp4",
          mimeType: "video/mp4",
          webViewLink: `https://drive.google.com/file/d/${driveFileId}/view`,
          createdTime: recordingEndTime,
          ...(durationMillis
            ? { videoMediaMetadata: { durationMillis } }
            : {}),
        },
      }),
      list: async () => ({ data: { files: [] } }),
    },
  }));
};

const installSyncDatabaseMocks = (
  t: any,
  getSession: () => ReturnType<typeof session>
) => {
  replaceMethod(t, prisma.classSession as any, "findUnique", async () => getSession());
  replaceMethod(t, prisma.googleWorkspaceConnection as any, "findUnique", async () => connection);
  replaceMethod(t, prisma.googleWorkspaceConnection as any, "findFirst", async () => null);
  replaceMethod(t, prisma.integration as any, "findUnique", async () => null);
  replaceMethod(t, prisma.activityLog as any, "create", async ({ data }: any) => data);
};

describe("Google recording retention and sync hardening", { concurrency: false }, () => {
  test("retention is seven days from first AVAILABLE and re-sync does not extend it", async (t) => {
    let storedRecording: any = null;
    const upserts: any[] = [];

    installGoogleDiscoveryMock(t);
    installSyncDatabaseMocks(t, () => session(storedRecording));
    replaceMethod(t, prisma.recording as any, "findFirst", async () => null);
    replaceMethod(t, prisma.recording as any, "findUnique", async () => null);
    replaceMethod(t, prisma.recording as any, "upsert", async ({ update, create }: any) => {
      const data = storedRecording ? update : create;
      upserts.push(data);
      storedRecording = {
        id: "recording-1",
        status: "ACTIVE",
        ...storedRecording,
        ...data,
      };
      return storedRecording;
    });

    await syncSessionRecordings(adminUser as any, "session-1");
    await new Promise<void>((resolve) => setImmediate(resolve));
    const firstExpiresAt = storedRecording.expiresAt as Date;

    assert.strictEqual(storedRecording.recordingStatus, "AVAILABLE");
    assert.strictEqual(
      firstExpiresAt.toISOString(),
      new Date("2026-09-08T10:00:00.000Z").toISOString()
    );

    await syncSessionRecordings(adminUser as any, "session-1");

    assert.strictEqual(upserts.length, 2);
    assert.strictEqual(
      (storedRecording.expiresAt as Date).getTime(),
      firstExpiresAt.getTime(),
      "re-sync must preserve the first expiry"
    );
  });

  test("duplicate Drive file ID associated to another session is skipped", async (t) => {
    let upsertCalls = 0;

    installGoogleDiscoveryMock(t, { driveFileId: "duplicate-drive-file-123" });
    installSyncDatabaseMocks(t, () => session());
    replaceMethod(t, prisma.recording as any, "findFirst", async () => ({
      id: "recording-owned-by-other-session",
    }));
    replaceMethod(t, prisma.recording as any, "upsert", async () => {
      upsertCalls++;
      return {};
    });

    const result = await syncSessionRecordings(adminUser as any, "session-1");

    assert.strictEqual(result.syncedCount, 0);
    assert.strictEqual(upsertCalls, 0);
  });

  test("Google 401 marks the connection REAUTH_REQUIRED and exposes no token", async (t) => {
    const leakedSecret = "ya29.super-secret-access-token";
    const connectionStatuses: string[] = [];
    const auditPayloads: unknown[] = [];
    const logPayloads: unknown[] = [];

    installGoogleDiscoveryMock(t, {
      googleError: {
        response: { status: 401 },
        config: { headers: { Authorization: `Bearer ${leakedSecret}` } },
      },
    });
    replaceMethod(t, prisma.classSession as any, "findUnique", async () => session());
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findUnique", async () => connection);
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findFirst", async () => null);
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "update", async ({ data }: any) => {
      connectionStatuses.push(data.status);
      return { ...connection, ...data };
    });
    replaceMethod(t, prisma.integration as any, "findUnique", async () => null);
    replaceMethod(t, prisma.recording as any, "updateMany", async () => ({ count: 0 }));
    replaceMethod(t, prisma.activityLog as any, "create", async ({ data }: any) => {
      auditPayloads.push(data);
      return data;
    });
    t.mock.method(logger as any, "warn", (...args: unknown[]) => {
      logPayloads.push(args);
    });

    await assert.rejects(
      () => syncSessionRecordings(adminUser as any, "session-1"),
      (error: any) => {
        assert.strictEqual(error.statusCode, 401);
        assert.strictEqual(error.errorCode, "GOOGLE_NOT_CONNECTED");
        assert.ok(!JSON.stringify(error).includes(leakedSecret));
        return true;
      }
    );

    assert.ok(connectionStatuses.includes("REAUTH_REQUIRED"));
    assert.ok(!JSON.stringify(auditPayloads).includes(leakedSecret));
    assert.ok(!JSON.stringify(logPayloads).includes(leakedSecret));
  });
});

describe("Google recording access controls", { concurrency: false }, () => {
  const recordingFixture = (overrides: Record<string, unknown> = {}) => ({
    id: "recording-1",
    classSessionId: "session-1",
    playbackUrl: "https://drive.google.com/file/d/private-file/view",
    googleDriveFileId: "private-file-12345",
    storageProvider: "GOOGLE_DRIVE",
    recordingStatus: "AVAILABLE",
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + DAY_MS),
    classSession: {
      id: "session-1",
      facultyId: "faculty-1",
      batch: {
        id: "batch-2",
        instituteId: "institute-1",
        branchId: "branch-1",
        enrollments: [{ studentId: "another-student" }],
      },
    },
    ...overrides,
  });

  test("student IDOR against another batch returns 404", async (t) => {
    replaceMethod(t, prisma.recording as any, "findUnique", async () => recordingFixture());
    replaceMethod(t, prisma.student as any, "findFirst", async () => ({
      id: "student-1",
    }));

    await assert.rejects(
      () => getRecordingById(studentUser as any, "recording-1"),
      (error: any) => {
        assert.strictEqual(error.statusCode, 404);
        assert.strictEqual(error.message, "Recording not found");
        return true;
      }
    );
  });

  test("expired access is denied even while playbackUrl remains stored", async (t) => {
    const expired = recordingFixture({
      expiresAt: new Date(Date.now() - DAY_MS),
    });
    let markedExpired = false;

    replaceMethod(t, prisma.recording as any, "findUnique", async () => expired);
    replaceMethod(t, prisma.recording as any, "update", async ({ data }: any) => {
      markedExpired = data.recordingStatus === "EXPIRED";
      return { ...expired, ...data };
    });

    await assert.rejects(
      () => getRecordingAccess(adminUser as any, expired.id),
      (error: any) => {
        assert.strictEqual(error.statusCode, 410);
        assert.strictEqual(error.errorCode, "RECORDING_EXPIRED");
        assert.ok(!error.message.includes(expired.playbackUrl));
        return true;
      }
    );

    assert.strictEqual(expired.playbackUrl.includes("drive.google.com"), true);
    assert.strictEqual(markedExpired, true);
  });

  test("assigned faculty can load recording when JWT branch differs from batch branch", async (t) => {
    const facultyUser = {
      id: "faculty-user",
      userId: "faculty-user",
      instituteId: "institute-1",
      branchId: "branch-other",
      roles: ["FACULTY"],
      permissions: ["recording.read"],
    };

    replaceMethod(t, prisma.recording as any, "findUnique", async () =>
      recordingFixture({
        recordingStatus: "PENDING",
        classSession: {
          id: "session-1",
          facultyId: "faculty-1",
          batch: {
            id: "batch-1",
            instituteId: "institute-1",
            branchId: "branch-1",
            enrollments: [],
          },
        },
      })
    );
    replaceMethod(t, prisma.faculty as any, "findFirst", async () => ({
      id: "faculty-1",
    }));

    const recording = await getRecordingById(facultyUser as any, "recording-1");
    assert.strictEqual(recording.id, "recording-1");
    assert.strictEqual(recording.classSessionId, "session-1");
  });
});

describe("Recording cleanup hardening", { concurrency: false }, () => {
  test("cleanup is idempotent and a second run no-ops after DELETED", async (t) => {
    const recording: any = {
      id: "recording-cleanup-1",
      recordingStatus: "EXPIRED",
      status: "ACTIVE",
      storageProvider: "LOCAL",
      storageKey: null,
      googleDriveFileId: null,
      classSession: {
        googleMeetSpace: null,
        batch: { instituteId: "institute-1" },
      },
    };
    let updateCalls = 0;

    replaceMethod(t, prisma.recording as any, "findUnique", async () => recording);
    replaceMethod(t, prisma.recording as any, "update", async ({ data }: any) => {
      updateCalls++;
      Object.assign(recording, data);
      return recording;
    });
    replaceMethod(t, prisma.activityLog as any, "create", async ({ data }: any) => data);

    const job = {
      data: { recordingId: recording.id },
      attemptsMade: 0,
      opts: {},
    };
    await processRecordingCleanup(job);
    await processRecordingCleanup(job);

    assert.strictEqual(recording.recordingStatus, "DELETED");
    assert.strictEqual(recording.status, "INACTIVE");
    assert.ok(recording.deletedAt instanceof Date);
    assert.strictEqual(updateCalls, 1);
  });

  test("max retention window uses institute override over env default", async (t) => {
    const { getMaxRecordingRetentionMs } = await import(
      "../modules/recordings/recording-retention.service"
    );

    replaceMethod(t, prisma.integration as any, "findMany", async () => [
      { configuration: { recordingRetentionDays: 14 } },
      { configuration: { recordingRetentionDays: 3 } },
      { configuration: null },
    ]);

    const maxMs = await getMaxRecordingRetentionMs();
    assert.strictEqual(maxMs, 14 * DAY_MS);
  });
});

describe("Google Meet connection handling", { concurrency: false }, () => {
  test("Meet creation without a Google connection returns a friendly 400", async (t) => {
    let meetApiCalls = 0;

    replaceMethod(t, prisma.classSession as any, "findUnique", async () => session());
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findUnique", async () => null);
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findFirst", async () => null);
    t.mock.method(google as any, "meet", () => {
      meetApiCalls++;
      return {};
    });

    await assert.rejects(
      () => createMeetSpaceForSession(adminUser as any, "session-1"),
      (error: any) => {
        assert.strictEqual(error.statusCode, 400);
        assert.match(error.message, /connect your Google Workspace account/i);
        return true;
      }
    );
    assert.strictEqual(meetApiCalls, 0);
  });
});

describe("Google recording sync queue", { concurrency: false }, () => {
  test("end-live enqueues sync with dedupe jobId sync-recording-${sessionId}", async (t) => {
    const enqueued: Array<{ name: string; data: any; opts: any }> = [];
    const pendingRecording = {
      id: "recording-1",
      classSessionId: "session-1",
      recordingStatus: "PENDING",
    };
    const liveSession = {
      id: "session-1",
      googleMeetSpace: { organizerUserId: adminUser.id },
      recording: pendingRecording,
    };
    const endedSession = {
      id: "session-1",
      actualStartTime: new Date("2026-09-01T09:00:00.000Z"),
      actualEndTime: new Date("2026-09-01T10:00:00.000Z"),
      recording: pendingRecording,
    };

    replaceMethod(t, classSessionRepository as any, "findById", async () => liveSession);
    replaceMethod(t, classSessionRepository as any, "endLive", async () => endedSession);
    replaceMethod(t, googleRecordingQueue as any, "add", async (name: string, data: any, opts: any) => {
      enqueued.push({ name, data, opts });
      return { id: opts.jobId };
    });

    const result = await classSessionService.endLiveClass("session-1", adminUser.instituteId);

    assert.strictEqual(enqueued.length, 1);
    assert.strictEqual(enqueued[0].name, "sync-session-recording");
    assert.strictEqual(enqueued[0].opts.jobId, "sync-recording-session-1");
    assert.strictEqual(enqueued[0].data.classSessionId, "session-1");
    assert.strictEqual(enqueued[0].data.userId, adminUser.id);
    assert.strictEqual(enqueued[0].opts.attempts, 3);
    assert.match(result.message, /queued in the background/i);
  });

  test("worker schedules delayed re-poll when sync returns not AVAILABLE", async (t) => {
    const moveToDelayedAt: number[] = [];
    const updatedJobData: any[] = [];
    let markedProcessing = false;
    const pendingRecording = {
      id: "recording-1",
      classSessionId: "session-1",
      recordingStatus: "PENDING",
      status: "ACTIVE",
    };

    t.mock.method(google as any, "meet", () => ({
      conferenceRecords: {
        list: async () => ({
          data: {
            conferenceRecords: [
              {
                name: "conferenceRecords/conf-1",
                space: "spaces/test-space",
                startTime: "2026-09-01T09:00:00.000Z",
              },
            ],
          },
        }),
        recordings: {
          list: async () => ({
            data: {
              recordings: [
                {
                  name: "conferenceRecords/conf-1/recordings/rec-1",
                  state: "STARTED",
                  startTime: "2026-09-01T09:00:00.000Z",
                },
              ],
            },
          }),
        },
      },
    }));

    installSyncDatabaseMocks(t, () => session(pendingRecording));
    replaceMethod(t, prisma.recording as any, "findFirst", async () => null);
    replaceMethod(t, prisma.recording as any, "upsert", async ({ update, create }: any) => {
      const data = { ...pendingRecording, ...(update || create) };
      Object.assign(pendingRecording, data);
      return pendingRecording;
    });
    replaceMethod(t, prisma.recording as any, "updateMany", async ({ data }: any) => {
      if (data.recordingStatus === "PROCESSING") markedProcessing = true;
      Object.assign(pendingRecording, data);
      return { count: 1 };
    });
    replaceMethod(t, prisma.classSession as any, "findUnique", async (args: any) => {
      // Worker readiness check only selects end times; sync loads the full session.
      if (args?.select) {
        return {
          actualEndTime: new Date(),
          scheduledDate: new Date("2026-09-01T09:00:00.000Z"),
        };
      }
      return session(pendingRecording);
    });

    const job = {
      data: {
        classSessionId: "session-1",
        instituteId: adminUser.instituteId,
        userId: adminUser.id,
        pollAttempt: 0,
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
      updateData: async (data: any) => {
        updatedJobData.push(data);
      },
      moveToDelayed: async (timestamp: number) => {
        moveToDelayedAt.push(timestamp);
      },
    };

    const before = Date.now();
    await assert.rejects(
      () => processGoogleRecordingSync(job as any, "test-token"),
      (error: unknown) => error instanceof DelayedError
    );

    assert.strictEqual(markedProcessing, true);
    assert.strictEqual(pendingRecording.recordingStatus, "RECORDING");
    assert.strictEqual(updatedJobData.length, 1);
    assert.strictEqual(updatedJobData[0].pollAttempt, 1);
    assert.strictEqual(moveToDelayedAt.length, 1);
    assert.ok(
      moveToDelayedAt[0] >= before + GOOGLE_RECORDING_REPOLL_DELAY_MS - 50,
      "re-poll delay should be ~2 minutes"
    );
  });

  test("faculty notification is created once on first AVAILABLE; second sync does not duplicate", async (t) => {
    let storedRecording: any = {
      id: "recording-1",
      classSessionId: "session-1",
      recordingStatus: "PENDING",
      status: "ACTIVE",
      expiresAt: null,
    };
    const facultyNotifications: any[] = [];
    let notificationLookupCount = 0;

    installGoogleDiscoveryMock(t);
    installSyncDatabaseMocks(t, () =>
      session({
        ...storedRecording,
        recordingStatus: storedRecording.recordingStatus,
      })
    );
    replaceMethod(t, prisma.recording as any, "findFirst", async () => null);
    replaceMethod(t, prisma.recording as any, "upsert", async ({ update, create }: any) => {
      const data = storedRecording.recordingStatus === "AVAILABLE" ? update : create;
      storedRecording = {
        ...storedRecording,
        ...data,
        id: "recording-1",
        status: "ACTIVE",
      };
      return storedRecording;
    });
    replaceMethod(t, prisma.recording as any, "findUnique", async () => ({
      id: storedRecording.id,
      expiresAt: storedRecording.expiresAt || new Date("2026-09-08T10:00:00.000Z"),
      classSession: {
        id: "session-1",
        title: "Google Meet class",
        branchId: "branch-1",
        batchId: "batch-1",
        faculty: { userId: "faculty-user-1" },
        batch: {
          id: "batch-1",
          instituteId: adminUser.instituteId,
          name: "Batch A",
          enrollments: [],
        },
      },
    }));
    replaceMethod(t, prisma.notification as any, "findFirst", async () => {
      notificationLookupCount++;
      return facultyNotifications.length > 0 ? { id: "notif-1" } : null;
    });
    t.mock.method(NotificationService, "createNotification", async (payload: any) => {
      facultyNotifications.push(payload);
      return { id: `notif-${facultyNotifications.length}`, ...payload };
    });

    await syncSessionRecordings(adminUser as any, "session-1");
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.strictEqual(storedRecording.recordingStatus, "AVAILABLE");
    assert.strictEqual(facultyNotifications.length, 1);
    assert.strictEqual(facultyNotifications[0].userId, "faculty-user-1");
    assert.strictEqual(facultyNotifications[0].type, "CLASS_SESSION");
    assert.strictEqual(facultyNotifications[0].metadata.recordingId, "recording-1");
    assert.strictEqual(facultyNotifications[0].link, "/faculty/recordings");

    await syncSessionRecordings(adminUser as any, "session-1");
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.strictEqual(facultyNotifications.length, 1, "second sync must not create another faculty notification");
    assert.ok(notificationLookupCount >= 1);
  });

  test("hard failure after max attempts marks recording FAILED", async (t) => {
    const failedUpdates: any[] = [];

    t.mock.method(google as any, "meet", () => ({
      conferenceRecords: {
        list: async () => {
          throw {
            response: { status: 503 },
            message: "Google API unavailable",
          };
        },
      },
    }));
    installSyncDatabaseMocks(t, () => session({ id: "recording-1", recordingStatus: "PROCESSING" }));
    replaceMethod(t, prisma.recording as any, "updateMany", async ({ data }: any) => {
      failedUpdates.push(data);
      return { count: 1 };
    });

    const job = {
      data: {
        classSessionId: "session-1",
        instituteId: adminUser.instituteId,
        userId: adminUser.id,
      },
      attemptsMade: 2,
      opts: { attempts: 3 },
      updateData: async () => {},
      moveToDelayed: async () => {},
    };

    await assert.rejects(() => processGoogleRecordingSync(job as any));

    const failed = failedUpdates.find((u) => u.recordingStatus === "FAILED");
    assert.ok(failed, "final attempt must mark FAILED");
    assert.ok(
      typeof failed.lastSyncError === "string" && failed.lastSyncError.length > 0,
      "FAILED update should include lastSyncError"
    );
  });

  test("worker does not treat old scheduledDate alone as past sync window", async (t) => {
    const moveToDelayedAt: number[] = [];
    const pendingRecording = {
      id: "recording-1",
      classSessionId: "session-1",
      recordingStatus: "PENDING",
      status: "ACTIVE",
    };

    t.mock.method(google as any, "meet", () => ({
      conferenceRecords: {
        list: async () => ({
          data: {
            conferenceRecords: [
              {
                name: "conferenceRecords/conf-1",
                space: "spaces/test-space",
              },
            ],
          },
        }),
        recordings: {
          list: async () => ({ data: { recordings: [] } }),
        },
      },
    }));
    t.mock.method(google as any, "drive", () => ({
      files: {
        get: async () => ({ data: null }),
        list: async () => ({ data: { files: [] } }),
      },
    }));

    installSyncDatabaseMocks(t, () => session(pendingRecording));
    replaceMethod(t, prisma.recording as any, "findFirst", async () => null);
    replaceMethod(t, prisma.recording as any, "update", async ({ data }: any) => {
      Object.assign(pendingRecording, data);
      return pendingRecording;
    });
    replaceMethod(t, prisma.recording as any, "updateMany", async ({ data }: any) => {
      Object.assign(pendingRecording, data);
      return { count: 1 };
    });
    replaceMethod(t, prisma.classSession as any, "findUnique", async (args: any) => {
      if (args?.select) {
        return {
          // Recent end — window must use this, not the old scheduledDate from session().
          actualEndTime: new Date(),
        };
      }
      return {
        ...session(pendingRecording),
        scheduledDate: new Date("2020-01-01T00:00:00.000Z"),
        actualEndTime: new Date(),
      };
    });

    const job = {
      data: {
        classSessionId: "session-1",
        instituteId: adminUser.instituteId,
        userId: adminUser.id,
        pollAttempt: 0,
        enqueuedAtMs: Date.now(),
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
      updateData: async () => {},
      moveToDelayed: async (timestamp: number) => {
        moveToDelayedAt.push(timestamp);
      },
    };

    await assert.rejects(
      () => processGoogleRecordingSync(job as any, "test-token"),
      (error: unknown) => error instanceof DelayedError
    );

    assert.strictEqual(moveToDelayedAt.length, 1, "should schedule re-poll when actualEndTime is recent");
    assert.match(String(pendingRecording.lastSyncError || ""), /Waiting for Google Meet recording/i);
  });

  test("Drive folder fallback links recording when Meet API returns no artifacts", async (t) => {
    let storedRecording: any = {
      id: "recording-1",
      classSessionId: "session-1",
      recordingStatus: "PENDING",
      status: "ACTIVE",
      expiresAt: null,
    };
    const driveFileId = "drive-fallback-file-999";

    t.mock.method(google as any, "meet", () => ({
      conferenceRecords: {
        list: async () => ({ data: { conferenceRecords: [] } }),
        recordings: {
          list: async () => ({ data: { recordings: [] } }),
        },
      },
    }));
    t.mock.method(google as any, "drive", () => ({
      files: {
        get: async () => ({
          data: {
            id: driveFileId,
            name: "Fallback Meet Recording.mp4",
            mimeType: "video/mp4",
            webViewLink: `https://drive.google.com/file/d/${driveFileId}/view`,
            createdTime: new Date().toISOString(),
            videoMediaMetadata: { durationMillis: "300000" },
          },
        }),
        list: async () => ({
          data: {
            files: [
              {
                id: driveFileId,
                name: "Fallback Meet Recording.mp4",
                mimeType: "video/mp4",
                webViewLink: `https://drive.google.com/file/d/${driveFileId}/view`,
                createdTime: new Date().toISOString(),
                videoMediaMetadata: { durationMillis: "300000" },
              },
            ],
          },
        }),
      },
    }));

    installSyncDatabaseMocks(t, () => ({
      ...session(storedRecording),
      actualStartTime: new Date(Date.now() - 10 * 60 * 1000),
      actualEndTime: new Date(),
      googleMeetSpace: {
        id: "meet-space-1",
        spaceName: "spaces/test-space",
        meetingCode: "abc-defg-hij",
        organizerUserId: adminUser.id,
      },
    }));
    replaceMethod(t, prisma.recording as any, "findFirst", async () => null);
    replaceMethod(t, prisma.recording as any, "upsert", async ({ update, create }: any) => {
      const data = storedRecording.recordingStatus === "PENDING" && !storedRecording.playbackUrl
        ? { ...create, ...update }
        : update || create;
      storedRecording = { ...storedRecording, ...data };
      return storedRecording;
    });

    const result = await syncSessionRecordings(adminUser as any, "session-1");
    assert.ok(result.syncedCount >= 1);
    assert.strictEqual(storedRecording.recordingStatus, "AVAILABLE");
    assert.strictEqual(storedRecording.googleDriveFileId, driveFileId);
    assert.strictEqual(
      storedRecording.duration,
      5,
      "Drive durationMillis 300000 must store 5 minutes, not timetable length"
    );
  });

  test("resolveRecordingDurationMinutes prefers Drive millis over Meet/timetable ranges", () => {
    assert.strictEqual(
      resolveRecordingDurationMinutes({
        durationMillis: "300000",
        meetStart: "2026-09-01T10:00:00.000Z",
        meetEnd: "2026-09-01T11:00:00.000Z",
      }),
      5
    );
    assert.strictEqual(
      resolveRecordingDurationMinutes({
        durationMillis: null,
        meetStart: "2026-09-01T10:00:00.000Z",
        meetEnd: "2026-09-01T10:05:00.000Z",
      }),
      5
    );
    assert.strictEqual(
      resolveRecordingDurationMinutes({
        startedAt: new Date("2026-09-01T10:00:00.000Z"),
        endedAt: new Date("2026-09-01T10:05:00.000Z"),
      }),
      5
    );
    assert.strictEqual(
      resolveRecordingDurationMinutes({
        durationMillis: "0",
        meetStart: null,
        meetEnd: null,
      }),
      null
    );
  });

  test("sync stores 5-min Drive duration even when Meet conference spans a 60-min slot", async (t) => {
    let storedRecording: any = {
      id: "recording-1",
      classSessionId: "session-1",
      recordingStatus: "PENDING",
      status: "ACTIVE",
      duration: 60,
      expiresAt: null,
    };

    installGoogleDiscoveryMock(t, {
      durationMillis: "300000",
      // Conference/recording timestamps look like a full hour slot
      recordingStartTime: "2026-09-01T10:00:00.000Z",
      recordingEndTime: "2026-09-01T11:00:00.000Z",
    });
    installSyncDatabaseMocks(t, () => ({
      ...session(storedRecording),
      // Timetable: 60-minute class
      scheduledDate: new Date("2026-09-01T10:00:00.000Z"),
      actualStartTime: new Date("2026-09-01T10:00:00.000Z"),
      actualEndTime: new Date("2026-09-01T10:05:00.000Z"),
    }));
    replaceMethod(t, prisma.recording as any, "findFirst", async () => null);
    replaceMethod(t, prisma.recording as any, "upsert", async ({ update, create }: any) => {
      const data = storedRecording ? update : create;
      storedRecording = { ...storedRecording, ...data };
      return storedRecording;
    });

    await syncSessionRecordings(adminUser as any, "session-1");

    assert.strictEqual(storedRecording.recordingStatus, "AVAILABLE");
    assert.strictEqual(
      storedRecording.duration,
      5,
      "must use Drive videoMediaMetadata (5m), not Meet conference span or stale 60"
    );
  });

  test("sync falls back to Meet recording start/end when Drive durationMillis is missing", async (t) => {
    let storedRecording: any = {
      id: "recording-1",
      classSessionId: "session-1",
      recordingStatus: "PENDING",
      status: "ACTIVE",
      duration: 60,
      expiresAt: null,
    };

    installGoogleDiscoveryMock(t, {
      omitDriveDuration: true,
      recordingStartTime: "2026-09-01T10:00:00.000Z",
      recordingEndTime: "2026-09-01T10:05:00.000Z",
    });
    installSyncDatabaseMocks(t, () => ({
      ...session(storedRecording),
      scheduledDate: new Date("2026-09-01T10:00:00.000Z"),
      actualStartTime: new Date("2026-09-01T10:00:00.000Z"),
      // actual live session ran full hour — must NOT win over Meet recording bounds
      actualEndTime: new Date("2026-09-01T11:00:00.000Z"),
    }));
    replaceMethod(t, prisma.recording as any, "findFirst", async () => null);
    replaceMethod(t, prisma.recording as any, "upsert", async ({ update, create }: any) => {
      const data = storedRecording ? update : create;
      storedRecording = { ...storedRecording, ...data };
      return storedRecording;
    });

    await syncSessionRecordings(adminUser as any, "session-1");

    assert.strictEqual(storedRecording.recordingStatus, "AVAILABLE");
    assert.strictEqual(
      storedRecording.duration,
      5,
      "Meet recording end−start must win over stale 60 and actualEndTime hour span"
    );
  });
});

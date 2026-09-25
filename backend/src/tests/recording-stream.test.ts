import { describe, test } from "node:test";
import assert from "node:assert";
import { PassThrough } from "stream";
import { google } from "googleapis";
import { prisma } from "../config/database";
import { encryptRefreshToken } from "../integrations/google/google.auth.client";
import {
  getRecordingAccess,
  streamRecording,
} from "../modules/recordings/recording.service";
import {
  signRecordingStreamToken,
} from "../modules/recordings/recording-stream-token.util";

const DAY_MS = 24 * 60 * 60 * 1000;

const adminUser = {
  id: "admin-user",
  userId: "admin-user",
  instituteId: "institute-1",
  branchId: null as string | null,
  roles: ["ADMIN"],
  permissions: ["recording.read"],
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

const enrolledRecording = () => ({
  id: "recording-1",
  classSessionId: "session-1",
  playbackUrl: "https://drive.google.com/file/d/private-file-12345/view",
  googleDriveFileId: "private-file-12345",
  storageProvider: "GOOGLE_DRIVE",
  recordingStatus: "AVAILABLE",
  status: "ACTIVE",
  expiresAt: new Date(Date.now() + DAY_MS),
  duration: 45,
  startedAt: new Date(),
  endedAt: new Date(),
  classSession: {
    id: "session-1",
    title: "Theory class",
    facultyId: "faculty-1",
    googleMeetSpace: {
      organizerUserId: adminUser.id,
    },
    batch: {
      id: "batch-1",
      instituteId: "institute-1",
      branchId: "branch-1",
      enrollments: [{ studentId: "student-1" }],
    },
  },
});

describe("Recording app-stream playback", { concurrency: false }, () => {
  test("stream without token returns 401", async () => {
    await assert.rejects(
      () => streamRecording("recording-1", undefined),
      (error: any) => {
        assert.strictEqual(error.statusCode, 401);
        return true;
      }
    );
  });

  test("stream with invalid token returns 401", async () => {
    await assert.rejects(
      () => streamRecording("recording-1", "not-a-valid.jwt.token"),
      (error: any) => {
        assert.strictEqual(error.statusCode, 401);
        assert.match(error.message, /invalid or expired/i);
        return true;
      }
    );
  });

  test("stream token for a different recording returns 403", async () => {
    const token = signRecordingStreamToken({
      userId: studentUser.id,
      recordingId: "recording-other",
      instituteId: studentUser.instituteId,
      branchId: studentUser.branchId,
      roles: studentUser.roles,
    });

    await assert.rejects(
      () => streamRecording("recording-1", token),
      (error: any) => {
        assert.strictEqual(error.statusCode, 403);
        return true;
      }
    );
  });

  test("student access returns signed /stream URL not Drive /preview", async (t) => {
    replaceMethod(t, prisma.recording as any, "findUnique", async () => enrolledRecording());
    replaceMethod(t, prisma.student as any, "findFirst", async () => ({
      id: "student-1",
    }));
    replaceMethod(t, prisma.activityLog as any, "create", async ({ data }: any) => data);

    const access = await getRecordingAccess(studentUser as any, "recording-1");

    assert.match(
      access.playbackUrl || "",
      /^\/api\/v1\/recordings\/recording-1\/stream\?token=.+/
    );
    assert.ok(!access.playbackUrl?.includes("/preview"));
  });

  test("valid stream token pipes Drive alt=media with Range", async (t) => {
    const rangeHeaders: string[] = [];
    replaceMethod(t, prisma.recording as any, "findUnique", async () => enrolledRecording());
    replaceMethod(t, prisma.student as any, "findFirst", async () => ({
      id: "student-1",
    }));
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findUnique", async () => connection);
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findFirst", async () => null);

    t.mock.method(google as any, "drive", () => ({
      files: {
        get: async (_params: any, options: any) => {
          const range = options?.headers?.Range;
          if (range) rangeHeaders.push(range);
          const stream = new PassThrough();
          stream.end(Buffer.from("fake-video-bytes"));
          return {
            status: range ? 206 : 200,
            headers: {
              "content-type": "video/mp4",
              "content-length": "16",
              "accept-ranges": "bytes",
              ...(range
                ? { "content-range": "bytes 0-15/100" }
                : {}),
            },
            data: stream,
          };
        },
      },
    }));

    const token = signRecordingStreamToken({
      userId: studentUser.id,
      recordingId: "recording-1",
      instituteId: studentUser.instituteId,
      branchId: studentUser.branchId,
      roles: studentUser.roles,
    });

    const full = await streamRecording("recording-1", token);
    assert.strictEqual(full.status, 200);
    assert.strictEqual(full.contentType, "video/mp4");
    assert.strictEqual(full.acceptRanges, "bytes");

    const partial = await streamRecording("recording-1", token, "bytes=0-15");
    assert.strictEqual(partial.status, 206);
    assert.strictEqual(partial.contentRange, "bytes 0-15/100");
    assert.deepStrictEqual(rangeHeaders, ["bytes=0-15"]);
  });

  test("Drive octet-stream Content-Type is normalized to video/mp4", async (t) => {
    replaceMethod(t, prisma.recording as any, "findUnique", async () => enrolledRecording());
    replaceMethod(t, prisma.student as any, "findFirst", async () => ({
      id: "student-1",
    }));
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findUnique", async () => connection);
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findFirst", async () => null);

    t.mock.method(google as any, "drive", () => ({
      files: {
        get: async () => {
          const stream = new PassThrough();
          stream.end(Buffer.from("fake-video-bytes"));
          return {
            status: 200,
            headers: {
              "content-type": "application/octet-stream",
              "content-length": "16",
              "accept-ranges": "bytes",
            },
            data: stream,
          };
        },
      },
    }));

    const token = signRecordingStreamToken({
      userId: studentUser.id,
      recordingId: "recording-1",
      instituteId: studentUser.instituteId,
      branchId: studentUser.branchId,
      roles: studentUser.roles,
    });

    const full = await streamRecording("recording-1", token);
    assert.strictEqual(full.contentType, "video/mp4");
  });

  test("normalizeRecordingStreamContentType maps opaque types for HTML5 video", async () => {
    const { normalizeRecordingStreamContentType } = await import(
      "../integrations/google/google.drive.client"
    );
    assert.strictEqual(normalizeRecordingStreamContentType(undefined), "video/mp4");
    assert.strictEqual(
      normalizeRecordingStreamContentType("application/octet-stream"),
      "video/mp4"
    );
    assert.strictEqual(
      normalizeRecordingStreamContentType("video/webm; codecs=vp9"),
      "video/webm"
    );
  });

  test("Fetch Headers expose Content-Range that Object.entries cannot see", async (t) => {
    replaceMethod(t, prisma.recording as any, "findUnique", async () => enrolledRecording());
    replaceMethod(t, prisma.student as any, "findFirst", async () => ({
      id: "student-1",
    }));
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findUnique", async () => connection);
    replaceMethod(t, prisma.googleWorkspaceConnection as any, "findFirst", async () => null);

    t.mock.method(google as any, "drive", () => ({
      files: {
        get: async () => {
          const stream = new PassThrough();
          stream.end(Buffer.from("0123456789abcdef"));
          // Mimic googleapis/gaxios stream responses (undici Headers).
          const headers = new Headers({
            "content-type": "video/mp4",
            "content-length": "16",
            "content-range": "bytes 0-15/100",
            "accept-ranges": "bytes",
          });
          return {
            status: 206,
            headers,
            data: stream,
          };
        },
      },
    }));

    const token = signRecordingStreamToken({
      userId: studentUser.id,
      recordingId: "recording-1",
      instituteId: studentUser.instituteId,
      branchId: studentUser.branchId,
      roles: studentUser.roles,
    });

    const partial = await streamRecording("recording-1", token, "bytes=0-15");
    assert.strictEqual(partial.status, 206);
    assert.strictEqual(partial.contentType, "video/mp4");
    assert.strictEqual(partial.contentLength, 16);
    assert.strictEqual(partial.contentRange, "bytes 0-15/100");
    assert.strictEqual(partial.acceptRanges, "bytes");
  });

  test("expired recording cannot be streamed even with valid token", async (t) => {
    const expired = {
      ...enrolledRecording(),
      expiresAt: new Date(Date.now() - DAY_MS),
    };
    replaceMethod(t, prisma.recording as any, "findUnique", async () => expired);
    replaceMethod(t, prisma.student as any, "findFirst", async () => ({
      id: "student-1",
    }));
    replaceMethod(t, prisma.recording as any, "update", async ({ data }: any) => ({
      ...expired,
      ...data,
    }));

    const token = signRecordingStreamToken({
      userId: studentUser.id,
      recordingId: "recording-1",
      instituteId: studentUser.instituteId,
      branchId: studentUser.branchId,
      roles: studentUser.roles,
    });

    await assert.rejects(
      () => streamRecording("recording-1", token),
      (error: any) => {
        assert.strictEqual(error.statusCode, 410);
        assert.strictEqual(error.errorCode, "RECORDING_EXPIRED");
        return true;
      }
    );
  });
});

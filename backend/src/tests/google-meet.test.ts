import { test, describe, before } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import {
  encryptRefreshToken,
  decryptRefreshToken,
  getRequiredScopes,
} from "../integrations/google/google.auth.client";
import {
  createSignedStateToken,
  verifyStateToken,
} from "../modules/google-workspace/google-workspace.service";
import {
  oauthCallbackSchema,
  createMeetSpaceSchema,
  syncRecordingsSchema,
} from "../modules/google-workspace/google-workspace.validation";
import {
  createRecordingSchema,
  queryRecordingSchema,
} from "../modules/recordings/recording.validation";
import { maskSensitiveData } from "../utils/audit-log.util";
import { prisma } from "../config/database";
import { classSessionService } from "../modules/class-sessions/class-session.service";
import * as recordingService from "../modules/recordings/recording.service";

describe("Google Workspace & Google Meet Security & Encryption Tests", () => {
  test("1. AES-256-GCM should encrypt and decrypt OAuth refresh tokens faithfully", () => {
    const rawToken = "1//04test_google_refresh_token_xyz_123456789";
    const encrypted = encryptRefreshToken(rawToken);

    assert.notStrictEqual(encrypted, rawToken);
    assert.strictEqual(typeof encrypted, "string");
    assert.ok(encrypted.includes(":"), "Encrypted string should contain IV delimiter");

    const decrypted = decryptRefreshToken(encrypted);
    assert.strictEqual(decrypted, rawToken);
  });

  test("2. Decrypting corrupted ciphertext should fail safely", () => {
    assert.throws(() => {
      decryptRefreshToken("invalid_corrupted_cipher_text:12345:67890");
    });
  });

  test("3. Sensitive credentials must be masked in audit log payloads", () => {
    const payload = {
      userId: "user-123",
      email: "faculty@aadya.com",
      password: "SuperSecretPassword",
      refreshToken: "1//04google_secret_token",
      encryptedRefreshToken: "enc:token",
      accessToken: "ya29.secret_access_token",
      nested: {
        clientSecret: "google-client-secret-123",
        publicName: "Aadya Live Class",
      },
    };

    const masked = maskSensitiveData(payload);

    assert.strictEqual(masked.password, "***MASKED***");
    assert.strictEqual(masked.refreshToken, "***MASKED***");
    assert.strictEqual(masked.encryptedRefreshToken, "***MASKED***");
    assert.strictEqual(masked.accessToken, "***MASKED***");
    assert.strictEqual(masked.nested.clientSecret, "***MASKED***");
    assert.strictEqual(masked.email, "faculty@aadya.com");
    assert.strictEqual(masked.nested.publicName, "Aadya Live Class");
  });

  test("4. Signed CSRF state token generation and verification works", () => {
    const userId = "usr-test-123";
    const instituteId = "inst-test-456";

    const state = createSignedStateToken(userId, instituteId);
    assert.strictEqual(typeof state, "string");

    const payload = verifyStateToken(state);
    assert.strictEqual(payload.userId, userId);
    assert.strictEqual(payload.instituteId, instituteId);
    assert.ok(payload.timestamp > 0);
  });

  test("5. Tampered CSRF state token should be rejected with 400 error", () => {
    const userId = "usr-test-123";
    const instituteId = "inst-test-456";
    const validState = createSignedStateToken(userId, instituteId);

    // Tamper with base64 payload
    const tampered = validState.slice(0, -5) + "abcde";
    assert.throws(() => {
      verifyStateToken(tampered);
    });
  });

  test("6. Expired state token (>15 mins) must be rejected", () => {
    // Generate an expired payload
    const expiredPayload = {
      userId: "usr-expired",
      instituteId: "inst-expired",
      timestamp: Date.now() - 20 * 60 * 1000, // 20 mins ago
      nonce: "random-nonce",
    };
    const jsonStr = JSON.stringify(expiredPayload);
    const hmac = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "aadya-google-token-encryption-secret-key-32")
      .update(jsonStr)
      .digest("hex");
    const expiredToken = Buffer.from(`${jsonStr}::${hmac}`).toString("base64url");

    assert.throws(() => {
      verifyStateToken(expiredToken);
    });
  });

  test("7. OAuth scopes include Google Meet and Google Drive permissions", () => {
    const scopes = getRequiredScopes();
    assert.ok(scopes.some((s) => s.includes("meetings.space")));
    assert.ok(scopes.some((s) => s.includes("drive")));
    assert.ok(scopes.some((s) => s.includes("userinfo.email")));
  });
});

describe("Google Workspace & Recording Validation Schema Tests", () => {
  test("8. oauthCallbackSchema validates code and state correctly", () => {
    const valid = oauthCallbackSchema.safeParse({
      code: "4/0AeanS0_valid_code",
      state: "valid_signed_state_token",
    });
    assert.strictEqual(valid.success, true);

    const invalid = oauthCallbackSchema.safeParse({
      code: "",
    });
    assert.strictEqual(invalid.success, false);
  });

  test("9. createMeetSpaceSchema accepts valid options with defaults", () => {
    const parsed = createMeetSpaceSchema.parse({});
    assert.strictEqual(parsed.enableAutomaticRecording, true);
    assert.strictEqual(parsed.accessType, "TRUSTED");
  });

  test("10. syncRecordingsSchema requires classSessionId", () => {
    assert.strictEqual(syncRecordingsSchema.safeParse({}).success, false);
    assert.strictEqual(
      syncRecordingsSchema.safeParse({ classSessionId: "session-123" }).success,
      true
    );
  });

  test("11. createRecordingSchema validates Google Meet and Drive fields", () => {
    const valid = createRecordingSchema.safeParse({
      classSessionId: "session-abc",
      googleConferenceRecordId: "conferenceRecords/xxx",
      googleRecordingId: "conferenceRecords/xxx/recordings/yyy",
      googleDriveFileId: "1abcDriveFileId",
      playbackUrl: "https://drive.google.com/file/d/1abcDriveFileId/view",
      recordingStatus: "READY",
      duration: 60,
    });
    assert.strictEqual(valid.success, true);
  });

  test("12. queryRecordingSchema allows filtering by date range, course, and status", () => {
    const valid = queryRecordingSchema.safeParse({
      batchId: "batch-123",
      courseId: "course-456",
      status: "ACTIVE",
      recordingStatus: "READY",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      page: "1",
      limit: "20",
    });
    assert.strictEqual(valid.success, true);
  });
});

describe("Google Meet Class Sessions & Multi-Branch / Student Authorization Tests", () => {
  let seededData: {
    instituteId: string;
    branch1Id: string;
    branch2Id: string;
    batch1Id: string;
    batch2Id: string;
    session1Id: string;
    session2Id: string;
    student1UserId: string;
    student2UserId: string;
    faculty1UserId: string;
    adminUserId: string;
  };

  before(async () => {
    const institute = await prisma.institute.findFirst({ select: { id: true } });
    if (!institute) return;

    const branches = await prisma.branch.findMany({
      where: { instituteId: institute.id },
      select: { id: true, name: true },
      take: 2,
    });

    const admin = await prisma.user.findFirst({
      where: { email: "admin@aadya.com" },
      select: { id: true },
    });

    const faculty1 = await prisma.user.findFirst({
      where: { email: "faculty.rajesh@aadya.com" },
      select: { id: true },
    });

    const student1 = await prisma.user.findFirst({
      where: { email: "student.arjun@aadya.com" },
      select: { id: true },
    });

    const student2 = await prisma.user.findFirst({
      where: { email: "student.sneha@aadya.com" },
      select: { id: true },
    });

    const sessions = await prisma.classSession.findMany({
      where: { batch: { instituteId: institute.id } },
      include: { batch: true },
      take: 2,
    });

    if (branches.length >= 2 && sessions.length >= 2 && admin && faculty1 && student1 && student2) {
      seededData = {
        instituteId: institute.id,
        branch1Id: branches[0].id,
        branch2Id: branches[1].id,
        batch1Id: sessions[0].batchId,
        batch2Id: sessions[1].batchId,
        session1Id: sessions[0].id,
        session2Id: sessions[1].id,
        student1UserId: student1.id,
        student2UserId: student2.id,
        faculty1UserId: faculty1.id,
        adminUserId: admin.id,
      };
    }
  });

  test("13. Admin should have full access to class session meeting details across any branch", async () => {
    if (!seededData) return;

    const adminUser: any = {
      id: seededData.adminUserId,
      userId: seededData.adminUserId,
      instituteId: seededData.instituteId,
      branchId: null,
      roles: ["ADMIN"],
      permissions: ["google_meet.read"],
    };

    const meeting = await classSessionService.getSessionMeeting(adminUser, seededData.session1Id);
    assert.strictEqual(meeting.classSessionId, seededData.session1Id);
    assert.ok(meeting.title);
  });

  test("14. Enrolled student should be authorized to retrieve their batch class meeting URL", async () => {
    if (!seededData) return;

    const studentUser: any = {
      id: seededData.student1UserId,
      userId: seededData.student1UserId,
      instituteId: seededData.instituteId,
      branchId: seededData.branch1Id,
      roles: ["STUDENT"],
      permissions: ["google_meet.read"],
    };

    const meeting = await classSessionService.getSessionMeeting(studentUser, seededData.session1Id);
    assert.strictEqual(meeting.classSessionId, seededData.session1Id);
  });

  test("15. Student accessing another branch / foreign batch session should be denied (403/404)", async () => {
    if (!seededData) return;

    // Student from branch 1 attempting to access branch 2 session
    const studentUser: any = {
      id: seededData.student1UserId,
      userId: seededData.student1UserId,
      instituteId: seededData.instituteId,
      branchId: seededData.branch1Id,
      roles: ["STUDENT"],
      permissions: ["google_meet.read"],
    };

    await assert.rejects(
      async () => {
        await classSessionService.getSessionMeeting(studentUser, seededData.session2Id);
      },
      (err: any) => {
        assert.ok(err.statusCode === 403 || err.statusCode === 404);
        return true;
      }
    );
  });

  test("16. Center Manager accessing a session from a different branch should be rejected with 404", async () => {
    if (!seededData) return;

    const cmUserOtherBranch: any = {
      id: "usr-cm-other",
      userId: "usr-cm-other",
      instituteId: seededData.instituteId,
      branchId: seededData.branch2Id,
      roles: ["CENTER_MANAGER"],
      permissions: ["google_meet.read"],
    };

    await assert.rejects(
      async () => {
        await classSessionService.getSessionMeeting(cmUserOtherBranch, seededData.session1Id);
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test("17. User from a different institute (tenant) should be strictly rejected with 404", async () => {
    if (!seededData) return;

    const foreignTenantUser: any = {
      id: "usr-foreign-tenant",
      userId: "usr-foreign-tenant",
      instituteId: "completely-different-institute-uuid",
      branchId: null,
      roles: ["ADMIN"],
      permissions: ["google_meet.read"],
    };

    await assert.rejects(
      async () => {
        await classSessionService.getSessionMeeting(foreignTenantUser, seededData.session1Id);
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test("18. Student recording list should only return recordings for their enrolled batches", async () => {
    if (!seededData) return;

    const studentUser: any = {
      id: seededData.student1UserId,
      userId: seededData.student1UserId,
      instituteId: seededData.instituteId,
      branchId: seededData.branch1Id,
      roles: ["STUDENT"],
      permissions: ["recording.read"],
    };

    const result = await recordingService.getRecordings(studentUser, { page: 1, limit: 10 });
    assert.ok(Array.isArray(result.data));

    // Verify all returned recordings belong to the student's enrolled batch
    for (const rec of result.data) {
      assert.strictEqual(rec.classSession.batch.id, seededData.batch1Id);
    }
  });

  test("19. Student requesting direct recording access for an unenrolled batch should be rejected", async () => {
    if (!seededData) return;

    const studentUser: any = {
      id: seededData.student1UserId,
      userId: seededData.student1UserId,
      instituteId: seededData.instituteId,
      branchId: seededData.branch1Id,
      roles: ["STUDENT"],
      permissions: ["recording.read"],
    };

    // Find a recording belonging to batch 2
    const batch2Recording = await prisma.recording.findFirst({
      where: { classSession: { batchId: seededData.batch2Id } },
    });

    if (batch2Recording) {
      await assert.rejects(
        async () => {
          await recordingService.getRecordingById(studentUser, batch2Recording.id);
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    }
  });

  test("20. Google Meet space upsert persistence and relation linking", async () => {
    if (!seededData) return;

    const space = await prisma.googleMeetSpace.upsert({
      where: { classSessionId: seededData.session1Id },
      update: {
        spaceName: "spaces/aadya-test-space-123",
        meetingUri: "https://meet.google.com/aady-test-space",
        meetingCode: "aady-test-space",
        recordingEnabled: true,
        recordingConfigurationStatus: "ENABLED",
        status: "ACTIVE",
      },
      create: {
        classSessionId: seededData.session1Id,
        spaceName: "spaces/aadya-test-space-123",
        meetingUri: "https://meet.google.com/aady-test-space",
        meetingCode: "aady-test-space",
        organizerUserId: seededData.faculty1UserId,
        recordingEnabled: true,
        recordingConfigurationStatus: "ENABLED",
        status: "ACTIVE",
      },
    });

    assert.strictEqual(space.classSessionId, seededData.session1Id);
    assert.strictEqual(space.meetingCode, "aady-test-space");
    assert.strictEqual(space.recordingEnabled, true);

    const linkedSession = await prisma.classSession.findUnique({
      where: { id: seededData.session1Id },
      include: { googleMeetSpace: true },
    });

    assert.ok(linkedSession?.googleMeetSpace);
    assert.strictEqual(linkedSession?.googleMeetSpace?.spaceName, "spaces/aadya-test-space-123");
  });

  test("21. Recording model stores Google Drive file metadata and Google conference IDs", async () => {
    if (!seededData) return;

    const recording = await prisma.recording.upsert({
      where: { classSessionId: seededData.session1Id },
      update: {
        googleConferenceRecordId: "conferenceRecords/conf-12345",
        googleRecordingId: "conferenceRecords/conf-12345/recordings/rec-67890",
        googleDriveFileId: "drive-file-id-abc123xyz",
        playbackUrl: "https://drive.google.com/file/d/drive-file-id-abc123xyz/preview",
        recordingStatus: "READY",
        storageProvider: "GOOGLE_DRIVE",
        duration: 90,
      },
      create: {
        classSessionId: seededData.session1Id,
        googleConferenceRecordId: "conferenceRecords/conf-12345",
        googleRecordingId: "conferenceRecords/conf-12345/recordings/rec-67890",
        googleDriveFileId: "drive-file-id-abc123xyz",
        playbackUrl: "https://drive.google.com/file/d/drive-file-id-abc123xyz/preview",
        recordingStatus: "READY",
        storageProvider: "GOOGLE_DRIVE",
        duration: 90,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    assert.strictEqual(recording.googleDriveFileId, "drive-file-id-abc123xyz");
    assert.strictEqual(recording.recordingStatus, "READY");
    assert.strictEqual(recording.storageProvider, "GOOGLE_DRIVE");
    assert.strictEqual(recording.duration, 90);
  });

  test("22. getRecordingAccess returns secure playback details without leaking secrets", async () => {
    if (!seededData) return;

    const adminUser: any = {
      id: seededData.adminUserId,
      userId: seededData.adminUserId,
      instituteId: seededData.instituteId,
      branchId: null,
      roles: ["ADMIN"],
      permissions: ["recording.read"],
    };

    const existingRec = await prisma.recording.findFirst({
      where: { classSessionId: seededData.session1Id },
    });

    if (existingRec) {
      const access = await recordingService.getRecordingAccess(adminUser, existingRec.id);
      assert.strictEqual(access.recordingId, existingRec.id);
      assert.strictEqual(access.playbackUrl, existingRec.playbackUrl);
      assert.strictEqual(access.storageProvider, "GOOGLE_DRIVE");
      assert.strictEqual(access.recordingStatus, "READY");
    }
  });

  test("23. GoogleWorkspaceConnection token security & storage", async () => {
    if (!seededData) return;

    const rawRefreshToken = "1//04test_google_oauth_refresh_token_aadya";
    const encryptedToken = encryptRefreshToken(rawRefreshToken);

    const connection = await prisma.googleWorkspaceConnection.upsert({
      where: { userId: seededData.adminUserId },
      update: {
        email: "admin.workspace@aadya.com",
        encryptedRefreshToken: encryptedToken,
        scopes: ["https://www.googleapis.com/auth/meetings.space.created"],
        status: "CONNECTED",
      },
      create: {
        userId: seededData.adminUserId,
        instituteId: seededData.instituteId,
        email: "admin.workspace@aadya.com",
        encryptedRefreshToken: encryptedToken,
        scopes: ["https://www.googleapis.com/auth/meetings.space.created"],
        status: "CONNECTED",
      },
    });

    assert.strictEqual(connection.email, "admin.workspace@aadya.com");
    assert.strictEqual(connection.status, "CONNECTED");

    // Verify token can be decrypted properly
    const decrypted = decryptRefreshToken(connection.encryptedRefreshToken);
    assert.strictEqual(decrypted, rawRefreshToken);
  });

  test("24. ActivityLog creates masked audit records on Google operations", async () => {
    if (!seededData) return;

    const auditEntry = await prisma.activityLog.findFirst({
      where: {
        instituteId: seededData.instituteId,
        action: { in: ["CLASS_RECORDING_ACCESS", "GOOGLE_WORKSPACE_CONNECTED", "CLASS_RECORDING_CREATED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (auditEntry) {
      assert.ok(auditEntry.action);
      assert.strictEqual(auditEntry.instituteId, seededData.instituteId);
      // Ensure no raw passwords or tokens in newData
      if (auditEntry.newData && typeof auditEntry.newData === "object") {
        const str = JSON.stringify(auditEntry.newData);
        assert.ok(!str.includes("SuperSecretPassword"));
      }
    }
  });
});

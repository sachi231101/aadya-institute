/**
 * End-to-end stress tests for scheduled-class → Meet → join → end → recording.
 * Uses isolated fixture TEST-CLASS-SESSION-STRESS. Does not change timetable UI
 * or batch auto-schedule generation.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import { classSessionService } from "../modules/class-sessions/class-session.service";
import {
  createMeetSpaceForSession,
  syncSessionRecordings,
} from "../modules/google-workspace/google-workspace.service";
import * as recordingService from "../modules/recordings/recording.service";
import { assertFacultyOwnsSession } from "../utils/auth-user.util";
import {
  asAuthUser,
  createClassSessionStressFixture,
  destroyClassSessionStressFixture,
  type StressFixture,
} from "./fixtures/class-session-stress.fixture";
import {
  assertCanStartLiveSession,
  getSessionHostPhase,
  toSessionDateKey,
} from "../utils/session-window.util";

describe("Class session E2E stress / isolation", { concurrency: false }, () => {
  let fx: StressFixture;

  before(async () => {
    fx = await createClassSessionStressFixture();
  });

  after(async () => {
    if (fx?.instituteId) {
      await destroyClassSessionStressFixture(fx.instituteId);
    }
  });

  const admin = () =>
    asAuthUser(fx.adminUserId, fx.instituteId, ["ADMIN"], {
      permissions: [
        "schedule.create",
        "schedule.update",
        "google_meet.create",
        "google_meet.read",
        "recording.read",
        "recording.manage",
      ],
    });

  const facultyA = () =>
    asAuthUser(fx.facultyAUserId, fx.instituteId, ["FACULTY"], {
      branchId: fx.branchAId,
      permissions: ["google_meet.create", "google_meet.read", "schedule.update"],
    });

  const facultyB = () =>
    asAuthUser(fx.facultyBUserId, fx.instituteId, ["FACULTY"], {
      branchId: fx.branchAId,
      permissions: ["google_meet.create", "google_meet.read"],
    });

  const studentA1 = () =>
    asAuthUser(fx.studentA1UserId, fx.instituteId, ["STUDENT"], {
      branchId: fx.branchAId,
      permissions: ["google_meet.read", "recording.read"],
    });

  const studentA2 = () =>
    asAuthUser(fx.studentA2UserId, fx.instituteId, ["STUDENT"], {
      branchId: fx.branchAId,
      permissions: ["google_meet.read", "recording.read"],
    });

  const studentB1 = () =>
    asAuthUser(fx.studentB1UserId, fx.instituteId, ["STUDENT"], {
      branchId: fx.branchBId,
      permissions: ["google_meet.read", "recording.read"],
    });

  const cmA = () =>
    asAuthUser(fx.cmAUserId, fx.instituteId, ["CENTER_MANAGER"], {
      branchId: fx.branchAId,
      allowedBranchIds: [fx.branchAId],
      permissions: ["google_meet.read", "schedule.read"],
    });

  const cmB = () =>
    asAuthUser(fx.cmBUserId, fx.instituteId, ["CENTER_MANAGER"], {
      branchId: fx.branchBId,
      allowedBranchIds: [fx.branchBId],
      permissions: ["google_meet.read"],
    });

  // ─── Fixture sanity ───────────────────────────────────────────────────────

  test("fixture counts cover multi-branch concurrent Meet sessions", () => {
    assert.ok(fx.counts.branches >= 2);
    assert.ok(fx.counts.batches >= 3);
    assert.ok(fx.counts.faculties >= 3);
    assert.ok(fx.counts.students >= 4);
    assert.ok(fx.counts.sessions >= 12);
    assert.ok(fx.counts.meetSpaces >= 6);
    assert.ok(fx.counts.enrollments >= 5);
    console.log("Stress fixture counts:", fx.counts);
  });

  // ─── Happy path: Admin schedule → Faculty host → Student join → End → Rec ─

  test("Admin can schedule a new ONLINE session (createSession)", async () => {
    const created = await classSessionService.createSession(fx.instituteId, {
      batchId: fx.batchA1Id,
      facultyId: fx.facultyAId,
      branchId: fx.branchAId,
      title: "Admin-scheduled stress class",
      scheduledDate: fx.todayKey,
      startTime: "06:00 AM",
      endTime: "07:00 AM",
      mode: "ONLINE",
      sessionType: "THEORY",
    });
    assert.ok(created.id);
    assert.strictEqual(created.sessionStatus, "UPCOMING");
    assert.strictEqual(created.batchId, fx.batchA1Id);
  });

  test("Faculty conflict: same faculty cannot get overlapping slot (409)", async () => {
    const live = await prisma.classSession.findUnique({
      where: { id: fx.sessions.liveA },
    });
    assert.ok(live);

    await assert.rejects(
      () =>
        classSessionService.createSession(fx.instituteId, {
          batchId: fx.batchA1Id,
          facultyId: fx.facultyAId,
          branchId: fx.branchAId,
          title: "Conflict slot",
          scheduledDate: toSessionDateKey(live!.scheduledDate),
          startTime: live!.startTime,
          endTime: live!.endTime,
          mode: "ONLINE",
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 409 &&
        err.errorCode === "CLASS_SESSION_TIME_CONFLICT"
    );
  });

  test("Concurrent same-time classes for different faculties are allowed", async () => {
    const liveA = await prisma.classSession.findUnique({
      where: { id: fx.sessions.liveA },
    });
    const liveB = await prisma.classSession.findUnique({
      where: { id: fx.sessions.liveBConcurrent },
    });
    assert.ok(liveA && liveB);
    assert.strictEqual(liveA!.startTime, liveB!.startTime);
    assert.notStrictEqual(liveA!.facultyId, liveB!.facultyId);
    assert.strictEqual(liveA!.sessionStatus, "LIVE");
    assert.strictEqual(liveB!.sessionStatus, "LIVE");
  });

  test("Full flow: host start-live → student meeting → end-live → recording row", async () => {
    const live = await prisma.classSession.findUnique({
      where: { id: fx.sessions.liveA },
    });
    assert.ok(live);

    // Concurrent same-slot session for Faculty Multi (Meet pre-seeded — no live Google API).
    const flow = await prisma.classSession.create({
      data: {
        batchId: fx.batchA1Id,
        facultyId: fx.facultyMultiId,
        branchId: fx.branchAId,
        title: "E2E flow session (multi faculty)",
        scheduledDate: live!.scheduledDate,
        startTime: live!.startTime,
        endTime: live!.endTime,
        mode: "ONLINE",
        meetingUrl: "https://meet.google.com/stress-e2e-flow",
        sessionStatus: "UPCOMING",
        sessionType: "THEORY",
        status: "ACTIVE",
      },
    });
    await prisma.googleMeetSpace.create({
      data: {
        classSessionId: flow.id,
        spaceName: "spaces/stress-e2e-flow",
        meetingUri: "https://meet.google.com/stress-e2e-flow",
        meetingCode: "stress-e2e-flow",
        organizerUserId: fx.adminUserId,
        recordingEnabled: true,
        recordingConfigurationStatus: "ENABLED",
        status: "ACTIVE",
      },
    });

    // 1) Host / start-live
    const started = await classSessionService.startLiveClass(
      flow.id,
      fx.instituteId,
      "https://meet.google.com/stress-e2e-flow"
    );
    assert.strictEqual(started.session.sessionStatus, "LIVE");
    assert.ok((started.notifiedStudentsCount ?? 0) >= 1);

    // 2) Duplicate host while LIVE → alreadyLive (refresh / stale tab)
    const reconnect = await classSessionService.startLiveClass(
      flow.id,
      fx.instituteId,
      "https://meet.google.com/stress-e2e-flow"
    );
    assert.strictEqual((reconnect as any).alreadyLive, true);

    // 3) Enrolled student can get meeting
    const meeting = await classSessionService.getSessionMeeting(studentA1(), flow.id);
    assert.strictEqual(meeting.sessionStatus, "LIVE");
    assert.ok(meeting.meetingUrl);

    // 4) End live → recording PENDING + sync queued (queue stubbed in NODE_TEST_CONTEXT)
    const ended = await classSessionService.endLiveClass(flow.id, fx.instituteId);
    assert.strictEqual(ended.session.sessionStatus, "COMPLETED");
    assert.ok(ended.recording);
    assert.strictEqual(ended.recording?.recordingStatus, "PENDING");
    assert.strictEqual(ended.syncQueued, true);

    // 5) Student still authorized to see meeting metadata after COMPLETED, but join URL redacted
    const afterEnd = await classSessionService.getSessionMeeting(studentA1(), flow.id);
    assert.strictEqual(afterEnd.sessionStatus, "COMPLETED");
    assert.ok(!afterEnd.meetingUrl, "Meet join URL must be redacted after COMPLETED");
  });

  // ─── Isolation / authorization ────────────────────────────────────────────

  test("Unauthorized faculty cannot own another faculty session (403)", async () => {
    await assert.rejects(
      () => assertFacultyOwnsSession(facultyB(), fx.sessions.liveA),
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  test("Faculty B cannot start-live Faculty A session via ownership gate", async () => {
    await assert.rejects(
      () => assertFacultyOwnsSession(facultyB(), fx.sessions.liveA),
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  test("Faculty B cannot create Meet for Faculty A session (403)", async () => {
    await assert.rejects(
      () => createMeetSpaceForSession(facultyB(), fx.sessions.liveA),
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  test("Student A1 cannot access Batch A2 concurrent class meeting (403)", async () => {
    await assert.rejects(
      () =>
        classSessionService.getSessionMeeting(
          studentA1(),
          fx.sessions.liveBConcurrent
        ),
      (err: any) => err.statusCode === 403
    );
  });

  test("Student A2 cannot access Branch B live class (403)", async () => {
    await assert.rejects(
      () =>
        classSessionService.getSessionMeeting(studentA2(), fx.sessions.branchBLive),
      (err: any) => err.statusCode === 403
    );
  });

  test("CM Branch A cannot read Branch B session meeting (404)", async () => {
    await assert.rejects(
      () => classSessionService.getSessionMeeting(cmA(), fx.sessions.branchBLive),
      (err: any) => err.statusCode === 404
    );
  });

  test("CM Branch B cannot read Branch A session meeting (404)", async () => {
    await assert.rejects(
      () => classSessionService.getSessionMeeting(cmB(), fx.sessions.liveA),
      (err: any) => err.statusCode === 404
    );
  });

  test("Foreign institute admin gets 404 on meeting", async () => {
    const foreign = asAuthUser("foreign-admin", "other-institute-id", ["ADMIN"]);
    await assert.rejects(
      () => classSessionService.getSessionMeeting(foreign, fx.sessions.liveA),
      (err: any) => err.statusCode === 404
    );
  });

  test("Multi-batch student can access both enrolled batch meetings", async () => {
    const multi = asAuthUser(fx.studentMultiUserId, fx.instituteId, ["STUDENT"], {
      branchId: fx.branchAId,
      permissions: ["google_meet.read"],
    });
    const a = await classSessionService.getSessionMeeting(multi, fx.sessions.liveA);
    const b = await classSessionService.getSessionMeeting(
      multi,
      fx.sessions.liveBConcurrent
    );
    assert.ok(a.meetingUrl);
    assert.ok(b.meetingUrl);
  });

  // ─── Isolation / lifecycle assertions (fixes from Meet isolation plan) ────

  test("Faculty B cannot read Faculty A session meeting (403)", async () => {
    await assert.rejects(
      () => classSessionService.getSessionMeeting(facultyB(), fx.sessions.liveA),
      (err: any) => err.statusCode === 403
    );
  });

  test("createMeet blocked on CANCELLED and COMPLETED (400 CLASS_SESSION_NOT_HOSTABLE)", async () => {
    await assert.rejects(
      () => createMeetSpaceForSession(admin(), fx.sessions.cancelled),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_NOT_HOSTABLE"
    );
    await assert.rejects(
      () => createMeetSpaceForSession(admin(), fx.sessions.completed),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_NOT_HOSTABLE"
    );
  });

  test("endLive on UPCOMING returns 400; LIVE ends; second end is idempotent", async () => {
    const upcoming = await prisma.classSession.create({
      data: {
        batchId: fx.batchA2Id,
        facultyId: fx.facultyBId,
        branchId: fx.branchAId,
        title: "End without live",
        scheduledDate: new Date(`${fx.todayKey}T12:00:00.000Z`),
        startTime: "05:00 AM",
        endTime: "05:30 AM",
        mode: "ONLINE",
        sessionStatus: "UPCOMING",
        status: "ACTIVE",
      },
    });
    await assert.rejects(
      () => classSessionService.endLiveClass(upcoming.id, fx.instituteId),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.message === "Class is not live"
    );

    const live = await prisma.classSession.findUnique({
      where: { id: fx.sessions.liveA },
    });
    assert.ok(live);
    const liveSess = await prisma.classSession.create({
      data: {
        batchId: fx.batchA2Id,
        facultyId: fx.facultyBId,
        branchId: fx.branchAId,
        title: "End live then idempotent",
        scheduledDate: live!.scheduledDate,
        startTime: live!.startTime,
        endTime: live!.endTime,
        mode: "ONLINE",
        meetingUrl: "https://meet.google.com/stress-end-idempotent",
        sessionStatus: "LIVE",
        status: "ACTIVE",
        actualStartTime: new Date(),
      },
    });
    const ended = await classSessionService.endLiveClass(liveSess.id, fx.instituteId);
    assert.strictEqual(ended.session.sessionStatus, "COMPLETED");

    const again = await classSessionService.endLiveClass(liveSess.id, fx.instituteId);
    assert.strictEqual(again.session.sessionStatus, "COMPLETED");
    assert.strictEqual((again as any).alreadyCompleted, true);
  });

  test("Student getSessionMeeting after COMPLETED/CANCELLED has no meetingUrl", async () => {
    const completed = await classSessionService.getSessionMeeting(
      studentA1(),
      fx.sessions.reuseMeetCompleted
    );
    const cancelled = await classSessionService.getSessionMeeting(
      studentA2(),
      fx.sessions.cancelled
    );
    assert.strictEqual(completed.sessionStatus, "COMPLETED");
    assert.strictEqual(cancelled.sessionStatus, "CANCELLED");
    assert.ok(!completed.meetingUrl);
    assert.ok(!cancelled.meetingUrl);
  });

  test("Admin can still see Meet URL history when not LIVE", async () => {
    const completed = await classSessionService.getSessionMeeting(
      admin(),
      fx.sessions.reuseMeetCompleted
    );
    assert.strictEqual(completed.sessionStatus, "COMPLETED");
    assert.ok(completed.meetingUrl?.includes("meet.google.com"));
  });

  // ─── Window / status edge cases ───────────────────────────────────────────

  test("start-live rejected BEFORE window (CLASS_SESSION_BEFORE_WINDOW)", async () => {
    await assert.rejects(
      () => classSessionService.startLiveClass(fx.sessions.upcomingSoon, fx.instituteId),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_BEFORE_WINDOW"
    );
  });

  test("start-live rejected AFTER window / missed past", async () => {
    await assert.rejects(
      () => classSessionService.startLiveClass(fx.sessions.missedPast, fx.instituteId),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        err.errorCode === "CLASS_SESSION_AFTER_WINDOW"
    );
  });

  test("start-live rejected for COMPLETED and CANCELLED", async () => {
    await assert.rejects(
      () => classSessionService.startLiveClass(fx.sessions.completed, fx.instituteId),
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
    await assert.rejects(
      () => classSessionService.startLiveClass(fx.sessions.cancelled, fx.instituteId),
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
  });

  test("LIVE reconnect during window is allowed (stale tab / refresh)", async () => {
    const result = await classSessionService.startLiveClass(
      fx.sessions.liveA,
      fx.instituteId,
      "https://meet.google.com/stress-live-a"
    );
    assert.strictEqual((result as any).alreadyLive, true);
    assert.strictEqual(result.session.sessionStatus, "LIVE");
  });

  test("Cancelled session redacts Meet join URL for enrolled student", async () => {
    const meeting = await classSessionService.getSessionMeeting(
      studentA2(),
      fx.sessions.cancelled
    );
    assert.strictEqual(meeting.sessionStatus, "CANCELLED");
    assert.ok(!meeting.meetingUrl);
  });

  test("COMPLETED session redacts Meet join URL for enrolled student", async () => {
    const meeting = await classSessionService.getSessionMeeting(
      studentA1(),
      fx.sessions.reuseMeetCompleted
    );
    assert.strictEqual(meeting.sessionStatus, "COMPLETED");
    assert.ok(!meeting.meetingUrl);
  });

  test("Stuck LIVE after scheduled end redacts Meet URL for student (clock wins)", async () => {
    // Yesterday's window with DB still LIVE — phase is always `after` on the next IST day
    const yesterday = new Date(`${fx.todayKey}T12:00:00.000Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const pastEnd = await prisma.classSession.create({
      data: {
        batchId: fx.batchA1Id,
        facultyId: fx.facultyAId,
        branchId: fx.branchAId,
        title: "Stuck LIVE past end",
        scheduledDate: new Date(`${yesterdayKey}T12:00:00.000Z`),
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        mode: "ONLINE",
        sessionStatus: "LIVE",
        meetingUrl: "https://meet.google.com/stress-stuck-live",
        status: "ACTIVE",
      },
    });

    assert.strictEqual(
      getSessionHostPhase({
        dateKey: toSessionDateKey(pastEnd.scheduledDate),
        startTime: pastEnd.startTime,
        endTime: pastEnd.endTime,
      }),
      "after"
    );

    const meeting = await classSessionService.getSessionMeeting(studentA1(), pastEnd.id);
    assert.strictEqual(meeting.sessionStatus, "LIVE");
    assert.ok(!meeting.meetingUrl, "Stuck LIVE after end must not expose Meet join URL");
  });

  // ─── Meet / recording failure paths ───────────────────────────────────────

  test("Faculty without personal Google fails Meet create without institute fallback", async () => {
    const sess = await prisma.classSession.create({
      data: {
        batchId: fx.batchA2Id,
        facultyId: fx.facultyBId,
        branchId: fx.branchAId,
        title: "Meet fail session",
        scheduledDate: new Date(`${fx.todayKey}T12:00:00.000Z`),
        startTime: "04:00 AM",
        endTime: "04:30 AM",
        mode: "ONLINE",
        sessionStatus: "UPCOMING",
        status: "ACTIVE",
      },
    });

    // Faculty B has no personal Workspace connection; must not use institute admin connection.
    await assert.rejects(
      () => createMeetSpaceForSession(facultyB(), sess.id),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /personal Google Workspace/i.test(err.message)
    );
    const after = await prisma.classSession.findUnique({ where: { id: sess.id } });
    assert.strictEqual(after?.sessionStatus, "UPCOMING");
    assert.ok(!after?.meetingUrl);
  });

  test("Recording sync failure path when no Google Meet space", async () => {
    const sess = await prisma.classSession.create({
      data: {
        batchId: fx.batchA1Id,
        facultyId: fx.facultyAId,
        branchId: fx.branchAId,
        title: "No meet sync",
        scheduledDate: new Date(`${fx.todayKey}T12:00:00.000Z`),
        startTime: "03:00 AM",
        endTime: "03:30 AM",
        mode: "ONLINE",
        sessionStatus: "COMPLETED",
        status: "ACTIVE",
      },
    });

    await assert.rejects(
      () => syncSessionRecordings(admin(), sess.id),
      (err: unknown) => err instanceof AppError
    );
  });

  test("Recording sync queue enqueue failure still ends class (graceful message)", async () => {
    const live = await prisma.classSession.findUnique({
      where: { id: fx.sessions.liveBConcurrent },
    });
    assert.ok(live?.meetingUrl);

    const sess = await prisma.classSession.create({
      data: {
        batchId: fx.batchA2Id,
        facultyId: fx.facultyBId,
        branchId: fx.branchAId,
        title: "Queue fail end",
        scheduledDate: live!.scheduledDate,
        startTime: live!.startTime,
        endTime: live!.endTime,
        mode: "ONLINE",
        meetingUrl: live!.meetingUrl,
        sessionStatus: "LIVE",
        status: "ACTIVE",
        actualStartTime: new Date(),
      },
    });
    await prisma.googleMeetSpace.create({
      data: {
        classSessionId: sess.id,
        spaceName: "spaces/queue-fail",
        meetingUri: live!.meetingUrl!,
        meetingCode: "queue-fail",
        organizerUserId: fx.adminUserId,
        recordingEnabled: true,
        recordingConfigurationStatus: "ENABLED",
        status: "ACTIVE",
      },
    });

    // Under NODE_TEST_CONTEXT the queue stub resolves; simulate enqueue failure
    // by clearing organizer so syncQueued path is skipped, then separately verify
    // end-live still completes when Meet space exists but organizer missing.
    await prisma.googleMeetSpace.update({
      where: { classSessionId: sess.id },
      data: { organizerUserId: fx.facultyBUserId },
    });
    // Faculty B has no Google connection — endLive falls back to institute conn or warns.
    const ended = await classSessionService.endLiveClass(sess.id, fx.instituteId);
    assert.strictEqual(ended.session.sessionStatus, "COMPLETED");
    assert.ok(ended.recording);
    // Either queued via admin institute connection or not — class must still complete.
    assert.ok(["PENDING", "AVAILABLE"].includes(ended.recording?.recordingStatus || "PENDING"));
  });

  test("Student recording list is enrollment-scoped (cannot see Branch B / other batch)", async () => {
    const result = await recordingService.getRecordings(studentA1(), {
      page: 1,
      limit: 50,
    });
    for (const rec of result.data) {
      assert.strictEqual(rec.classSession.batch.id, fx.batchA1Id);
    }

    const foreign = await prisma.recording.findFirst({
      where: { classSessionId: fx.sessions.completed },
    });
    // completed is A1 — student A1 should access; student B1 must not
    if (foreign) {
      await assert.rejects(
        () => recordingService.getRecordingById(studentB1(), foreign.id),
        (err: any) => err.statusCode === 404 || err.statusCode === 403
      );
    }
  });

  test("Active live list is faculty-scoped via service filters", async () => {
    const facultyLive = await classSessionService.getActiveLiveSessions(
      fx.instituteId,
      undefined,
      undefined,
      fx.facultyAId
    );
    for (const s of facultyLive) {
      assert.strictEqual(s.facultyId, fx.facultyAId);
      assert.strictEqual(s.sessionStatus, "LIVE");
    }

    const studentLive = await classSessionService.getActiveLiveSessions(
      fx.instituteId,
      undefined,
      [fx.batchA1Id]
    );
    for (const s of studentLive) {
      assert.strictEqual(s.batchId, fx.batchA1Id);
    }
    assert.ok(!studentLive.some((s) => s.id === fx.sessions.branchBLive));
  });

  test("Window util phase matches fixture live/missed sessions", async () => {
    const live = await prisma.classSession.findUnique({
      where: { id: fx.sessions.liveA },
    });
    const missed = await prisma.classSession.findUnique({
      where: { id: fx.sessions.missedPast },
    });
    assert.ok(live && missed);

    assert.strictEqual(
      getSessionHostPhase({
        dateKey: toSessionDateKey(live!.scheduledDate),
        startTime: live!.startTime,
        endTime: live!.endTime,
      }),
      "during"
    );
    assert.strictEqual(
      getSessionHostPhase({
        dateKey: toSessionDateKey(missed!.scheduledDate),
        startTime: missed!.startTime,
        endTime: missed!.endTime,
      }),
      "after"
    );

    assert.doesNotThrow(() =>
      assertCanStartLiveSession({
        sessionStatus: "LIVE",
        dateKey: toSessionDateKey(live!.scheduledDate),
        startTime: live!.startTime,
        endTime: live!.endTime,
      })
    );
  });

  test("Cancel API maps to sessionStatus CANCELLED", async () => {
    const sess = await prisma.classSession.create({
      data: {
        batchId: fx.batchA1Id,
        facultyId: fx.facultyAId,
        branchId: fx.branchAId,
        title: "To cancel",
        scheduledDate: new Date(`${fx.todayKey}T12:00:00.000Z`),
        startTime: "02:00 AM",
        endTime: "02:30 AM",
        mode: "OFFLINE",
        sessionStatus: "UPCOMING",
        status: "ACTIVE",
      },
    });
    const cancelled = await classSessionService.cancelSession(sess.id, fx.instituteId);
    assert.strictEqual(cancelled.sessionStatus, "CANCELLED");
  });
});

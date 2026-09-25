/**
 * Stress-test fixture for scheduled-class → Meet → join → end → recording flow.
 * Creates an isolated institute (TEST-CLASS-SESSION-STRESS) with multi-branch data.
 * Does NOT touch timetable layout or batch auto-schedule generation.
 */
import bcrypt from "bcrypt";
import { prisma } from "../../config/database";
import { encryptRefreshToken } from "../../integrations/google/google.auth.client";
import {
  getSessionInstant,
  istTodayKey,
  parseSessionTimeToMinutes,
} from "../../utils/session-window.util";
import type { AuthUser } from "../../modules/auth/auth.types";

export const STRESS_FIXTURE_CODE = "TEST-CLASS-SESSION-STRESS";
const PASSWORD_HASH = bcrypt.hashSync("ChangeMe@123", 4);

export type StressSessionKey =
  | "liveA"
  | "liveBConcurrent"
  | "liveMultiFaculty"
  | "upcomingSoon"
  | "upcomingLater"
  | "completed"
  | "cancelled"
  | "missedPast"
  | "staggeredA"
  | "staggeredB"
  | "hybridOnline"
  | "branchBLive"
  | "reuseMeetCompleted";

export interface StressFixture {
  instituteId: string;
  branchAId: string;
  branchBId: string;
  courseAId: string;
  courseBId: string;
  batchA1Id: string;
  batchA2Id: string;
  batchB1Id: string;
  facultyAId: string;
  facultyBId: string;
  facultyMultiId: string;
  facultyAUserId: string;
  facultyBUserId: string;
  facultyMultiUserId: string;
  studentA1UserId: string;
  studentA2UserId: string;
  studentMultiUserId: string;
  studentB1UserId: string;
  studentA1Id: string;
  studentA2Id: string;
  studentMultiId: string;
  studentB1Id: string;
  adminUserId: string;
  cmAUserId: string;
  cmBUserId: string;
  sessions: Record<StressSessionKey, string>;
  todayKey: string;
  counts: {
    branches: number;
    courses: number;
    batches: number;
    faculties: number;
    students: number;
    sessions: number;
    enrollments: number;
    meetSpaces: number;
    recordings: number;
  };
}

const minutesToTimeLabel = (totalMinutes: number): string => {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
};

/** Current Asia/Kolkata wall-clock minutes from midnight. */
export const istNowMinutes = (now: Date = new Date()): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
};

export const asAuthUser = (
  id: string,
  instituteId: string,
  roles: string[],
  opts: {
    branchId?: string | null;
    allowedBranchIds?: string[];
    permissions?: string[];
    name?: string;
  } = {}
): AuthUser => ({
  id,
  userId: id,
  name: opts.name ?? roles[0] ?? "User",
  email: `${id}@stress.test`,
  instituteId,
  branchId: opts.branchId ?? undefined,
  allowedBranchIds: opts.allowedBranchIds ?? (opts.branchId ? [opts.branchId] : []),
  roles,
  permissions: opts.permissions ?? [],
});

async function wipeStressInstitute(instituteId: string) {
  const batches = await prisma.batch.findMany({
    where: { instituteId },
    select: { id: true },
  });
  const batchIds = batches.map((b) => b.id);
  const sessions = batchIds.length
    ? await prisma.classSession.findMany({
        where: { batchId: { in: batchIds } },
        select: { id: true },
      })
    : [];
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length) {
    await prisma.recording.deleteMany({ where: { classSessionId: { in: sessionIds } } });
    await prisma.googleMeetSpace.deleteMany({ where: { classSessionId: { in: sessionIds } } });
    await prisma.studentAttendance.deleteMany({ where: { classSessionId: { in: sessionIds } } });
    await prisma.classSession.deleteMany({ where: { id: { in: sessionIds } } });
  }
  if (batchIds.length) {
    await prisma.batchEnrollment.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchSchedule.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchModule.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batchCourse.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  }

  await prisma.googleWorkspaceConnection.deleteMany({ where: { instituteId } });
  await prisma.notification.deleteMany({ where: { instituteId } });
  await prisma.activityLog.deleteMany({ where: { instituteId } });
  await prisma.faculty.deleteMany({ where: { instituteId } });
  await prisma.student.deleteMany({ where: { instituteId } });
  await prisma.courseBranch.deleteMany({
    where: { course: { instituteId } },
  });
  await prisma.course.deleteMany({ where: { instituteId } });
  await prisma.userRole.deleteMany({ where: { user: { instituteId } } });
  await prisma.user.deleteMany({ where: { instituteId } });
  await prisma.branch.deleteMany({ where: { instituteId } });
  await prisma.institute.deleteMany({ where: { id: instituteId } });
}

export async function destroyClassSessionStressFixture(instituteId?: string) {
  const id =
    instituteId ??
    (await prisma.institute.findFirst({ where: { code: STRESS_FIXTURE_CODE } }))?.id;
  if (!id) return;
  await wipeStressInstitute(id);
}

async function ensureRole(name: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description: `${name} role` },
  });
}

async function createUserWithRole(params: {
  instituteId: string;
  branchId?: string | null;
  name: string;
  email: string;
  roleName: string;
}) {
  const role = await ensureRole(params.roleName);
  const user = await prisma.user.create({
    data: {
      instituteId: params.instituteId,
      branchId: params.branchId ?? undefined,
      name: params.name,
      email: params.email,
      passwordHash: PASSWORD_HASH,
      status: "ACTIVE",
    },
  });
  await prisma.userRole.create({
    data: { userId: user.id, roleId: role.id },
  });
  return user;
}

/**
 * Build (or rebuild) the stress fixture. Safe to call repeatedly.
 */
export async function createClassSessionStressFixture(
  now: Date = new Date()
): Promise<StressFixture> {
  const existing = await prisma.institute.findFirst({
    where: { code: STRESS_FIXTURE_CODE },
  });
  if (existing) {
    await wipeStressInstitute(existing.id);
  }

  const todayKey = istTodayKey(now);
  const nowMin = istNowMinutes(now);
  // Live window: started 20m ago, ends in 40m (half-open).
  const liveStart = minutesToTimeLabel(nowMin - 20);
  const liveEnd = minutesToTimeLabel(nowMin + 40);
  // Upcoming soon: starts in 45m
  const soonStart = minutesToTimeLabel(nowMin + 45);
  const soonEnd = minutesToTimeLabel(nowMin + 105);
  // Later today / staggered
  const laterStart = minutesToTimeLabel(Math.min(nowMin + 180, 22 * 60));
  const laterEnd = minutesToTimeLabel(Math.min(nowMin + 240, 23 * 60));
  // Staggered pair (non-overlapping with live)
  const stagAStart = minutesToTimeLabel(Math.max(8 * 60, nowMin - 180));
  const stagAEnd = minutesToTimeLabel(Math.max(8 * 60, nowMin - 180) + 60);
  const stagBStart = minutesToTimeLabel(Math.max(8 * 60, nowMin - 180) + 70);
  const stagBEnd = minutesToTimeLabel(Math.max(8 * 60, nowMin - 180) + 130);
  // Past missed (yesterday calendar in IST via todayKey - 1 day using UTC noon trick)
  const yesterday = new Date(`${todayKey}T12:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const tag = Date.now().toString(36);

  const institute = await prisma.institute.create({
    data: {
      name: "Class Session Stress Fixture",
      code: STRESS_FIXTURE_CODE,
    },
  });

  const [branchA, branchB] = await Promise.all([
    prisma.branch.create({
      data: {
        instituteId: institute.id,
        name: "Stress Branch A (Koramangala)",
        code: `SSA-${tag}`,
        status: "ACTIVE",
      },
    }),
    prisma.branch.create({
      data: {
        instituteId: institute.id,
        name: "Stress Branch B (Indiranagar)",
        code: `SSB-${tag}`,
        status: "ACTIVE",
      },
    }),
  ]);

  const admin = await createUserWithRole({
    instituteId: institute.id,
    name: "Stress Admin",
    email: `admin.${tag}@stress.test`,
    roleName: "ADMIN",
  });
  const cmA = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchA.id,
    name: "Stress CM A",
    email: `cm.a.${tag}@stress.test`,
    roleName: "CENTER_MANAGER",
  });
  const cmB = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchB.id,
    name: "Stress CM B",
    email: `cm.b.${tag}@stress.test`,
    roleName: "CENTER_MANAGER",
  });

  const facAUser = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchA.id,
    name: "Faculty A (Batch A1)",
    email: `faculty.a.${tag}@stress.test`,
    roleName: "FACULTY",
  });
  const facBUser = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchA.id,
    name: "Faculty B (Batch A2)",
    email: `faculty.b.${tag}@stress.test`,
    roleName: "FACULTY",
  });
  const facMultiUser = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchA.id,
    name: "Faculty Multi (A1+A2+B1)",
    email: `faculty.multi.${tag}@stress.test`,
    roleName: "FACULTY",
  });

  const [facultyA, facultyB, facultyMulti] = await Promise.all([
    prisma.faculty.create({
      data: {
        userId: facAUser.id,
        instituteId: institute.id,
        branchId: branchA.id,
        employeeCode: `FA-${tag}`,
        specialization: "Full Stack",
        status: "ACTIVE",
      },
    }),
    prisma.faculty.create({
      data: {
        userId: facBUser.id,
        instituteId: institute.id,
        branchId: branchA.id,
        employeeCode: `FB-${tag}`,
        specialization: "Data Science",
        status: "ACTIVE",
      },
    }),
    prisma.faculty.create({
      data: {
        userId: facMultiUser.id,
        instituteId: institute.id,
        branchId: branchA.id,
        employeeCode: `FM-${tag}`,
        specialization: "Cross-batch",
        status: "ACTIVE",
      },
    }),
  ]);

  const stuA1User = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchA.id,
    name: "Student A1",
    email: `student.a1.${tag}@stress.test`,
    roleName: "STUDENT",
  });
  const stuA2User = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchA.id,
    name: "Student A2",
    email: `student.a2.${tag}@stress.test`,
    roleName: "STUDENT",
  });
  const stuMultiUser = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchA.id,
    name: "Student Multi-Batch",
    email: `student.multi.${tag}@stress.test`,
    roleName: "STUDENT",
  });
  const stuB1User = await createUserWithRole({
    instituteId: institute.id,
    branchId: branchB.id,
    name: "Student B1",
    email: `student.b1.${tag}@stress.test`,
    roleName: "STUDENT",
  });

  const [studentA1, studentA2, studentMulti, studentB1] = await Promise.all([
    prisma.student.create({
      data: {
        userId: stuA1User.id,
        instituteId: institute.id,
        branchId: branchA.id,
        studentCode: `SA1-${tag}`,
        status: "ACTIVE",
      },
    }),
    prisma.student.create({
      data: {
        userId: stuA2User.id,
        instituteId: institute.id,
        branchId: branchA.id,
        studentCode: `SA2-${tag}`,
        status: "ACTIVE",
      },
    }),
    prisma.student.create({
      data: {
        userId: stuMultiUser.id,
        instituteId: institute.id,
        branchId: branchA.id,
        studentCode: `SM-${tag}`,
        status: "ACTIVE",
      },
    }),
    prisma.student.create({
      data: {
        userId: stuB1User.id,
        instituteId: institute.id,
        branchId: branchB.id,
        studentCode: `SB1-${tag}`,
        status: "ACTIVE",
      },
    }),
  ]);

  const [courseA, courseB] = await Promise.all([
    prisma.course.create({
      data: {
        instituteId: institute.id,
        name: "Stress Full Stack",
        code: `CFS-${tag}`,
        fee: 25000,
        mode: "HYBRID",
        status: "ACTIVE",
      },
    }),
    prisma.course.create({
      data: {
        instituteId: institute.id,
        name: "Stress Data Science",
        code: `CDS-${tag}`,
        fee: 28000,
        mode: "ONLINE",
        status: "ACTIVE",
      },
    }),
  ]);

  await prisma.courseBranch.createMany({
    data: [
      { courseId: courseA.id, branchId: branchA.id },
      { courseId: courseA.id, branchId: branchB.id },
      { courseId: courseB.id, branchId: branchA.id },
    ],
  });

  const startDate = new Date(`${todayKey}T00:00:00.000Z`);

  const [batchA1, batchA2, batchB1] = await Promise.all([
    prisma.batch.create({
      data: {
        instituteId: institute.id,
        branchId: branchA.id,
        courseId: courseA.id,
        facultyId: facultyA.id,
        name: "Stress Batch A1 MWF",
        code: `BA1-${tag}`,
        startDate,
        schedulePattern: "MWF",
        timeSlot: `${liveStart} - ${liveEnd}`,
        capacity: 30,
        status: "ACTIVE",
      },
    }),
    prisma.batch.create({
      data: {
        instituteId: institute.id,
        branchId: branchA.id,
        courseId: courseB.id,
        facultyId: facultyB.id,
        name: "Stress Batch A2 TTS",
        code: `BA2-${tag}`,
        startDate,
        schedulePattern: "TTS",
        timeSlot: `${liveStart} - ${liveEnd}`,
        capacity: 25,
        status: "ACTIVE",
      },
    }),
    prisma.batch.create({
      data: {
        instituteId: institute.id,
        branchId: branchB.id,
        courseId: courseA.id,
        facultyId: facultyMulti.id,
        name: "Stress Batch B1 Weekend",
        code: `BB1-${tag}`,
        startDate,
        schedulePattern: "WEEKEND",
        timeSlot: `${liveStart} - ${liveEnd}`,
        capacity: 20,
        status: "ACTIVE",
      },
    }),
  ]);

  // One BatchCourse per batch (@@unique([batchId, courseId])).
  // Multi-faculty coverage comes from schedules + class sessions.
  await prisma.batchCourse.createMany({
    data: [
      {
        batchId: batchA1.id,
        courseId: courseA.id,
        facultyId: facultyA.id,
        sequence: 1,
        status: "ACTIVE",
      },
      {
        batchId: batchA2.id,
        courseId: courseB.id,
        facultyId: facultyB.id,
        sequence: 1,
        status: "ACTIVE",
      },
      {
        batchId: batchB1.id,
        courseId: courseA.id,
        facultyId: facultyMulti.id,
        sequence: 1,
        status: "ACTIVE",
      },
    ],
  });

  // Distinct schedules (not auto-generated timetable grids). Faculty Multi
  // also appears on A1/A2 schedules to model multi-batch teaching.
  await prisma.batchSchedule.createMany({
    data: [
      {
        batchId: batchA1.id,
        facultyId: facultyA.id,
        dayOfWeek: 1,
        startTime: liveStart,
        endTime: liveEnd,
        effectiveFrom: startDate,
      },
      {
        batchId: batchA1.id,
        facultyId: facultyMulti.id,
        dayOfWeek: 3,
        startTime: laterStart,
        endTime: laterEnd,
        effectiveFrom: startDate,
      },
      {
        batchId: batchA2.id,
        facultyId: facultyB.id,
        dayOfWeek: 2,
        startTime: liveStart,
        endTime: liveEnd,
        effectiveFrom: startDate,
      },
      {
        batchId: batchA2.id,
        facultyId: facultyMulti.id,
        dayOfWeek: 4,
        startTime: soonStart,
        endTime: soonEnd,
        effectiveFrom: startDate,
      },
      {
        batchId: batchB1.id,
        facultyId: facultyMulti.id,
        dayOfWeek: 6,
        startTime: liveStart,
        endTime: liveEnd,
        effectiveFrom: startDate,
      },
    ],
  });
  await prisma.batchEnrollment.createMany({
    data: [
      { batchId: batchA1.id, studentId: studentA1.id, status: "ACTIVE" },
      { batchId: batchA2.id, studentId: studentA2.id, status: "ACTIVE" },
      { batchId: batchA1.id, studentId: studentMulti.id, status: "ACTIVE" },
      { batchId: batchA2.id, studentId: studentMulti.id, status: "ACTIVE" },
      { batchId: batchB1.id, studentId: studentB1.id, status: "ACTIVE" },
    ],
  });

  const scheduledToday = new Date(`${todayKey}T12:00:00.000Z`);
  const scheduledYesterday = new Date(`${yesterdayKey}T12:00:00.000Z`);

  const sessionDefs: Array<{
    key: StressSessionKey;
    batchId: string;
    facultyId: string;
    branchId: string;
    title: string;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    mode: string;
    sessionStatus: "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";
    meetingUrl?: string;
    withMeet?: boolean;
    withRecording?: boolean;
  }> = [
    {
      key: "liveA",
      batchId: batchA1.id,
      facultyId: facultyA.id,
      branchId: branchA.id,
      title: "LIVE Batch A1 — Faculty A",
      scheduledDate: scheduledToday,
      startTime: liveStart,
      endTime: liveEnd,
      mode: "ONLINE",
      sessionStatus: "LIVE",
      meetingUrl: "https://meet.google.com/stress-live-a",
      withMeet: true,
    },
    {
      key: "liveBConcurrent",
      batchId: batchA2.id,
      facultyId: facultyB.id,
      branchId: branchA.id,
      title: "LIVE Concurrent Batch A2 — Faculty B (same clock)",
      scheduledDate: scheduledToday,
      startTime: liveStart,
      endTime: liveEnd,
      mode: "ONLINE",
      sessionStatus: "LIVE",
      meetingUrl: "https://meet.google.com/stress-live-b",
      withMeet: true,
    },
    {
      key: "liveMultiFaculty",
      batchId: batchA1.id,
      facultyId: facultyMulti.id,
      branchId: branchA.id,
      title: "LIVE Multi-faculty on A1 (staggered slot)",
      scheduledDate: scheduledToday,
      startTime: stagBStart,
      endTime: stagBEnd,
      mode: "HYBRID",
      sessionStatus: parseSessionTimeToMinutes(stagBStart)! <= nowMin &&
      parseSessionTimeToMinutes(stagBEnd)! > nowMin
        ? "LIVE"
        : "UPCOMING",
      meetingUrl: "https://meet.google.com/stress-multi",
      withMeet: true,
    },
    {
      key: "upcomingSoon",
      batchId: batchA1.id,
      facultyId: facultyA.id,
      branchId: branchA.id,
      title: "UPCOMING soon — Faculty A",
      scheduledDate: scheduledToday,
      startTime: soonStart,
      endTime: soonEnd,
      mode: "ONLINE",
      sessionStatus: "UPCOMING",
    },
    {
      key: "upcomingLater",
      batchId: batchA2.id,
      facultyId: facultyB.id,
      branchId: branchA.id,
      title: "UPCOMING later — Faculty B",
      scheduledDate: scheduledToday,
      startTime: laterStart,
      endTime: laterEnd,
      mode: "ONLINE",
      sessionStatus: "UPCOMING",
    },
    {
      key: "completed",
      batchId: batchA1.id,
      facultyId: facultyA.id,
      branchId: branchA.id,
      title: "COMPLETED class — Faculty A",
      scheduledDate: scheduledYesterday,
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      mode: "ONLINE",
      sessionStatus: "COMPLETED",
      meetingUrl: "https://meet.google.com/stress-completed",
      withMeet: true,
      withRecording: true,
    },
    {
      key: "cancelled",
      batchId: batchA2.id,
      facultyId: facultyB.id,
      branchId: branchA.id,
      title: "CANCELLED class — Faculty B",
      scheduledDate: scheduledToday,
      startTime: soonStart,
      endTime: soonEnd,
      mode: "ONLINE",
      sessionStatus: "CANCELLED",
      meetingUrl: "https://meet.google.com/stress-cancelled",
      withMeet: true,
    },
    {
      key: "missedPast",
      batchId: batchA1.id,
      facultyId: facultyA.id,
      branchId: branchA.id,
      title: "Past/missed (clock ended, still UPCOMING)",
      scheduledDate: scheduledToday,
      startTime: minutesToTimeLabel(Math.max(0, nowMin - 150)),
      endTime: minutesToTimeLabel(Math.max(30, nowMin - 90)),
      mode: "ONLINE",
      sessionStatus: "UPCOMING",
    },
    {
      key: "staggeredA",
      batchId: batchA1.id,
      facultyId: facultyA.id,
      branchId: branchA.id,
      title: "Staggered A",
      scheduledDate: scheduledToday,
      startTime: stagAStart,
      endTime: stagAEnd,
      mode: "HYBRID",
      sessionStatus: "COMPLETED",
      meetingUrl: "https://meet.google.com/stress-stag-a",
      withMeet: true,
    },
    {
      key: "staggeredB",
      batchId: batchA2.id,
      facultyId: facultyB.id,
      branchId: branchA.id,
      title: "Staggered B",
      scheduledDate: scheduledToday,
      startTime: stagBStart,
      endTime: stagBEnd,
      mode: "ONLINE",
      sessionStatus: "UPCOMING",
    },
    {
      key: "hybridOnline",
      batchId: batchA2.id,
      facultyId: facultyB.id,
      branchId: branchA.id,
      title: "HYBRID Meet-capable (upcoming)",
      scheduledDate: scheduledToday,
      startTime: laterStart,
      endTime: laterEnd,
      mode: "HYBRID",
      sessionStatus: "UPCOMING",
    },
    {
      key: "branchBLive",
      batchId: batchB1.id,
      facultyId: facultyMulti.id,
      branchId: branchB.id,
      title: "Branch B LIVE — isolation target",
      scheduledDate: scheduledToday,
      startTime: liveStart,
      endTime: liveEnd,
      mode: "ONLINE",
      sessionStatus: "LIVE",
      meetingUrl: "https://meet.google.com/stress-branch-b",
      withMeet: true,
    },
    {
      key: "reuseMeetCompleted",
      batchId: batchA1.id,
      facultyId: facultyA.id,
      branchId: branchA.id,
      title: "COMPLETED with reusable Meet link",
      scheduledDate: scheduledYesterday,
      startTime: "11:00 AM",
      endTime: "12:00 PM",
      mode: "ONLINE",
      sessionStatus: "COMPLETED",
      meetingUrl: "https://meet.google.com/stress-reuse-old",
      withMeet: true,
      withRecording: true,
    },
  ];

  const sessions: Record<string, string> = {};

  for (const def of sessionDefs) {
    const created = await prisma.classSession.create({
      data: {
        batchId: def.batchId,
        facultyId: def.facultyId,
        branchId: def.branchId,
        title: def.title,
        scheduledDate: def.scheduledDate,
        startTime: def.startTime,
        endTime: def.endTime,
        mode: def.mode,
        meetingUrl: def.meetingUrl,
        sessionStatus: def.sessionStatus,
        sessionType: "THEORY",
        status: "ACTIVE",
        actualStartTime:
          def.sessionStatus === "LIVE" || def.sessionStatus === "COMPLETED"
            ? getSessionInstant(todayKey, def.startTime) ?? now
            : undefined,
        actualEndTime:
          def.sessionStatus === "COMPLETED"
            ? getSessionInstant(
                def.scheduledDate.toISOString().slice(0, 10),
                def.endTime
              ) ?? now
            : undefined,
      },
    });
    sessions[def.key] = created.id;

    if (def.withMeet && def.meetingUrl) {
      const code = def.meetingUrl.split("/").pop()!;
      await prisma.googleMeetSpace.create({
        data: {
          classSessionId: created.id,
          spaceName: `spaces/${code}`,
          meetingUri: def.meetingUrl,
          meetingCode: code,
          organizerUserId: admin.id,
          recordingEnabled: true,
          recordingConfigurationStatus: "ENABLED",
          status: def.sessionStatus === "COMPLETED" ? "ENDED" : "ACTIVE",
        },
      });
    }

    if (def.withRecording) {
      await prisma.recording.create({
        data: {
          classSessionId: created.id,
          storageKey: `recordings/${created.id}/stress.mp4`,
          googleDriveFileId: `drive-stress-${def.key}-${tag}`,
          playbackUrl: `https://drive.google.com/file/d/drive-stress-${def.key}-${tag}/view`,
          recordingStatus: "AVAILABLE",
          storageProvider: "GOOGLE_DRIVE",
          duration: 55,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
      });
    }
  }

  // Google Workspace connection for Meet create path (encrypted dummy token)
  await prisma.googleWorkspaceConnection.create({
    data: {
      userId: admin.id,
      instituteId: institute.id,
      email: admin.email!,
      encryptedRefreshToken: encryptRefreshToken("1//stress-fixture-refresh-token"),
      scopes: [
        "https://www.googleapis.com/auth/meetings.space.created",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      status: "CONNECTED",
    },
  });
  await prisma.googleWorkspaceConnection.create({
    data: {
      userId: facAUser.id,
      instituteId: institute.id,
      email: facAUser.email!,
      encryptedRefreshToken: encryptRefreshToken("1//stress-faculty-a-refresh"),
      scopes: ["https://www.googleapis.com/auth/meetings.space.created"],
      status: "CONNECTED",
    },
  });

  const meetSpaces = await prisma.googleMeetSpace.count({
    where: { classSession: { batch: { instituteId: institute.id } } },
  });
  const recordings = await prisma.recording.count({
    where: { classSession: { batch: { instituteId: institute.id } } },
  });
  const enrollments = await prisma.batchEnrollment.count({
    where: { batch: { instituteId: institute.id } },
  });

  return {
    instituteId: institute.id,
    branchAId: branchA.id,
    branchBId: branchB.id,
    courseAId: courseA.id,
    courseBId: courseB.id,
    batchA1Id: batchA1.id,
    batchA2Id: batchA2.id,
    batchB1Id: batchB1.id,
    facultyAId: facultyA.id,
    facultyBId: facultyB.id,
    facultyMultiId: facultyMulti.id,
    facultyAUserId: facAUser.id,
    facultyBUserId: facBUser.id,
    facultyMultiUserId: facMultiUser.id,
    studentA1UserId: stuA1User.id,
    studentA2UserId: stuA2User.id,
    studentMultiUserId: stuMultiUser.id,
    studentB1UserId: stuB1User.id,
    studentA1Id: studentA1.id,
    studentA2Id: studentA2.id,
    studentMultiId: studentMulti.id,
    studentB1Id: studentB1.id,
    adminUserId: admin.id,
    cmAUserId: cmA.id,
    cmBUserId: cmB.id,
    sessions: sessions as Record<StressSessionKey, string>,
    todayKey,
    counts: {
      branches: 2,
      courses: 2,
      batches: 3,
      faculties: 3,
      students: 4,
      sessions: sessionDefs.length,
      enrollments,
      meetSpaces,
      recordings,
    },
  };
}
